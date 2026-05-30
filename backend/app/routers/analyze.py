"""Image analysis endpoint: the core AI inference pipeline."""

from __future__ import annotations

import asyncio
import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.config import get_settings
from app.models.schemas import AgentSynthesis, BoundingBox, Finding, ScanResult
from app.services import image_preprocess
from app.services.auth_service import get_current_user_id
from app.services.openrouter_agent import synthesize_report
from app.utils.supabase_client import insert_scan, upload_image

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=ScanResult)
async def analyze_image(
    file: UploadFile = File(...),
    scan_type: str = Form(...),
    session_label: str = Form(default=""),
    notes: str = Form(default=""),
    user_id: str = Depends(get_current_user_id),
):
    """Upload an image and run the routed diagnostic ensemble."""
    settings = get_settings()

    if scan_type not in ("chest", "fracture", "wound"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scan_type must be one of: chest, fracture, wound",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded.")

    scan_id = str(uuid.uuid4())
    logger.info(f"Starting analysis {scan_id} | type={scan_type} | user={user_id}")

    try:
        raw_findings, model_errors, model_names = await _run_routed_ensemble(
            file_bytes=file_bytes,
            scan_type=scan_type,
            confidence_threshold=settings.confidence_threshold,
        )
    except Exception as exc:
        logger.error(f"Model inference failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference failed: {str(exc)}",
        ) from exc

    try:
        agent_result = synthesize_report(
            findings=raw_findings,
            scan_type=scan_type,
            patient_notes=notes if notes else None,
        )
    except Exception as exc:
        logger.error(f"OpenRouter synthesis failed: {exc}")
        agent_result = {
            "urgency": "medium",
            "synthesis_text": "AI synthesis temporarily unavailable. Please review findings manually.",
            "recommended_actions": ["Consult a radiologist for interpretation"],
            "specialist": None,
        }

    image_url = ""
    try:
        image_url = upload_image(user_id, scan_id, file_bytes, file.content_type or "image/png")
    except Exception as exc:
        logger.warning(f"Image upload failed (non-blocking): {exc}")

    findings = [
        Finding(
            name=f["name"],
            confidence=f["confidence"],
            severity=f["severity"],
            model=f["model"],
            region=f.get("region"),
            icd_code=f.get("icd_code"),
            bbox=BoundingBox(**f["bbox"]) if f.get("bbox") else None,
            color=f.get("color", "info"),
        )
        for f in raw_findings
    ]

    synthesis = AgentSynthesis(
        urgency=agent_result["urgency"],
        synthesis_text=agent_result["synthesis_text"],
        recommended_actions=agent_result.get("recommended_actions", []),
        specialist=agent_result.get("specialist"),
    )

    model_results = {
        "scan_type": scan_type,
        "ensemble_mode": "routed",
        "models_run": model_names,
        "model_errors": model_errors,
        "specialist": synthesis.specialist,  # persisted here since scans table has no specialist column
    }

    try:
        scan_record = {
            "id": scan_id,
            "user_id": user_id,
            "scan_type": scan_type,
            "session_label": session_label or None,
            "notes": notes or None,
            "image_url": image_url,
            "urgency": synthesis.urgency,
            "findings": [f.model_dump() for f in findings],
            "agent_synthesis": synthesis.synthesis_text,
            "agent_actions": synthesis.recommended_actions,
            "model_results": model_results,
        }
        insert_scan(scan_record)
    except Exception as exc:
        logger.warning(f"Database insert failed (non-blocking): {exc}")

    result = ScanResult(
        id=scan_id,
        scan_type=scan_type,
        session_label=session_label or None,
        image_url=image_url,
        urgency=synthesis.urgency,
        findings=findings,
        agent_synthesis=synthesis,
        model_results=model_results,
        created_at="just now",
    )

    logger.info(f"Analysis {scan_id} complete | findings={len(findings)} | urgency={synthesis.urgency}")
    return result


async def _run_routed_ensemble(
    *,
    file_bytes: bytes,
    scan_type: str,
    confidence_threshold: float,
) -> tuple[list[dict], list[dict], list[str]]:
    """Run applicable models in parallel.

    Chest and fracture X-rays run DenseNet121 plus fracture YOLO as a cross-check.
    External wound photos route to the wound classifier only.
    """
    tasks: list[tuple[str, asyncio.Task[list[dict]]]] = []

    # Strict routing — each scan type uses only its relevant model(s)
    # chest    → DenseNet121 only  (YOLOv8 on chest produces irrelevant fracture labels)
    # fracture → YOLOv8 only       (DenseNet121 is chest-only; on an extremity X-ray it
    #                               emits nonsensical chest pathologies like "Pneumonia")
    # wound    → ViT only
    # DenseNet121 is multi-label (18 independent sigmoids); on diffuse pathology many
    # correlated labels cluster near their decision boundary. Raise the bar to 60% and
    # cap the count so the report surfaces only meaningful findings, not the full list.
    CHEST_THRESHOLD    = max(confidence_threshold, 0.60)   # raise bar for chest: 60%
    # Fracture detection should favor sensitivity: a high threshold can miss
    # subtle metacarpal/phalangeal fractures. We still filter weak normal-class
    # boxes inside the YOLO service, but allow lower-confidence fracture boxes
    # through for radiologist review.
    FRACTURE_THRESHOLD = min(confidence_threshold, 0.15)
    MAX_CHEST_FINDINGS = 6

    if scan_type == "chest":
        tasks.append(("DenseNet121", asyncio.create_task(
            asyncio.to_thread(_run_chest, file_bytes, CHEST_THRESHOLD))))
    elif scan_type == "fracture":
        tasks.append(("YOLOv8-Fracture", asyncio.create_task(
            asyncio.to_thread(_run_fracture, file_bytes, FRACTURE_THRESHOLD))))
    else:  # wound
        tasks.append(("WoundClassifier", asyncio.create_task(
            asyncio.to_thread(_run_wound, file_bytes, confidence_threshold))))

    raw_findings: list[dict] = []
    model_errors: list[dict] = []
    model_names = [name for name, _ in tasks]
    results = await asyncio.gather(*(task for _, task in tasks), return_exceptions=True)

    for (name, _), result in zip(tasks, results):
        if isinstance(result, Exception):
            logger.warning(f"{name} inference failed during ensemble: {result}")
            model_errors.append({"model": name, "error": str(result)})
            continue
        # Cap the multi-label DenseNet output so a wall of near-threshold
        # chest pathologies doesn't bury the clinically relevant findings.
        if name == "DenseNet121":
            result = sorted(result, key=lambda f: f.get("confidence", 0), reverse=True)[:MAX_CHEST_FINDINGS]
        raw_findings.extend(result)

    if not raw_findings and model_errors:
        error_text = "; ".join(f"{e['model']}: {e['error']}" for e in model_errors)
        raise RuntimeError(error_text)

    raw_findings.sort(key=lambda f: f.get("confidence", 0), reverse=True)
    return raw_findings, model_errors, model_names


def _run_chest(file_bytes: bytes, confidence_threshold: float) -> list[dict]:
    from app.services.chest_model import predict_chest_pathologies

    preprocessed = image_preprocess.preprocess_for_chest(file_bytes)
    return predict_chest_pathologies(preprocessed, confidence_threshold)


def _run_fracture(file_bytes: bytes, confidence_threshold: float) -> list[dict]:
    from app.services.fracture_model import predict_fractures

    findings: list[dict] = []

    yolo_image = image_preprocess.preprocess_for_yolo(file_bytes)
    yolo_findings = predict_fractures(yolo_image, confidence_threshold)
    yolo_positive = [
        finding for finding in yolo_findings
        if finding.get("name") != "No fracture box localized"
    ]
    findings.extend(yolo_positive)

    if get_settings().fracture_classifier_enabled:
        try:
            from app.services.fracture_classifier import predict_fracture_presence

            classifier_image = image_preprocess.preprocess_for_vit(file_bytes)
            classifier_findings = predict_fracture_presence(classifier_image)
            findings.extend(classifier_findings)
        except Exception as exc:
            logger.warning(f"Fracture classifier failed: {exc}")

    if findings:
        findings.sort(key=lambda finding: finding.get("confidence", 0), reverse=True)
        return findings

    return yolo_findings


def _run_wound(file_bytes: bytes, confidence_threshold: float) -> list[dict]:
    from app.services.wound_model import predict_wound

    preprocessed = image_preprocess.preprocess_for_vit(file_bytes)
    return predict_wound(preprocessed, confidence_threshold)

"""Image analysis endpoint: the core AI inference pipeline."""

import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status

from app.config import get_settings
from app.main import limiter
from app.models.schemas import AgentSynthesis, BoundingBox, Finding, ScanResult
from app.services import image_preprocess
from app.services.auth_service import get_current_user_id
from app.services.openrouter_agent import synthesize_report
from app.utils.supabase_client import insert_scan, upload_image

logger = logging.getLogger(__name__)
router = APIRouter(tags=["analyze"])


@router.post("/analyze", response_model=ScanResult)
@limiter.limit("10/minute")
async def analyze_image(
    request: Request,
    file: UploadFile = File(...),
    scan_type: str = Form(...),
    session_label: str = Form(default=""),
    notes: str = Form(default=""),
    user_id: str = Depends(get_current_user_id),
):
    """Upload an image and run the routed diagnostic ensemble."""
    settings = get_settings()

    if scan_type not in ("chest", "fracture", "wound", "auto"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scan_type must be one of: auto, chest, fracture, wound",
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty file uploaded.")

    try:
        image_preprocess.validate_image_file(
            file_bytes,
            filename=file.filename or "",
            content_type=file.content_type or "",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc

    # ── Auto-detect scan type if user selected "auto" ────────────────
    original_scan_type = scan_type
    routing: dict = {
        "requested": original_scan_type,
        "detected": scan_type,
        "ambiguous": False,
        "cross_checked": None,
        "switched": False,
        "note": None,
    }
    cross_type: str | None = None
    if scan_type == "auto":
        from app.services.image_router import classify_image_detailed
        details = classify_image_detailed(file_bytes)
        scan_type = details["scan_type"]
        routing.update(detected=scan_type, ambiguous=details["ambiguous"], saturation=details["saturation"])
        if details["ambiguous"]:
            # Close to the photo/radiograph boundary: get a second opinion from the other family.
            cross_type = "wound" if scan_type in ("chest", "fracture") else "fracture"
        logger.info(f"Auto-router classified image as: {scan_type} (ambiguous={details['ambiguous']})")

    scan_id = str(uuid.uuid4())
    logger.info(f"Starting analysis {scan_id} | type={scan_type} (requested={original_scan_type}) | user={user_id}")
    start_time = time.perf_counter()

    try:
        primary_coro = _run_routed_ensemble(
            file_bytes=file_bytes,
            scan_type=scan_type,
            confidence_threshold=settings.confidence_threshold,
        )
        cross_result = None
        if cross_type:
            primary_result, cross_result = await asyncio.gather(
                primary_coro,
                _run_routed_ensemble(
                    file_bytes=file_bytes,
                    scan_type=cross_type,
                    confidence_threshold=settings.confidence_threshold,
                ),
                return_exceptions=True,
            )
            if isinstance(primary_result, Exception):
                raise primary_result
            if isinstance(cross_result, Exception):
                logger.warning(f"Cross-check ({cross_type}) failed, ignoring: {cross_result}")
                cross_result = None
        else:
            primary_result = await primary_coro
        raw_findings, model_errors, model_names = primary_result
    except Exception as exc:
        logger.error(f"Model inference failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference failed: {str(exc)}",
        ) from exc

    if cross_type and cross_result:
        scan_type, raw_findings, model_names = _reconcile_routing(
            primary_type=scan_type,
            primary_findings=raw_findings,
            primary_models=model_names,
            cross_type=cross_type,
            cross_findings=cross_result[0],
            cross_models=cross_result[2],
            routing=routing,
        )

    if scan_type == "fracture" and not routing["note"] and _signal(raw_findings, "fracture") == 0:
        routing["note"] = (
            "No active fracture was found on this radiograph. An X-ray cannot assess skin or "
            "soft-tissue wounds — if your concern is a wound, upload a photo of it as a Wound scan."
        )
    routing["final"] = scan_type

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

    processing_time_ms = int((time.perf_counter() - start_time) * 1000)

    model_results = {
        "scan_type": scan_type,
        "auto_detected": original_scan_type == "auto",
        "ensemble_mode": "routed",
        "routing": routing,
        "models_run": model_names,
        "model_errors": model_errors,
        "specialist": synthesis.specialist,  # persisted here since scans table has no specialist column
        "processing_time_ms": processing_time_ms,
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
        created_at=datetime.now(timezone.utc).isoformat(),
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
    # Fracture threshold raised from 0.15 → 0.35 to cut false positives on
    # healed bones, implants, and noise.  The YOLO service also filters
    # oversized boxes and cross-checks hardware detections internally.
    FRACTURE_THRESHOLD = max(confidence_threshold, 0.35)
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


def _detect_metallic_hardware(file_bytes: bytes) -> bool:
    """Detect high-density metallic surgical implants (screws/plates) via pixel intensity."""
    try:
        import cv2
        import numpy as np

        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return False
        # Saturated white pixels (>= 240) in bone radiographs indicate surgical metal plates/screws
        high_density_px = int(np.sum(img >= 240))
        ratio = high_density_px / float(img.size)
        return ratio > 0.001 or high_density_px > 1000
    except Exception:
        return False


_SITE_METAL_FRACTION = 0.02  # ≥2% saturated-white pixels around a box → implant at the site
_SITE_BOX_PAD = 0.15
_SWITCH_MIN_SIGNAL = 60.0    # cross-check must be at least this confident to take over
_SWITCH_MAX_PRIMARY = 50.0   # ...and the original route must be weaker than this

_INACTIVE_FRACTURE_WORDS = ("prior", "healed", "possible", "old finding")


def _decode_gray(file_bytes: bytes):
    try:
        import cv2
        import numpy as np

        return cv2.imdecode(np.frombuffer(file_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
    except Exception:
        return None


def _metal_fraction_in_box(gray, bbox: dict) -> float:
    """Fraction of saturated-white pixels in (and just around) a fracture box.

    Surgical rods/plates are near-saturated. Checking at the box, rather than
    anywhere in the image, stops burned-in R/L markers and text from masking a
    real fracture as "surgical implant".
    """
    if gray is None:
        return 0.0
    h, w = gray.shape[:2]
    bx, by, bw, bh = (bbox[k] / 100.0 for k in ("x", "y", "w", "h"))
    x1 = max(0, int((bx - bw * _SITE_BOX_PAD) * w))
    x2 = min(w, int((bx + bw * (1 + _SITE_BOX_PAD)) * w))
    y1 = max(0, int((by - bh * _SITE_BOX_PAD) * h))
    y2 = min(h, int((by + bh * (1 + _SITE_BOX_PAD)) * h))
    roi = gray[y1:y2, x1:x2]
    if roi.size == 0:
        return 0.0
    return float((roi >= 240).mean())


def _is_active_fracture(finding: dict) -> bool:
    name = finding.get("name", "").lower()
    return "fracture" in name and not any(w in name for w in _INACTIVE_FRACTURE_WORDS)


def _run_fracture(file_bytes: bytes, confidence_threshold: float) -> list[dict]:
    """Run fracture detection: YOLO localizes, the classifier and implant check gate.

    YOLO boxes are always kept, since they are the only thing that says *where*
    the fracture is. They are downgraded (not dropped) to a healed/post-surgical
    finding when metal sits at the site, or when the image-level classifier is
    confident there is no fracture and the box is weak. The classifier's
    "Full image" finding is only used when YOLO localized nothing.
    """
    from app.services.fracture_model import predict_fractures

    yolo_image = image_preprocess.preprocess_for_yolo(file_bytes)
    yolo_findings = predict_fractures(yolo_image, confidence_threshold)
    yolo_boxes = [dict(f) for f in yolo_findings if f.get("bbox")]

    classifier_findings: list[dict] = []
    classifier_says_no_fracture = False
    if get_settings().fracture_classifier_enabled:
        try:
            from app.services.fracture_classifier import predict_fracture_presence

            classifier_findings = predict_fracture_presence(image_preprocess.preprocess_for_vit(file_bytes))
            classifier_says_no_fracture = any(
                cf.get("severity") == "clear" and cf.get("confidence", 0) >= 70
                for cf in classifier_findings
            )
        except Exception as exc:
            logger.warning(f"Fracture classifier failed: {exc}")

    gray = _decode_gray(file_bytes)
    findings: list[dict] = []

    for box in yolo_boxes:
        if _is_active_fracture(box):
            if _metal_fraction_in_box(gray, box["bbox"]) >= _SITE_METAL_FRACTION:
                logger.info(f"Implant at fracture site ({box['confidence']}%) → prior fracture site")
                box.update(
                    name="Prior Fracture Site — Surgical Implants Present",
                    severity="low", color="info", icd_code="Z96.6",
                )
            elif classifier_says_no_fracture and box["confidence"] < 75:
                logger.info(f"Classifier says no fracture; weak box ({box['confidence']}%) downgraded")
                box.update(
                    name="Possible Healed / Old Finding (No Active Fracture)",
                    severity="low", color="info", icd_code="",
                )
        findings.append(box)

    has_active_box = any(_is_active_fracture(f) for f in findings)
    has_hardware = _detect_metallic_hardware(file_bytes)

    for cf in classifier_findings:
        if "fracture suspected" not in cf.get("name", "").lower():
            findings.append(cf)  # the classifier's "no fracture" note
            continue
        if has_active_box or yolo_boxes:
            continue  # a localized box already carries (or explains away) this
        cf = dict(cf)
        if has_hardware:
            cf.update(
                name="Prior Fracture Site — Surgical Implants Present",
                severity="low", color="info", icd_code="Z96.6",
            )
        else:
            cf.update(
                name="Possible Healed / Old Finding (No Active Fracture Localized)",
                severity="low", color="info", icd_code="",
            )
        findings.append(cf)

    if not findings:
        findings = yolo_findings  # the "No fracture box localized" placeholder

    findings.sort(key=lambda item: item.get("confidence", 0), reverse=True)
    return findings


def _signal(findings: list[dict], kind: str) -> float:
    """Strongest real (non-clear, non-downgraded) finding for a model family."""
    best = 0.0
    for f in findings:
        if f.get("severity") in ("clear", None):
            continue
        if kind == "fracture" and not (f.get("bbox") or f.get("model") == "FractureClassifier"):
            continue
        if kind == "fracture" and not _is_active_fracture(f):
            continue
        if kind == "wound" and f.get("model") != "WoundClassifier":
            continue
        if kind == "chest" and f.get("model") != "DenseNet121":
            continue
        best = max(best, float(f.get("confidence", 0)))
    return best


def _reconcile_routing(
    *,
    primary_type: str,
    primary_findings: list[dict],
    primary_models: list[str],
    cross_type: str,
    cross_findings: list[dict],
    cross_models: list[str],
    routing: dict,
) -> tuple[str, list[dict], list[str]]:
    """Pick one report when both a radiograph and a wound model looked at the image.

    Reporting both leads to contradictory output (e.g. "98% fracture" next to
    "no wound"). The cross-check only takes over when it is clearly confident
    and the original route found little.
    """
    routing["cross_checked"] = cross_type
    primary_signal = _signal(primary_findings, primary_type)
    cross_signal = _signal(cross_findings, cross_type)
    logger.info(f"Routing: {primary_type}={primary_signal:.1f} vs {cross_type}={cross_signal:.1f}")

    if cross_signal >= _SWITCH_MIN_SIGNAL and primary_signal < _SWITCH_MAX_PRIMARY:
        routing["switched"] = True
        routing["note"] = (
            "This looks like a photo of a wound rather than a radiograph, so it was analyzed "
            "with the wound model."
            if cross_type == "wound"
            else "This looks like a radiograph rather than a wound photo, so it was analyzed "
            "with the fracture model."
        )
        return cross_type, cross_findings, cross_models

    return primary_type, primary_findings, primary_models


def _run_wound(file_bytes: bytes, confidence_threshold: float) -> list[dict]:
    from app.services.wound_model import predict_wound

    preprocessed = image_preprocess.preprocess_for_vit(file_bytes)
    return predict_wound(preprocessed, confidence_threshold)

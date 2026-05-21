"""Image analysis endpoint — the core AI inference pipeline."""

from __future__ import annotations
import uuid
import logging
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, status
from app.models.schemas import ScanResult, Finding, AgentSynthesis, BoundingBox
from app.services.auth_service import get_current_user_id
from app.services import image_preprocess
from app.services.gemini_agent import synthesize_report
from app.utils.supabase_client import insert_scan, upload_image
from app.config import get_settings

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
    """Upload an X-ray image and run the full AI diagnostic pipeline.

    1. Preprocess the image
    2. Run the appropriate model(s)
    3. Synthesize with Gemini
    4. Store results in Supabase
    5. Return structured report
    """
    settings = get_settings()

    # Validate scan type
    if scan_type not in ("chest", "fracture", "wound"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="scan_type must be one of: chest, fracture, wound",
        )

    # Read file bytes
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file uploaded.",
        )

    scan_id = str(uuid.uuid4())
    logger.info(f"Starting analysis {scan_id} | type={scan_type} | user={user_id}")

    # ── Step 1: Run model inference ──────────────────────────────
    raw_findings: list[dict] = []

    try:
        if scan_type == "chest":
            from app.services.chest_model import predict_chest_pathologies
            preprocessed = image_preprocess.preprocess_for_chest(file_bytes)
            raw_findings = predict_chest_pathologies(
                preprocessed, settings.confidence_threshold
            )

        elif scan_type == "fracture":
            from app.services.fracture_model import predict_fractures
            preprocessed = image_preprocess.preprocess_for_yolo(file_bytes)
            raw_findings = predict_fractures(
                preprocessed, settings.confidence_threshold
            )

        elif scan_type == "wound":
            from app.services.wound_model import predict_wound
            preprocessed = image_preprocess.preprocess_for_vit(file_bytes)
            raw_findings = predict_wound(
                preprocessed, settings.confidence_threshold
            )

    except Exception as e:
        logger.error(f"Model inference failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI model inference failed: {str(e)}",
        )

    # ── Step 2: Gemini agentic synthesis ────────────────────────
    try:
        agent_result = synthesize_report(
            findings=raw_findings,
            scan_type=scan_type,
            patient_notes=notes if notes else None,
        )
    except Exception as e:
        logger.error(f"Gemini synthesis failed: {e}")
        # Use fallback
        agent_result = {
            "urgency": "medium",
            "synthesis_text": "AI synthesis temporarily unavailable. Please review findings manually.",
            "recommended_actions": ["Consult a radiologist for interpretation"],
            "specialist": None,
        }

    # ── Step 3: Upload image to storage ─────────────────────────
    image_url = ""
    try:
        image_url = upload_image(user_id, scan_id, file_bytes,
                                 file.content_type or "image/png")
    except Exception as e:
        logger.warning(f"Image upload failed (non-blocking): {e}")
        image_url = ""

    # ── Step 4: Build response ──────────────────────────────────
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

    # ── Step 5: Persist to database ─────────────────────────────
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
            "model_results": {"scan_type": scan_type, "model_count": 1},
        }
        insert_scan(scan_record)
    except Exception as e:
        logger.warning(f"Database insert failed (non-blocking): {e}")

    result = ScanResult(
        id=scan_id,
        scan_type=scan_type,
        session_label=session_label or None,
        image_url=image_url,
        urgency=synthesis.urgency,
        findings=findings,
        agent_synthesis=synthesis,
        model_results={"scan_type": scan_type},
        created_at="just now",
    )

    logger.info(f"Analysis {scan_id} complete | findings={len(findings)} | urgency={synthesis.urgency}")
    return result

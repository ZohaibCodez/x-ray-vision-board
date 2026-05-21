"""Bone fracture detection using YOLOv8.

Uses the Ultralytics YOLOv8 model for real-time object detection
and localization of fractures in X-ray images.
"""

from __future__ import annotations
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Lazy-loaded model singleton
_model = None


def _get_model():
    """Load the YOLOv8 model (lazy singleton)."""
    global _model
    if _model is None:
        logger.info("Loading YOLOv8 model...")
        try:
            from ultralytics import YOLO
            from app.config import get_settings

            settings = get_settings()
            weights = settings.yolo_weights_path
            _model = YOLO(weights)
            logger.info(f"YOLOv8 loaded from: {weights}")
        except Exception as e:
            logger.error(f"Failed to load YOLOv8: {e}")
            raise
    return _model


def predict_fractures(image: np.ndarray,
                      confidence_threshold: float = 0.25) -> list[dict]:
    """Run fracture detection inference.

    Args:
        image: BGR numpy array (original size, YOLO handles resizing).
        confidence_threshold: minimum confidence to include detections.

    Returns:
        List of findings with bounding boxes, confidence, and severity.
    """
    model = _get_model()

    results = model(image, conf=confidence_threshold, verbose=False)

    findings = []
    img_h, img_w = image.shape[:2]

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue

        for box in boxes:
            # Get bounding box coordinates (xyxy format)
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())
            cls_name = result.names.get(cls_id, f"class_{cls_id}")

            # Convert to percentage-based coordinates for the frontend
            bbox = {
                "x": round(float(x1 / img_w * 100), 1),
                "y": round(float(y1 / img_h * 100), 1),
                "w": round(float((x2 - x1) / img_w * 100), 1),
                "h": round(float((y2 - y1) / img_h * 100), 1),
            }

            confidence = round(conf * 100, 1)

            # Determine severity
            if confidence >= 80:
                severity = "high"
                color = "destructive"
            elif confidence >= 60:
                severity = "moderate"
                color = "warning"
            else:
                severity = "low"
                color = "info"

            findings.append({
                "name": f"Fracture — {cls_name}",
                "confidence": confidence,
                "severity": severity,
                "model": "YOLOv8",
                "region": _infer_region(bbox),
                "icd_code": "S02-S92",
                "bbox": bbox,
                "color": color,
            })

    # Sort by confidence descending
    findings.sort(key=lambda x: x["confidence"], reverse=True)

    # If no fractures detected, return a "clear" finding
    if not findings:
        findings.append({
            "name": "No fracture detected",
            "confidence": 95.0,
            "severity": "clear",
            "model": "YOLOv8",
            "region": "Full image",
            "icd_code": "",
            "color": "success",
        })

    return findings


def _infer_region(bbox: dict) -> str:
    """Infer the anatomical region based on bounding box position."""
    cx = bbox["x"] + bbox["w"] / 2
    cy = bbox["y"] + bbox["h"] / 2

    if cy < 30:
        return "Upper extremity"
    elif cy < 60:
        return "Mid-body / Torso"
    else:
        return "Lower extremity"

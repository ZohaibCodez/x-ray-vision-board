"""Bone fracture detection using YOLOv8.

Uses the Ultralytics YOLOv8 model for real-time object detection
and localization of fractures in X-ray images.
"""

from __future__ import annotations
from pathlib import Path
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
            weights_name = Path(weights).name.lower()
            generic_weights = {"yolov8n.pt", "yolov8s.pt", "yolov8m.pt", "yolov8l.pt", "yolov8x.pt"}
            if weights_name in generic_weights and not settings.allow_generic_yolo_weights:
                raise RuntimeError(
                    "Generic YOLO weights are not valid for medical fracture delivery. "
                    "Set YOLO_WEIGHTS_PATH to fracture-trained weights, or set "
                    "ALLOW_GENERIC_YOLO_WEIGHTS=true only for demo mode."
                )
            if not Path(weights).exists() and weights_name not in generic_weights:
                raise FileNotFoundError(
                    f"Fracture YOLO weights not found at '{weights}'. "
                    "Place fracture-trained weights there or update YOLO_WEIGHTS_PATH."
                )
            _model = YOLO(weights)
            logger.info(f"YOLOv8 loaded from: {weights}")
        except Exception as e:
            logger.error(f"Failed to load YOLOv8: {e}")
            raise
    return _model


def predict_fractures(image: np.ndarray,
                      confidence_threshold: float = 0.15) -> list[dict]:
    """Run fracture detection inference.

    Args:
        image: BGR numpy array (original size, YOLO handles resizing).
        confidence_threshold: minimum confidence to include detections.

    Returns:
        List of findings with bounding boxes, confidence, and severity.
    """
    model = _get_model()

    results = model(image, conf=confidence_threshold, imgsz=960, verbose=False)

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
            cls_name = str(result.names.get(cls_id, f"class_{cls_id}"))
            cls_key = cls_name.lower().replace(" ", "_")

            # Convert to percentage-based coordinates for the frontend
            bbox = {
                "x": round(float(x1 / img_w * 100), 1),
                "y": round(float(y1 / img_h * 100), 1),
                "w": round(float((x2 - x1) / img_w * 100), 1),
                "h": round(float((y2 - y1) / img_h * 100), 1),
            }

            confidence = round(conf * 100, 1)

            # Map raw class names to clean medical labels
            label = _clean_class_name(cls_name)

            # Skip very low-confidence "Not_Fracture" detections — not useful to display
            if cls_key in ("not_fracture", "normal", "negative"):
                continue

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

            icd = "S02-S92" if cls_key == "fracture" or cls_key.endswith("_fracture") else ""

            findings.append({
                "name": label,
                "confidence": confidence,
                "severity": severity,
                "model": "YOLOv8",
                "region": _infer_region(bbox),
                "icd_code": icd,
                "bbox": bbox,
                "color": color,
            })

    # Sort by confidence descending
    findings.sort(key=lambda x: x["confidence"], reverse=True)

    # If no fractures detected, return a "clear" finding
    if not findings:
        findings.append({
            "name": "No fracture box localized",
            "confidence": 0.0,
            "severity": "low",
            "model": "YOLOv8",
            "region": "Full image",
            "icd_code": "",
            "color": "warning",
        })

    return findings


def _clean_class_name(cls_name: str) -> str:
    """Map raw Roboflow class names to clean medical labels."""
    mapping = {
        "fracture":      "Fracture Detected",
        "not fracture":  "No Fracture Detected",
        "not_fracture":  "No Fracture Detected",
        "normal":        "No Fracture Detected",
        "negative":      "No Fracture Detected",
        "boneanomaly":   "Bone Anomaly",
        "bonelesion":    "Bone Lesion",
        "foreignbody":   "Foreign Body",
        "metal":         "Metallic Implant",
        "periostealreaction": "Periosteal Reaction",
        "pronationsign": "Pronation Sign",
        "softtissue":    "Soft Tissue Finding",
        "hardware":      "Surgical Hardware",
    }
    return mapping.get(cls_name.lower().replace(" ", "_"), cls_name.replace("_", " ").title())


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

"""Bone fracture detection using YOLOv8.

Uses the Ultralytics YOLOv8 model for real-time object detection
and localization of fractures in X-ray images.

Post-processing includes:
  - Lower hardware detection threshold (0.20) to ensure implants are captured
  - Bounding box area cap (reject oversized boxes covering >35% of image)
  - Hardware / metal implant cross-referencing (reclassify healed sites)
  - Confidence-based severity mapping
"""

from __future__ import annotations
from pathlib import Path
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Lazy-loaded model singleton
_model = None

# ── Configurable limits ─────────────────────────────────────────────
MAX_BBOX_AREA_PERCENT = 35.0

# Classes whose detections indicate surgical implants / healed sites
_HARDWARE_CLASSES = {"metal", "hardware", "foreignbody"}

# Classes that represent an active fracture finding
_FRACTURE_CLASSES = {"fracture"}


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
                      confidence_threshold: float = 0.35) -> list[dict]:
    """Run fracture detection inference with intelligent post-processing.

    Args:
        image: BGR numpy array (original size, YOLO handles resizing).
        confidence_threshold: minimum confidence for fracture detections (default 0.35).
            Hardware/metal detections use a lower cutoff (0.20) to ensure implants
            are captured even when low-contrast.

    Returns:
        List of findings with bounding boxes, confidence, and severity.
    """
    model = _get_model()

    # Run YOLO with a sensitive base threshold of 0.20 to catch hardware/metal implants
    results = model(image, conf=0.20, imgsz=960, verbose=False)

    raw_detections: list[dict] = []
    img_h, img_w = image.shape[:2]

    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue

        for box in boxes:
            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
            conf = float(box.conf[0].cpu().numpy())
            cls_id = int(box.cls[0].cpu().numpy())
            cls_name = str(result.names.get(cls_id, f"class_{cls_id}"))
            cls_key = cls_name.lower().replace(" ", "_")

            # Filter fracture detections below the main confidence threshold (0.35),
            # but keep hardware/metal detections down to 0.20
            is_hardware_class = cls_key in _HARDWARE_CLASSES
            if not is_hardware_class and conf < confidence_threshold:
                continue

            bbox = {
                "x": round(float(x1 / img_w * 100), 1),
                "y": round(float(y1 / img_h * 100), 1),
                "w": round(float((x2 - x1) / img_w * 100), 1),
                "h": round(float((y2 - y1) / img_h * 100), 1),
            }

            raw_detections.append({
                "cls_key": cls_key,
                "cls_name": cls_name,
                "conf": conf,
                "bbox": bbox,
                "x1": float(x1), "y1": float(y1),
                "x2": float(x2), "y2": float(y2),
            })

    negative_keys = {"not_fracture", "normal", "negative"}
    raw_detections = [d for d in raw_detections if d["cls_key"] not in negative_keys]

    # ── Post-processing pipeline ────────────────────────────────────
    filtered = _filter_oversized_boxes(raw_detections)
    findings = _build_findings_with_hardware_crosscheck(filtered)

    findings.sort(key=lambda x: x["confidence"], reverse=True)

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


# ── Post-processing helpers ──────────────────────────────────────────

def _filter_oversized_boxes(detections: list[dict]) -> list[dict]:
    """Reject bounding boxes covering >MAX_BBOX_AREA_PERCENT of the image."""
    kept = []
    for d in detections:
        box_area = d["bbox"]["w"] * d["bbox"]["h"]
        area_pct = box_area / 100.0

        if area_pct > MAX_BBOX_AREA_PERCENT:
            logger.info(
                f"Rejected oversized box: {d['cls_key']} "
                f"({d['bbox']['w']:.0f}%×{d['bbox']['h']:.0f}% = {area_pct:.1f}% of image)"
            )
            continue
        kept.append(d)
    return kept


def _build_findings_with_hardware_crosscheck(detections: list[dict]) -> list[dict]:
    """Build final findings list, cross-referencing fracture boxes against
    hardware / metal detections.
    """
    hardware_boxes = [d for d in detections if d["cls_key"] in _HARDWARE_CLASSES]
    other_detections = [d for d in detections if d["cls_key"] not in _HARDWARE_CLASSES]

    findings: list[dict] = []

    for det in other_detections:
        cls_key = det["cls_key"]
        confidence = round(det["conf"] * 100, 1)
        bbox = det["bbox"]

        is_fracture = cls_key in _FRACTURE_CLASSES or cls_key.endswith("_fracture")

        # Cross-check: does this fracture overlap with a hardware/metal box?
        if is_fracture and hardware_boxes:
            overlap = _max_overlap_with_hardware(det, hardware_boxes)
            if overlap > 0.15:  # >15% IoU overlap with hardware
                label = "Healed Fracture Site — Surgical Hardware Present"
                severity = "low"
                color = "info"
                icd = "Z96.6"
                logger.info(
                    f"Reclassified fracture as healed (hardware overlap={overlap:.0%}): "
                    f"conf={confidence}%"
                )
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
                continue

        label = _clean_class_name(det["cls_name"])

        if confidence >= 80:
            severity = "high"
            color = "destructive"
        elif confidence >= 60:
            severity = "moderate"
            color = "warning"
        else:
            severity = "low"
            color = "info"

        icd = "S02-S92" if is_fracture else ""

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

    for hw in hardware_boxes:
        confidence = round(hw["conf"] * 100, 1)
        label = _clean_class_name(hw["cls_name"])
        findings.append({
            "name": label,
            "confidence": confidence,
            "severity": "low",
            "model": "YOLOv8",
            "region": _infer_region(hw["bbox"]),
            "icd_code": "Z96.6",
            "bbox": hw["bbox"],
            "color": "info",
        })

    return findings


def _max_overlap_with_hardware(fracture_det: dict, hardware_boxes: list[dict]) -> float:
    """Compute maximum IoU between a fracture box and any hardware box."""
    best_iou = 0.0
    fx1, fy1, fx2, fy2 = fracture_det["x1"], fracture_det["y1"], fracture_det["x2"], fracture_det["y2"]
    f_area = max((fx2 - fx1) * (fy2 - fy1), 1e-6)

    for hw in hardware_boxes:
        hx1, hy1, hx2, hy2 = hw["x1"], hw["y1"], hw["x2"], hw["y2"]
        h_area = max((hx2 - hx1) * (hy2 - hy1), 1e-6)

        ix1 = max(fx1, hx1)
        iy1 = max(fy1, hy1)
        ix2 = min(fx2, hx2)
        iy2 = min(fy2, hy2)

        if ix2 <= ix1 or iy2 <= iy1:
            continue

        inter = (ix2 - ix1) * (iy2 - iy1)
        union = f_area + h_area - inter
        iou = inter / union if union > 0 else 0.0
        best_iou = max(best_iou, iou)

    return best_iou


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

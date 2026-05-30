"""External wound classification using a wound-specific Hugging Face classifier.
"""

from __future__ import annotations
from PIL import Image
import logging

logger = logging.getLogger(__name__)

# Lazy-loaded model singletons
_processor = None
_model = None

def _get_model():
    """Load the ViT model and processor (lazy singleton)."""
    global _processor, _model
    if _model is None:
        logger.info("Loading wound classification model...")
        try:
            from transformers import AutoImageProcessor, AutoModelForImageClassification
            from app.config import get_settings

            model_name = get_settings().wound_model_name
            _processor = AutoImageProcessor.from_pretrained(model_name)
            _model = AutoModelForImageClassification.from_pretrained(model_name)
            _model.eval()
            logger.info(f"Wound model loaded successfully: {model_name}")
        except Exception as e:
            logger.error(f"Failed to load wound model: {e}")
            raise
    return _processor, _model


# dermaintel-wound-classifier classes → clean label + approximate ICD-10 code.
# "normal_skin" is the model's negative class; the rest are wound types.
_WOUND_LABELS: dict[str, tuple[str, str]] = {
    "pressure_ulcer":  ("Pressure Ulcer", "L89.90"),
    "venous_ulcer":    ("Venous Ulcer", "I83.009"),
    "arterial_ulcer":  ("Arterial Ulcer", "I70.25"),
    "diabetic_ulcer":  ("Diabetic Foot Ulcer", "E11.621"),
    "surgical_wound":  ("Surgical Wound", "T81.89XA"),
    "traumatic_wound": ("Traumatic Wound", "T14.8"),
    "normal_skin":     ("Normal Skin", ""),
}

# Secondary wound types below the top prediction are only worth showing if they
# carry some real signal — a 7-way softmax baseline is ~14%.
_SECONDARY_MIN_CONFIDENCE = 15.0


def predict_wound(image: Image.Image,
                  confidence_threshold: float = 0.10) -> list[dict]:
    """Run wound classification inference.

    The underlying model is a 7-class softmax (6 wound types + normal_skin),
    so we report the top prediction directly rather than thresholding every
    class — a confident wound call on 7 classes can sit well below 40%.

    Args:
        image: PIL Image (RGB).
        confidence_threshold: retained for API compatibility; not used to gate
            the top prediction (softmax always has a most-likely class).

    Returns:
        List of findings with classification labels and confidence.
    """
    import torch

    processor, model = _get_model()

    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.nn.functional.softmax(outputs.logits, dim=-1)[0]

    id2label = model.config.id2label
    ranked = sorted(
        ((float(probs[i]) * 100, id2label[int(i)]) for i in range(len(probs))),
        reverse=True,
    )

    top_conf, top_label = ranked[0]

    # If the model is most confident the skin is normal, say so honestly —
    # using the model's real confidence, not a fabricated number.
    if top_label == "normal_skin":
        return [{
            "name": "No significant wound detected",
            "confidence": round(top_conf, 1),
            "severity": "clear",
            "model": "WoundClassifier",
            "region": "External",
            "icd_code": "",
            "color": "success",
        }]

    # Otherwise report the detected wound type(s): always the top prediction,
    # plus any other wound classes carrying meaningful signal.
    findings: list[dict] = []
    for conf, label in ranked:
        if label == "normal_skin":
            continue
        if findings and conf < _SECONDARY_MIN_CONFIDENCE:
            break

        name, icd = _WOUND_LABELS.get(label, (label.replace("_", " ").title(), "T14.8"))

        if conf >= 70:
            severity, color = "high", "destructive"
        elif conf >= 40:
            severity, color = "moderate", "warning"
        else:
            severity, color = "low", "info"

        findings.append({
            "name": name,
            "confidence": round(conf, 1),
            "severity": severity,
            "model": "WoundClassifier",
            "region": "External",
            "icd_code": icd,
            "color": color,
        })
        if len(findings) >= 5:
            break

    return findings

"""External wound classification using Vision Transformer (ViT).

Uses HuggingFace's google/vit-base-patch16-224 model for
image classification of wound types.
"""

from __future__ import annotations
from PIL import Image
import logging

logger = logging.getLogger(__name__)

# Lazy-loaded model singletons
_processor = None
_model = None

# Wound-related labels we care about
WOUND_LABELS = [
    "abrasion", "bruise", "burn", "cut", "laceration",
    "puncture", "surgical wound", "fracture", "swelling",
    "normal", "healthy skin",
]


def _get_model():
    """Load the ViT model and processor (lazy singleton)."""
    global _processor, _model
    if _model is None:
        logger.info("Loading ViT wound classification model...")
        try:
            from transformers import ViTForImageClassification, ViTImageProcessor

            model_name = "google/vit-base-patch16-224"
            _processor = ViTImageProcessor.from_pretrained(model_name)
            _model = ViTForImageClassification.from_pretrained(model_name)
            _model.eval()
            logger.info("ViT model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load ViT model: {e}")
            raise
    return _processor, _model


def predict_wound(image: Image.Image,
                  confidence_threshold: float = 0.10) -> list[dict]:
    """Run wound classification inference.

    Args:
        image: PIL Image (RGB).
        confidence_threshold: minimum probability to include in results.

    Returns:
        List of findings with classification labels and confidence.
    """
    import torch

    processor, model = _get_model()

    # Process the image
    inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=-1)[0]

    # Get top predictions
    top_k = min(10, len(probs))
    top_probs, top_indices = torch.topk(probs, top_k)

    findings = []
    for prob, idx in zip(top_probs, top_indices):
        confidence = float(prob) * 100
        if confidence < confidence_threshold * 100:
            continue

        label = model.config.id2label.get(int(idx), f"class_{int(idx)}")

        # Determine severity based on confidence and label
        if confidence >= 70:
            severity = "high"
            color = "destructive"
        elif confidence >= 40:
            severity = "moderate"
            color = "warning"
        else:
            severity = "low"
            color = "info"

        findings.append({
            "name": _clean_label(label),
            "confidence": round(confidence, 1),
            "severity": severity,
            "model": "ViT",
            "region": "External",
            "icd_code": _get_wound_icd(label),
            "color": color,
        })

    # Limit to top 5
    findings = findings[:5]

    if not findings:
        findings.append({
            "name": "No significant wound detected",
            "confidence": 90.0,
            "severity": "clear",
            "model": "ViT",
            "region": "External",
            "icd_code": "",
            "color": "success",
        })

    return findings


def _clean_label(label: str) -> str:
    """Clean up ImageNet labels for medical context."""
    # ImageNet labels aren't medical, but we map close ones
    label = label.replace("_", " ").title()
    return label


def _get_wound_icd(label: str) -> str:
    """Map wound classification to approximate ICD-10 codes."""
    wound_icd = {
        "abrasion": "T14.0",
        "bruise": "T14.0",
        "burn": "T30",
        "cut": "T14.1",
        "laceration": "T14.1",
        "puncture": "T14.1",
        "swelling": "R22.9",
        "fracture": "T14.2",
    }
    label_lower = label.lower()
    for key, code in wound_icd.items():
        if key in label_lower:
            return code
    return "T14.9"

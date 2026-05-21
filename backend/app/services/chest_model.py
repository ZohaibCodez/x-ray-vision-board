"""Chest pathology detection using TorchXRayVision DenseNet121.

This model is pretrained on 700K+ clinical X-ray images and outputs
probabilities for 18 different chest pathologies.
"""

from __future__ import annotations
import numpy as np
import torch
import logging

logger = logging.getLogger(__name__)

# Lazy-loaded model singleton
_model = None
_pathology_names: list[str] = []


def _get_model():
    """Load the DenseNet121 model (lazy singleton)."""
    global _model, _pathology_names
    if _model is None:
        logger.info("Loading TorchXRayVision DenseNet121 model...")
        try:
            import torchxrayvision as xrv
            _model = xrv.models.DenseNet(weights="densenet121-res224-all")
            _model.eval()
            _pathology_names = list(_model.pathologies)
            logger.info(f"DenseNet121 loaded. Pathologies: {_pathology_names}")
        except Exception as e:
            logger.error(f"Failed to load DenseNet121: {e}")
            raise
    return _model


def predict_chest_pathologies(preprocessed_image: np.ndarray,
                               confidence_threshold: float = 0.40) -> list[dict]:
    """Run chest pathology inference.

    Args:
        preprocessed_image: numpy array of shape (1, 1, 224, 224)
                           normalized to [-1024, 1024] range.
        confidence_threshold: minimum probability to include in results.

    Returns:
        List of findings, each with name, confidence, severity, model, region.
    """
    model = _get_model()

    with torch.no_grad():
        tensor_input = torch.from_numpy(preprocessed_image).float()
        outputs = model(tensor_input)
        probabilities = outputs.cpu().numpy()[0]

    findings = []
    for i, (name, prob) in enumerate(zip(_pathology_names, probabilities)):
        confidence = float(prob) * 100  # Convert to percentage

        if confidence < confidence_threshold * 100:
            continue

        # Determine severity based on confidence
        if confidence >= 80:
            severity = "high"
            color = "destructive"
        elif confidence >= 60:
            severity = "moderate"
            color = "warning"
        else:
            severity = "low"
            color = "info"

        # Map pathology to anatomical region
        region = _get_region(name)
        icd_code = _get_icd_code(name)

        findings.append({
            "name": name,
            "confidence": round(confidence, 1),
            "severity": severity,
            "model": "DenseNet121",
            "region": region,
            "icd_code": icd_code,
            "color": color,
        })

    # Sort by confidence descending
    findings.sort(key=lambda x: x["confidence"], reverse=True)
    return findings


def _get_region(pathology: str) -> str:
    """Map pathology name to anatomical region."""
    region_map = {
        "Atelectasis": "Lung parenchyma",
        "Cardiomegaly": "Mediastinum",
        "Consolidation": "Lung parenchyma",
        "Edema": "Bilateral",
        "Effusion": "Pleural space",
        "Emphysema": "Lung parenchyma",
        "Fibrosis": "Lung parenchyma",
        "Hernia": "Diaphragm",
        "Infiltration": "Lung parenchyma",
        "Mass": "Lung parenchyma",
        "Nodule": "Lung parenchyma",
        "Pleural_Thickening": "Pleural space",
        "Pneumonia": "Lung parenchyma",
        "Pneumothorax": "Pleural space",
        "Enlarged Cardiomediastinum": "Mediastinum",
        "Lung Opacity": "Lung parenchyma",
        "Lung Lesion": "Lung parenchyma",
        "Fracture": "Rib cage",
    }
    return region_map.get(pathology, "Chest")


def _get_icd_code(pathology: str) -> str:
    """Map pathology name to ICD-10 code."""
    icd_map = {
        "Atelectasis": "J98.1",
        "Cardiomegaly": "I51.7",
        "Consolidation": "J18.9",
        "Edema": "J81",
        "Effusion": "J90",
        "Emphysema": "J43.9",
        "Fibrosis": "J84.1",
        "Hernia": "K44.9",
        "Infiltration": "R91.8",
        "Mass": "R91.1",
        "Nodule": "R91.1",
        "Pleural_Thickening": "J92.9",
        "Pneumonia": "J18.9",
        "Pneumothorax": "J93.9",
        "Enlarged Cardiomediastinum": "R93.1",
        "Lung Opacity": "R91.8",
        "Lung Lesion": "R91.1",
        "Fracture": "S22.9",
    }
    return icd_map.get(pathology, "R93.1")

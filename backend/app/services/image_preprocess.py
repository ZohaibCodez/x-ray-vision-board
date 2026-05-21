"""Image preprocessing utilities for medical image analysis."""

from __future__ import annotations
import numpy as np
import cv2
from PIL import Image
import io
import torch


def load_image_from_bytes(file_bytes: bytes) -> np.ndarray:
    """Load an image from raw bytes into a numpy array (BGR)."""
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode the uploaded image.")
    return img


def preprocess_for_chest(file_bytes: bytes) -> np.ndarray:
    """Preprocess an image for TorchXRayVision DenseNet121.

    Returns a normalized 224×224 grayscale image as a numpy array
    with shape (1, 1, 224, 224) ready for model input.
    """
    img = load_image_from_bytes(file_bytes)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Apply CLAHE for contrast enhancement (important for X-rays)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)

    # Resize to 224x224
    resized = cv2.resize(enhanced, (224, 224), interpolation=cv2.INTER_AREA)

    # Normalize to [0, 1] then scale to [-1024, 1024] as TorchXRayVision expects
    normalized = resized.astype(np.float32)
    # TorchXRayVision expects images in range [-1024, 1024]
    normalized = (normalized / 255.0) * 2048.0 - 1024.0

    # Add batch and channel dimensions: (1, 1, 224, 224)
    tensor_input = normalized[np.newaxis, np.newaxis, :, :]
    return tensor_input


def preprocess_for_yolo(file_bytes: bytes) -> np.ndarray:
    """Preprocess an image for YOLOv8 inference.

    Returns the image as a numpy array (BGR) at its original size.
    YOLO handles its own resizing internally.
    """
    img = load_image_from_bytes(file_bytes)

    # Apply CLAHE on grayscale channel for better contrast
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l_channel, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)
    enhanced = cv2.merge([l_enhanced, a, b])
    result = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

    return result


def preprocess_for_vit(file_bytes: bytes) -> Image.Image:
    """Preprocess an image for ViT classification.

    Returns a PIL Image (RGB) — the ViT processor handles resizing/normalization.
    """
    img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    return img


def image_to_base64(file_bytes: bytes) -> str:
    """Convert image bytes to a base64-encoded string for Gemini API."""
    import base64
    return base64.b64encode(file_bytes).decode("utf-8")

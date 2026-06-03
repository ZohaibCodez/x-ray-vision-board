"""Image preprocessing utilities for medical image analysis."""

from __future__ import annotations
import numpy as np
import cv2
from PIL import Image
import io
import torch

_MIN_FILE_SIZE = 100 * 1024       # 100 KB
_MAX_FILE_SIZE = 20 * 1024 * 1024 # 20 MB
_MIN_DIMENSION = 200               # px per side


def validate_image_file(file_bytes: bytes, filename: str = "", content_type: str = "") -> None:
    """Raise ValueError with a user-readable message if the image fails quality checks.

    Checks: file size bounds, decodability, and minimum pixel dimensions.
    DICOM files (.dcm) skip the PIL dimension check since pydicom handles them separately.
    """
    size = len(file_bytes)
    if size < _MIN_FILE_SIZE:
        raise ValueError(
            f"File is too small ({size // 1024} KB). "
            "Minimum is 100 KB — very small images lack sufficient pixel data for reliable inference."
        )
    if size > _MAX_FILE_SIZE:
        raise ValueError(
            f"File is too large ({size / 1024 / 1024:.1f} MB). Maximum allowed size is 20 MB."
        )

    is_dicom = filename.lower().endswith(".dcm") or content_type in ("application/dicom", "application/octet-stream")

    if not is_dicom:
        try:
            img = Image.open(io.BytesIO(file_bytes))
            img.verify()
        except Exception:
            raise ValueError("File could not be decoded as a valid image. Upload a JPEG, PNG, or DICOM file.")

        try:
            img = Image.open(io.BytesIO(file_bytes))
            w, h = img.size
        except Exception:
            raise ValueError("Could not determine image dimensions.")

        if w < _MIN_DIMENSION or h < _MIN_DIMENSION:
            raise ValueError(
                f"Image resolution is too low ({w}×{h} px). "
                f"Minimum is {_MIN_DIMENSION}×{_MIN_DIMENSION} px. "
                "Low-resolution images produce unreliable diagnostic results."
            )


def load_image_from_bytes(file_bytes: bytes) -> np.ndarray:
    """Load an image from raw bytes into a numpy array (BGR).

    Supports common image formats through OpenCV and DICOM through pydicom.
    """
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is not None:
        return img

    return load_dicom_from_bytes(file_bytes)


def load_dicom_from_bytes(file_bytes: bytes) -> np.ndarray:
    """Decode DICOM pixel data into an 8-bit BGR image."""
    try:
        import pydicom
    except ImportError as exc:
        raise ValueError("DICOM support requires pydicom to be installed.") from exc

    try:
        ds = pydicom.dcmread(io.BytesIO(file_bytes), force=True)
        arr = ds.pixel_array.astype(np.float32)
    except Exception as exc:
        raise ValueError("Could not decode the uploaded image or DICOM file.") from exc

    slope = float(getattr(ds, "RescaleSlope", 1.0))
    intercept = float(getattr(ds, "RescaleIntercept", 0.0))
    arr = arr * slope + intercept

    photo = str(getattr(ds, "PhotometricInterpretation", "")).upper()
    if photo == "MONOCHROME1":
        arr = arr.max() - arr

    arr = arr - arr.min()
    max_val = arr.max()
    if max_val > 0:
        arr = arr / max_val
    img8 = (arr * 255).clip(0, 255).astype(np.uint8)
    return cv2.cvtColor(img8, cv2.COLOR_GRAY2BGR)


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
    try:
        return Image.open(io.BytesIO(file_bytes)).convert("RGB")
    except Exception:
        bgr = load_dicom_from_bytes(file_bytes)
        rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb)


def image_to_base64(file_bytes: bytes) -> str:
    """Convert image bytes to a base64-encoded string for multimodal APIs."""
    import base64
    return base64.b64encode(file_bytes).decode("utf-8")

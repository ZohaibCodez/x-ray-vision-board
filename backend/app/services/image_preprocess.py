"""Image preprocessing utilities for medical image analysis."""

from __future__ import annotations
import numpy as np
import cv2
from PIL import Image
import io
import torch

_MAX_FILE_SIZE = 20 * 1024 * 1024 # 20 MB
_MIN_DIMENSION = 200               # px per side

# ── Surgical hardware heuristic ──────────────────────────────────────

# A genuine screw/plate is a small, compact, solid-bright blob. The old check
# here was just "do >0.1% of pixels hit ~white" — on a confirmed real case (a
# bright/high-contrast X-ray with no hardware at all) that alone hit 6.9% of
# pixels, because dense cortical bone is often near-white too and that
# brightness is smeared across the whole bone shape, not concentrated.
# Confirmed on that image: the brightest connected region spanned 99% of the
# image width and 100% of the height while only filling 5.7% of its own
# bounding box — exactly the "diffuse highlight", not "compact solid object",
# signature. A real implant's bounding box stays small relative to the image
# and is mostly filled in, since it's one dense solid part, not scattered
# highlights across the bone surface.
_HARDWARE_MIN_RATIO = 0.0008       # minimum overall bright-pixel fraction to even consider
_HARDWARE_MAX_BBOX_FRACTION = 0.45  # component's bbox must stay under this fraction of width/height
_HARDWARE_MIN_BBOX_FILL = 0.25      # ...and be mostly solid, not a scattered texture
# A real screw/plate/rod is visibly sized, not a handful of pixels. A min area
# of 25px (the original value) and no size floor let a Shutterstock watermark
# corner, a red arrow's antialiased edge, or a bright joint-surface speck all
# pass as "implants" on otherwise clean, hardware-free X-rays — confirmed live
# on three separate real client images. Scale the area floor to the image
# (tiny images still need a sane minimum) and additionally require the
# component's longer side to span a real fraction of the image, since an
# implant reads as elongated/substantial, not a dot.
_HARDWARE_MIN_AREA_FLOOR = 150
_HARDWARE_MIN_AREA_RATIO = 0.00025  # ...or this fraction of the image, whichever is bigger
_HARDWARE_MIN_MAJOR_DIM_FRACTION = 0.02  # longer side of the bbox vs. image's matching dimension


def detect_metallic_hardware(gray: np.ndarray) -> bool:
    """Detect a compact, solid bright blob consistent with surgical hardware.

    Takes a grayscale image. Looks for a connected region of near-saturated
    pixels (>=240) that is small relative to the image, mostly filled in, and
    large enough to plausibly be a screw/plate/rod rather than noise — diffuse
    bright bone texture, a watermark, an annotation edge, or a tiny bright
    speck does not, even though all of those can trip a naive "some fraction
    of pixels are bright" check.
    """
    mask = (gray >= 240).astype(np.uint8)
    if mask.mean() < _HARDWARE_MIN_RATIO:
        return False

    n, _labels, stats, _centroids = cv2.connectedComponentsWithStats(mask, connectivity=8)
    if n <= 1:
        return False

    h, w = gray.shape[:2]
    min_area = max(_HARDWARE_MIN_AREA_FLOOR, _HARDWARE_MIN_AREA_RATIO * h * w)
    for x, y, cw, ch, area in stats[1:]:  # skip label 0 (background)
        if area < min_area:
            continue
        if cw > w * _HARDWARE_MAX_BBOX_FRACTION or ch > h * _HARDWARE_MAX_BBOX_FRACTION:
            continue  # spans too much of the image to be a discrete implant
        if cw < w * _HARDWARE_MIN_MAJOR_DIM_FRACTION and ch < h * _HARDWARE_MIN_MAJOR_DIM_FRACTION:
            continue  # too small in both dimensions to be a visible implant
        bbox_fill = area / float(cw * ch)
        if bbox_fill >= _HARDWARE_MIN_BBOX_FILL:
            return True
    return False


def validate_image_file(file_bytes: bytes, filename: str = "", content_type: str = "") -> None:
    """Raise ValueError with a user-readable message if the image fails quality checks.

    Checks: file size ceiling, decodability, and minimum pixel dimensions.
    DICOM files (.dcm) skip the PIL dimension check since pydicom handles them separately.

    There used to be a 100 KB *minimum* file-size check here too, on the theory
    that a tiny file means too little pixel data. File size is a bad proxy for
    that — a well-compressed JPEG/PNG of a perfectly adequate 800x800 X-ray can
    legitimately be under 100 KB, and that was rejecting real uploads. The
    dimension check below already measures the thing that actually matters
    (actual pixel resolution), so the byte-size floor was redundant on top of
    being wrong.
    """
    size = len(file_bytes)
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

"""Automatic image-type classification router.

Classifies an uploaded image as one of:
  - "chest"    → Chest X-ray (frontal PA/AP radiograph)
  - "fracture" → Bone / extremity X-ray
  - "wound"    → External wound / skin photo

Robust Anatomical Heuristics
─────────────────────────────
1. **Saturation Test** — X-rays are desaturated (grayscale), wound photos are full colour.
2. **Surgical Metal Check** — If metallic implants/screws are detected (`img >= 240`), it is a bone/fracture scan.
3. **Anatomical Body Width Ratio**:
   - Chest X-rays: The thoracic cage & soft tissue fill almost the ENTIRE width of the image (body width ratio >= 0.70).
   - Extremity X-rays (wrist, forearm, leg, finger): The limb is a central vertical column with empty black void background on left & right sides (body width ratio < 0.68).
4. **Lung Parenchyma & Mediastinum Checks**:
   - Chest X-rays feature bilateral lung parenchymal tissue (gray 40-100) inside a wide thoracic frame.
"""

from __future__ import annotations

import logging
import numpy as np
import cv2

logger = logging.getLogger(__name__)


# Mean saturation near the colour-photo / X-ray cut-off (40) is a coin flip —
# but "near" turned out to be a much wider range than it looks. A phone photo
# of a real X-ray film (under warm indoor lighting, JPEG-compressed) routinely
# measures 60-150+ mean saturation despite being visually a grayscale film to
# the human eye — camera white balance and compression both add a colour cast.
# Measured empirically: a synthetic grayscale bone image under simulated warm
# lighting hit sat=66 (typical indoor light), sat=100+ (yellow-toned phone
# photo), and sat=145 (sepia/older-photo cast) — all clearly X-rays, all above
# the old 60 ceiling, so they were being hard-routed to "wound" with no chance
# of correction. Genuine full-colour wound/skin photos are usually still
# higher than that (skin tone, redness, bruising), so the ceiling here is
# generous on purpose: it's cheap to run both models and reconcile (see
# `_reconcile_routing`), and a wrongly-skipped cross-check is what caused scans
# to get stuck reporting "98% fracture" on what was actually a wound photo, or
# a fracture photo staying misfiled as wound with no fracture signal reported.
AMBIGUOUS_SATURATION_MIN = 12.0
AMBIGUOUS_SATURATION_MAX = 200.0


def classify_image_type(file_bytes: bytes) -> str:
    """Return the predicted scan type for an uploaded image.

    Returns one of ``"chest"``, ``"fracture"``, or ``"wound"``.
    """
    return classify_image_detailed(file_bytes)["scan_type"]


def classify_image_detailed(file_bytes: bytes) -> dict:
    """Classify an image and report how sure the router is.

    Returns ``{"scan_type", "saturation", "ambiguous"}``. ``ambiguous`` is True
    when the image sits close to the colour-photo vs radiograph boundary.
    """
    try:
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            logger.warning("image_router: could not decode image, defaulting to fracture")
            return {"scan_type": "fracture", "saturation": None, "ambiguous": False}

        saturation = float(np.mean(cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[:, :, 1]))
        return {
            "scan_type": _classify(img, file_bytes),
            "saturation": round(saturation, 1),
            "ambiguous": AMBIGUOUS_SATURATION_MIN <= saturation <= AMBIGUOUS_SATURATION_MAX,
        }
    except Exception as exc:
        logger.warning(f"image_router: classification failed ({exc}), defaulting to fracture")
        return {"scan_type": "fracture", "saturation": None, "ambiguous": False}


def _classify(img: np.ndarray, file_bytes: bytes) -> str:
    """Core classification logic on a decoded BGR image."""
    h, w = img.shape[:2]

    # ── Step 1: Colour photo vs Grayscale X-ray ─────────────────────
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    mean_saturation = float(np.mean(hsv[:, :, 1]))

    if mean_saturation > 40:
        logger.info(f"image_router: colour photo detected (sat={mean_saturation:.1f}) → wound")
        return "wound"

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # ── Step 2: Metallic Hardware Check ─────────────────────────────
    # A compact, solid bright blob (screw/plate/rod), not just "some pixels
    # are near-white" — that alone fires on any bright/high-contrast bone.
    from app.services.image_preprocess import detect_metallic_hardware

    if detect_metallic_hardware(gray):
        logger.info("image_router: metallic surgical hardware detected → fracture")
        return "fracture"

    # ── Step 3: Anatomical Body Width Ratio ─────────────────────────
    # Measure what fraction of image columns contain non-void tissue (gray > 25)
    # Ignore text annotations by checking columns with tissue height > 20% of image height
    col_has_tissue = np.sum(gray > 25, axis=0) > (h * 0.20)
    body_width_cols = int(np.sum(col_has_tissue))
    body_width_ratio = body_width_cols / float(w)

    # In extremity X-rays (wrist, arm, leg), the limb is a central strip (ratio < 0.68).
    # In chest X-rays, the chest fills 75% to 98% of the image width.
    if body_width_ratio < 0.68:
        logger.info(
            f"image_router: central limb strip detected (body_width_ratio={body_width_ratio:.2f} < 0.68) → fracture"
        )
        return "fracture"

    # ── Step 4: True Aspect Ratio (excluding black side padding) ─────
    valid_cols = np.where(col_has_tissue)[0]
    if len(valid_cols) > 0:
        xmin, xmax = valid_cols[0], valid_cols[-1]
        crop_w = max(xmax - xmin + 1, 10)
    else:
        crop_w = w

    row_has_tissue = np.sum(gray > 25, axis=1) > (w * 0.20)
    valid_rows = np.where(row_has_tissue)[0]
    if len(valid_rows) > 0:
        ymin, ymax = valid_rows[0], valid_rows[-1]
        crop_h = max(ymax - ymin + 1, 10)
    else:
        crop_h = h

    true_aspect = crop_w / crop_h

    if true_aspect < 0.70:
        logger.info(f"image_router: portrait radiograph (true_aspect={true_aspect:.2f}) → fracture")
        return "fracture"

    # ── Step 5: Lung Field & Parenchyma Check for Wide Films ────────
    # In a chest X-ray, the lung fields (upper-left & upper-right) contain
    # lung parenchyma (gray values between 35 and 110, NOT empty black void < 20).
    ch, cw = gray.shape[:2]
    left_lung_roi = gray[int(ch * 0.25):int(ch * 0.55), int(cw * 0.18):int(cw * 0.38)]
    right_lung_roi = gray[int(ch * 0.25):int(ch * 0.55), int(cw * 0.62):int(cw * 0.82)]
    center_roi = gray[int(ch * 0.25):int(ch * 0.55), int(cw * 0.40):int(cw * 0.60)]

    left_mean = float(np.mean(left_lung_roi)) if left_lung_roi.size > 0 else 0.0
    right_mean = float(np.mean(right_lung_roi)) if right_lung_roi.size > 0 else 0.0
    center_mean = float(np.mean(center_roi)) if center_roi.size > 0 else 0.0

    # Genuine lung fields are in the 35-110 range. Void background is < 20.
    left_is_lung = 35 <= left_mean <= 110
    right_is_lung = 35 <= right_mean <= 110
    has_bilateral_lungs = left_is_lung and right_is_lung and (center_mean > max(left_mean, right_mean) + 15)

    logger.info(
        f"image_router: true_aspect={true_aspect:.2f} body_width_ratio={body_width_ratio:.2f} "
        f"left_mean={left_mean:.1f} right_mean={right_mean:.1f} center={center_mean:.1f} "
        f"bilateral_lungs={has_bilateral_lungs}"
    )

    if has_bilateral_lungs and true_aspect >= 0.72:
        return "chest"

    return "fracture"

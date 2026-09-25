# 🩻 XRayVision AI — Client Issues & Action Plan Tracker

> **Project:** XRayVision AI (X-Ray Vision Board)  
> **Created:** 2026-09-12  
> **Status:** ✅ Phase 1 Code & Gating Logic Fully Complete  

---

## 📋 Client Issues & Fixes Summary

| Issue # | Problem Reported | Root Cause | Implementation / Fix |
| :--- | :--- | :--- | :--- |
| **Issue 1** | Model healed/old injury & metal rods ko active fracture (98%/93%) bata raha hai | HF classifier (`prithivMLmods/Bone-Fracture-Detection`) triggered high confidence on metal implants | Added **Hardware Gating**: when YOLO/hardware detection detects metal/implants/healed site, HF classifier findings are reclassified to `"Prior Fracture Site — Surgical Implants Present"` (ICD-10 Z96.6, Low Severity). |
| **Issue 2** | Bounding box poori X-ray par bara box bana raha hai | Anchor noise (>35% area) | Added `MAX_BBOX_AREA_PERCENT = 35.0` filtering in `fracture_model.py`. |
| **Issue 3** | Padded wrist images `CHEST` route par misclassify ho kar Pneumonia dikha rahi thi | Outer dimensions (1:1 padded) fooled simple ratio checks | Added **Padding Stripping** (`gray > 20` bounding rect) + **Anatomical Lung Pocket Check** in `image_router.py`. Portrait radiographs (`aspect < 0.70`) instantly route to `FRACTURE`. |

---

## 🛠️ Summary of Latest Fixes Applied

1. **`backend/app/services/image_router.py`**:
   - Strips black background padding (`cv2.boundingRect` on non-zero pixels) before calculating aspect ratio.
   - Any portrait radiograph (`aspect < 0.70`) routes directly to `"fracture"`.
   - Verifies bilateral dark lung pockets for wide chest scans.

2. **`backend/app/routers/analyze.py`**:
   - Checks if surgical hardware, metallic implants, or healed sites are present.
   - When hardware is present, unlocalized HF classifier findings (`"Fracture suspected"`) are automatically reclassified to **`"Prior Fracture Site — Surgical Implants Present"`** (ICD-10 `Z96.6`, Severity: `Low`).
   - Prevents 93%+ false positive fracture alerts on post-surgical / healed images.

3. **`backend/app/services/fracture_model.py`**:
   - Lowered hardware detection cutoff to `0.20` to ensure screws and metal plates are always captured.
   - Overlap threshold set to `0.15` IoU for reliable healed site reclassification.

4. **`backend/app/services/openrouter_agent.py`**:
   - Updated LLM synthesis rules to report surgical implants as low/medium urgency post-surgical findings without active fracture dislocation.

---

*Last updated: 2026-09-12*

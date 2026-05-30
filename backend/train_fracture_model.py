"""
YOLOv8 Fracture Detection — Fine-Tuning Script
================================================
Dataset: GRAZPEDWRI-DX (recommended, already in YOLO format)
  https://www.kaggle.com/datasets/kmader/grazpedwri-dx

Alternative datasets:
  FracAtlas:      https://huggingface.co/datasets/FracAtlas/FracAtlas
  MURA (Stanford): https://stanfordmlgroup.github.io/competitions/mura/

Setup:
  pip install ultralytics kaggle

Download GRAZPEDWRI-DX from Kaggle:
  1. Get your API token from https://www.kaggle.com/settings → API → Create Token
  2. Place kaggle.json in ~/.kaggle/
  3. Run: kaggle datasets download -d kmader/grazpedwri-dx -p data/grazpedwri-dx --unzip

Usage:
  python train_fracture_model.py --dataset data/grazpedwri-dx --epochs 100
  python train_fracture_model.py --dataset data/grazpedwri-dx --epochs 50 --model yolov8s.pt

After training, copy the best weights:
  cp runs/fracture/train/weights/best.pt models/fracture_yolov8.pt

Then update backend/.env:
  YOLO_WEIGHTS_PATH=models/fracture_yolov8.pt
  ALLOW_GENERIC_YOLO_WEIGHTS=false
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path


# ── Dataset YAML generation ──────────────────────────────────────────

def build_dataset_yaml(dataset_path: str, output_path: str = "fracture_dataset.yaml") -> str:
    """Create a YOLO dataset config pointing to the local dataset."""
    dataset = Path(dataset_path).resolve()

    # GRAZPEDWRI-DX ships with train/ and valid/ splits
    train_path = dataset / "images" / "train"
    val_path = dataset / "images" / "valid"

    if not train_path.exists():
        # Try flat structure
        train_path = dataset / "train" / "images"
        val_path = dataset / "valid" / "images"

    if not train_path.exists():
        print(f"[WARN] Expected train images at {train_path} — verify dataset structure.")

    yaml_content = f"""# GRAZPEDWRI-DX Fracture Detection Dataset
# https://www.kaggle.com/datasets/kmader/grazpedwri-dx
path: {str(dataset)}

train: images/train
val:   images/valid

# Classes — GRAZPEDWRI-DX classes
nc: 10
names:
  0: boneanomaly
  1: bonelesion
  2: foreignbody
  3: fracture
  4: metal
  5: periostealreaction
  6: pronationsign
  7: softtissue
  8: text
  9: hardware

# Notes:
# The primary class of interest is 'fracture' (index 3).
# During inference, XRayVision AI reports any detected class
# that relates to bone damage.
"""

    with open(output_path, "w") as f:
        f.write(yaml_content)

    print(f"[OK] Dataset YAML written to: {output_path}")
    return output_path


# ── Training ─────────────────────────────────────────────────────────

def train(
    dataset_yaml: str,
    base_model: str = "yolov8n.pt",
    epochs: int = 100,
    batch: int = 16,
    imgsz: int = 640,
    project: str = "runs/fracture",
    name: str = "train",
    device: str = "0",   # GPU 0; use "cpu" for CPU-only
) -> Path:
    """Fine-tune YOLOv8 on the fracture dataset."""
    try:
        from ultralytics import YOLO
    except ImportError:
        sys.exit("ultralytics not installed. Run: pip install ultralytics")

    print(f"\n{'='*60}")
    print(f"  XRayVision AI — YOLOv8 Fracture Fine-Tuning")
    print(f"{'='*60}")
    print(f"  Base model : {base_model}")
    print(f"  Dataset    : {dataset_yaml}")
    print(f"  Epochs     : {epochs}")
    print(f"  Batch size : {batch}")
    print(f"  Image size : {imgsz}px")
    print(f"  Device     : {device}")
    print(f"{'='*60}\n")

    model = YOLO(base_model)

    results = model.train(
        data=dataset_yaml,
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        project=project,
        name=name,
        device=device,
        # Medical imaging — use slower, more accurate augmentations
        augment=True,
        hsv_h=0.0,          # X-rays are grayscale, skip hue shift
        hsv_s=0.0,          # Skip saturation shift
        hsv_v=0.4,          # Vary brightness (simulates exposure differences)
        degrees=10.0,        # Mild rotation (patient positioning variation)
        translate=0.1,
        scale=0.5,
        shear=0.0,
        flipud=0.0,
        fliplr=0.5,          # Horizontal flip is anatomically valid
        mosaic=0.5,
        # Hyperparameters tuned for medical images
        lr0=0.001,
        lrf=0.01,
        momentum=0.937,
        weight_decay=0.0005,
        warmup_epochs=3.0,
        patience=20,         # Early stopping
        save_period=10,
        val=True,
        plots=True,
        # Class weights to prioritize fracture detection
        cls=0.5,
        box=7.5,
        dfl=1.5,
        verbose=True,
        exist_ok=True,
    )

    best_weights = Path(project) / name / "weights" / "best.pt"
    print(f"\n[DONE] Training complete!")
    print(f"       Best weights: {best_weights.resolve()}")
    print(f"       mAP50: {results.results_dict.get('metrics/mAP50(B)', 'N/A')}")
    print(f"       mAP50-95: {results.results_dict.get('metrics/mAP50-95(B)', 'N/A')}")

    return best_weights


# ── Validation ───────────────────────────────────────────────────────

def validate(weights_path: str, dataset_yaml: str, imgsz: int = 640) -> None:
    """Run validation on the val split and print metrics."""
    from ultralytics import YOLO

    print(f"\n[INFO] Validating {weights_path} ...")
    model = YOLO(weights_path)
    metrics = model.val(data=dataset_yaml, imgsz=imgsz)

    print(f"\n[RESULTS]")
    print(f"  mAP50     : {metrics.box.map50:.4f}")
    print(f"  mAP50-95  : {metrics.box.map:.4f}")
    print(f"  Precision : {metrics.box.mp:.4f}")
    print(f"  Recall    : {metrics.box.mr:.4f}")

    print("\n[Per-class]")
    for i, name in enumerate(metrics.names.values()):
        ap = metrics.box.ap[i] if i < len(metrics.box.ap) else 0
        print(f"  {name:<30} AP50={ap:.4f}")


# ── Deploy helpers ────────────────────────────────────────────────────

def deploy(best_weights: str, target: str = "models/fracture_yolov8.pt") -> None:
    """Copy best weights to the backend models/ directory."""
    target_path = Path(target)
    target_path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(best_weights, target_path)
    print(f"\n[DEPLOYED] Weights copied to: {target_path.resolve()}")
    print(f"\nNext steps:")
    print(f"  1. Update backend/.env:")
    print(f"       YOLO_WEIGHTS_PATH=models/fracture_yolov8.pt")
    print(f"       ALLOW_GENERIC_YOLO_WEIGHTS=false")
    print(f"  2. Restart the FastAPI server.")


# ── CLI ───────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fine-tune YOLOv8 for fracture detection (XRayVision AI FYP)"
    )
    parser.add_argument("--dataset", required=True, help="Path to GRAZPEDWRI-DX dataset root")
    parser.add_argument("--model",   default="yolov8n.pt", help="Base YOLO model (yolov8n/s/m/l/x.pt)")
    parser.add_argument("--epochs",  type=int, default=100)
    parser.add_argument("--batch",   type=int, default=16)
    parser.add_argument("--imgsz",   type=int, default=640)
    parser.add_argument("--device",  default="0", help="GPU id (0,1,...) or 'cpu'")
    parser.add_argument("--validate-only", metavar="WEIGHTS", default=None,
                        help="Skip training and only validate existing weights")
    parser.add_argument("--deploy",  action="store_true",
                        help="Copy best.pt to models/fracture_yolov8.pt after training")
    args = parser.parse_args()

    yaml_path = build_dataset_yaml(args.dataset)

    if args.validate_only:
        validate(args.validate_only, yaml_path, args.imgsz)
        return

    best = train(
        dataset_yaml=yaml_path,
        base_model=args.model,
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device,
    )

    validate(str(best), yaml_path, args.imgsz)

    if args.deploy:
        deploy(str(best))


if __name__ == "__main__":
    main()

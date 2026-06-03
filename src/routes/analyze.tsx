import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bone,
  CheckCircle2,
  FileImage,
  Info,
  Loader2,
  ScanLine,
  Stethoscope,
  UploadCloud,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Field } from "@/components/ui-x/Field";
import { useAnalyze } from "@/hooks/use-analyze";

export const Route = createFileRoute("/analyze")({
  head: () => ({ meta: [{ title: "New Analysis - XRayVision AI" }] }),
  component: AnalyzePage,
});

const MIN_FILE_SIZE = 100 * 1024; // 100 KB — smaller images lack enough pixel data for reliable inference
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const MIN_DIMENSION = 200; // px per side
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".dcm"];

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Cannot read image dimensions."));
    };
    img.src = url;
  });
}

async function validateImageFile(file: File): Promise<string | null> {
  const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
  const isDicom = ext === ".dcm";

  if (!isDicom && !ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
    return "Unsupported format. Upload a JPEG, PNG, or DICOM (.dcm) file.";
  }

  if (file.size < MIN_FILE_SIZE) {
    return `File is too small (${(file.size / 1024).toFixed(0)} KB). Minimum is 100 KB — very small files lack enough pixel data for accurate inference.`;
  }

  if (file.size > MAX_FILE_SIZE) {
    return `File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 20 MB.`;
  }

  if (!isDicom) {
    try {
      const { width, height } = await getImageDimensions(file);
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        return `Image resolution is too low (${width}×${height} px). Minimum is ${MIN_DIMENSION}×${MIN_DIMENSION} px — low-resolution images produce unreliable results.`;
      }
    } catch {
      return "Could not verify image dimensions. Make sure the file is a valid image.";
    }
  }

  return null;
}

const types = [
  { id: "chest", label: "Chest pathology", icon: Stethoscope, model: "DenseNet121", text: "Chest X-ray screening for common pathology signals." },
  { id: "fracture", label: "Fracture detection", icon: Bone, model: "YOLOv8", text: "Bone X-ray localization with bounding boxes." },
  { id: "wound", label: "External wound", icon: Activity, model: "ViT", text: "Photo classification for external wound categories." },
] as const;

function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [type, setType] = useState<(typeof types)[number]["id"]>("chest");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const analyzeMutation = useAnalyze();

  const acceptFile = useCallback(async (candidate: File) => {
    setFileError(null);
    const error = await validateImageFile(candidate);
    if (error) {
      setFileError(error);
      setFile(null);
      return;
    }
    setFile(candidate);
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDrag(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) acceptFile(droppedFile);
  }, [acceptFile]);

  const onPick = (pickedFile: File | undefined | null) => {
    if (pickedFile) acceptFile(pickedFile);
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    analyzeMutation.mutate(
      { file, scanType: type, sessionLabel: label || undefined, notes: notes || undefined },
      {
        onSuccess: (result) => {
          navigate({ to: "/results/$scanId", params: { scanId: result.id } });
        },
      },
    );
  };

  if (analyzeMutation.isPending) return <Processing />;

  if (analyzeMutation.isError) {
    return (
      <AppShell title="Analysis Error">
        <div className="mx-auto max-w-2xl clinical-panel-strong p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle size={26} />
          </div>
          <h2 className="mt-4 font-display text-2xl font-extrabold">Analysis failed</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{analyzeMutation.error.message}</p>
          <button onClick={() => analyzeMutation.reset()} className="clinical-button mt-6 px-6">
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  const activeType = types.find((item) => item.id === type)!;

  return (
    <AppShell title="New Analysis">
      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <aside className="clinical-panel-strong h-fit p-6">
          <p className="clinical-kicker">Image intake</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">Prepare a routed AI analysis.</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Choose the scan type carefully. Each route runs a dedicated model so the report stays clinically focused.
          </p>

          <div className="mt-6 space-y-3">
            {types.map((item, index) => (
              <div key={item.id} className="flex gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[11px] font-bold text-primary">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-bold">{item.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <form onSubmit={onSubmit} className="clinical-panel p-5 sm:p-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.dcm"
            className="hidden"
            onChange={(event) => onPick(event.target.files?.[0])}
          />

          <div>
            <p className="clinical-kicker">Step 1</p>
            <h3 className="mt-2 text-xl font-extrabold">Upload image</h3>
          </div>

          {!file ? (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 text-center transition-all ${
                  fileError
                    ? "border-destructive/60 bg-destructive/4"
                    : drag
                    ? "border-primary bg-primary/6 shadow-[var(--glow-cyan)]"
                    : "border-border bg-surface/55 hover:border-primary/45 hover:bg-card"
                }`}
              >
                <span className={`flex h-16 w-16 items-center justify-center rounded-lg ${fileError ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
                  <UploadCloud size={30} />
                </span>
                <span className="mt-5 text-lg font-extrabold">{drag ? "Drop image to upload" : "Drag and drop your medical image"}</span>
                <span className="mt-1 text-sm text-muted-foreground">or browse files from your device</span>
                <span className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  DICOM / PNG / JPG &nbsp;·&nbsp; Min 200×200 px &nbsp;·&nbsp; 100 KB – 20 MB
                </span>
              </button>

              {fileError && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-lg border border-border bg-surface/55 px-4 py-3 text-xs text-muted-foreground">
                <Info size={14} className="mt-0.5 shrink-0 text-primary/70" />
                <span>
                  <strong className="text-foreground">Image quality matters.</strong> Use clear, well-lit, non-blurry images at least 512×512 px for best accuracy.
                  Very small or low-quality images can cause incorrect predictions.
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/30 bg-primary/6 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
                    <FileImage size={22} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{file.name}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB &nbsp;·&nbsp; ready
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <button type="button" onClick={() => { setFile(null); setFileError(null); }} aria-label="Remove file" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface hover:text-destructive">
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-7">
            <p className="clinical-kicker">Step 2</p>
            <h3 className="mt-2 text-xl font-extrabold">Analysis route</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {types.map((item) => {
                const Icon = item.icon;
                const active = type === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setType(item.id)}
                    className={`min-h-[150px] rounded-lg border p-4 text-left transition-all ${
                      active ? "border-primary bg-primary text-primary-foreground shadow-[var(--glow-cyan)]" : "border-border bg-card text-card-foreground hover:border-primary/40 hover:bg-accent/30"
                    }`}
                  >
                    <Icon size={20} />
                    <p className="mt-4 text-sm font-extrabold">{item.label}</p>
                    <p className={`mt-1 font-mono text-[10px] uppercase tracking-[0.1em] ${active ? "text-primary-foreground/78" : "text-muted-foreground"}`}>
                      {item.model}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7">
            <p className="clinical-kicker">Step 3</p>
            <h3 className="mt-2 text-xl font-extrabold">Context</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Patient / session label" name="label" placeholder="PT-4821" value={label} onChange={(event) => setLabel(event.target.value)} />
              <Field label="Notes for AI agent" name="notes" placeholder="Pain after fall; swelling near wrist" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 rounded-lg border border-border bg-surface/55 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-primary">
                <activeType.icon size={18} />
              </span>
              <div>
                <p className="text-sm font-bold">{activeType.label}</p>
                <p className="text-xs text-muted-foreground">{activeType.model} route selected</p>
              </div>
            </div>
            <button type="submit" disabled={!file} className="clinical-button px-6 disabled:cursor-not-allowed disabled:opacity-45">
              <ScanLine size={17} />
              Analyze image
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

const processingSteps = [
  "Normalizing and preparing the image",
  "Selecting the routed vision model",
  "Running model inference",
  "Generating clinical synthesis",
  "Saving report and export metadata",
];

function Processing() {
  return (
    <AppShell title="Processing">
      <div className="mx-auto max-w-4xl">
        <header className="clinical-panel-strong p-6 text-center">
          <p className="clinical-kicker">Analyzing</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">AI models are processing your scan</h2>
          <p className="mt-2 text-sm text-muted-foreground">This can take longer the first time while models finish loading.</p>
        </header>

        <div className="relative mt-5 overflow-hidden rounded-lg border border-border bg-slate-950 aspect-video">
          <div className="absolute inset-0 grid-bg opacity-25" />
          <div className="scan-line" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-cyan-100 backdrop-blur-md">
              <Loader2 size={28} className="animate-spin" />
            </div>
          </div>
        </div>

        <ul className="mt-5 grid gap-3 md:grid-cols-2" aria-live="polite">
          {processingSteps.map((step) => (
            <li key={step} className="clinical-panel flex items-center gap-3 p-4 text-sm">
              <Loader2 size={16} className="shrink-0 animate-spin text-primary" />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

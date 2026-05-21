import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useRef } from "react";
import { UploadCloud, FileImage, X, Loader2, ScanLine, Stethoscope, Bone, Activity, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Field } from "@/components/ui-x/Field";
import { useAnalyze } from "@/hooks/use-analyze";

export const Route = createFileRoute("/analyze")({
  head: () => ({ meta: [{ title: "New Analysis — XRayVision AI" }] }),
  component: AnalyzePage,
});

const types = [
  { id: "chest", label: "Chest Pathology", icon: Stethoscope, model: "DenseNet121" },
  { id: "fracture", label: "Fracture Detection", icon: Bone, model: "YOLOv8" },
  { id: "wound", label: "External Wound", icon: Activity, model: "ViT" },
] as const;

function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [type, setType] = useState<(typeof types)[number]["id"]>("chest");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const analyzeMutation = useAnalyze();

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  const onPick = (f: File | undefined | null) => f && setFile(f);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle size={28} />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold">Analysis Failed</h2>
          <p className="mt-2 text-sm text-muted-foreground">{analyzeMutation.error.message}</p>
          <button
            onClick={() => analyzeMutation.reset()}
            className="mt-6 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]"
          >
            Try Again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="New Analysis">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Step 1 of 3</p>
          <h2 className="mt-1 font-display text-3xl font-bold">Upload an image for analysis</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">DICOM, PNG, or JPG. Max 20MB.</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-8">
          {/* Step 1 — Drop zone */}
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.dcm"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
            {!file ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={onDrop}
                className={`group relative flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed py-16 text-center transition-all ${
                  drag
                    ? "border-primary bg-primary/5 shadow-[var(--glow-cyan)]"
                    : "border-border bg-card/40 hover:border-primary/50 hover:bg-card/60"
                }`}
              >
                <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform ${drag ? "scale-110" : "group-hover:scale-105"}`}>
                  <UploadCloud size={28} />
                </div>
                <p className="mt-5 font-display text-lg font-semibold">
                  {drag ? "Drop to upload" : "Drag & drop your X-ray image"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or <span className="text-primary">browse files</span>
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  DICOM · PNG · JPG · Max 20MB
                </p>
              </button>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <FileImage size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB · ready
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setFile(null)} aria-label="Remove file" className="text-muted-foreground hover:text-destructive">
                  <X size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Step 2 — Config */}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Step 2 of 3 — Analysis type</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {types.map((t) => {
                const Icon = t.icon;
                const active = type === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`group rounded-xl border p-4 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/10 shadow-[var(--glow-cyan)]"
                        : "border-border bg-card/60 hover:border-primary/40"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-primary/20 text-primary" : "bg-background/60 text-muted-foreground"}`}>
                      <Icon size={16} />
                    </div>
                    <p className={`mt-3 text-sm font-semibold ${active ? "text-foreground" : "text-foreground"}`}>{t.label}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t.model}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Patient / Session Label (optional)" name="label" placeholder="PT-4821" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Field label="Notes for AI Agent (optional)" name="notes" placeholder="Patient reports chest tightness…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Step 3 — Submit */}
          <button
            type="submit"
            disabled={!file}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-cyan)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ScanLine size={18} /> Analyze Image
          </button>
        </form>
      </div>
    </AppShell>
  );
}

const processingSteps = [
  "Preprocessing image (normalization, contrast boost)",
  "Running DenseNet121 — chest pathology",
  "Running YOLOv8 — fracture detection",
  "Running ViT — wound classification",
  "Synthesizing report with Gemini 1.5 Flash",
];

function Processing() {
  return (
    <AppShell title="Processing">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Analyzing</p>
          <h2 className="mt-1 font-display text-3xl font-bold">AI models are processing your scan</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">This may take 10–30 seconds depending on model load time…</p>
        </header>

        <div className="relative overflow-hidden rounded-2xl border border-border bg-black aspect-video" style={{ boxShadow: "var(--glow-cyan)" }}>
          <div className="absolute inset-0 grid-bg opacity-40" />
          <div className="scan-line" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
              <Loader2 size={26} className="animate-spin" />
            </div>
          </div>
        </div>

        <ul className="mt-6 space-y-3" aria-live="polite">
          {processingSteps.map((s) => (
            <li key={s} className="flex items-center gap-3 rounded-lg border border-border bg-card/60 px-4 py-3 text-sm">
              <Loader2 size={16} className="shrink-0 animate-spin text-primary" />
              <span className="text-foreground">{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

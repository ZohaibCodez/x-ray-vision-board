import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Share2, Sparkles, AlertTriangle, ZoomIn, ZoomOut, RotateCcw, Eye, Layers, Tag, Loader2, MapPin } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useScan } from "@/hooks/use-scans";
import type { Finding as FindingType } from "@/lib/types";

export const Route = createFileRoute("/results/$scanId")({
  head: () => ({ meta: [{ title: "Results — XRayVision AI" }] }),
  component: ResultsPage,
});

function ResultsPage() {
  const { scanId } = Route.useParams();
  const { data: scan, isLoading, error } = useScan(scanId);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(1);

  if (isLoading) {
    return (
      <AppShell title="Loading Results">
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !scan) {
    return (
      <AppShell title="Error">
        <div className="mx-auto max-w-md text-center py-32">
          <AlertTriangle size={32} className="mx-auto text-destructive" />
          <h2 className="mt-4 font-display text-2xl font-bold">Scan Not Found</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error?.message || "This scan could not be loaded."}</p>
          <Link to="/history" className="mt-6 inline-block text-sm text-primary hover:underline">← Back to history</Link>
        </div>
      </AppShell>
    );
  }

  const findings = scan.findings || [];
  const agent = scan.agent_synthesis;
  const lowConf = findings.some((f) => f.confidence < 60);

  return (
    <AppShell title="Diagnostic Results">
      <div className="grid gap-6 lg:grid-cols-[45fr_55fr]">
        {/* Image viewer */}
        <section className="rounded-2xl border border-border bg-card p-4" style={{ background: "var(--gradient-card)" }}>
          <header className="mb-3 flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">Diagnostic Image</h2>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">{scan.scan_type}</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{scan.created_at}</span>
          </header>

          <div className="relative overflow-hidden rounded-xl bg-black">
            <div className="relative aspect-square" style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 200ms" }}>
              {scan.image_url ? (
                <img src={scan.image_url} alt={`X-ray scan ${scanId}`} className="h-full w-full object-contain opacity-95" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <span className="font-mono text-xs">No image available</span>
                </div>
              )}
              {showHeatmap && (
                <div
                  className="pointer-events-none absolute inset-0 mix-blend-screen"
                  style={{
                    background: "radial-gradient(circle at 42% 47%, rgba(255,71,87,0.45), transparent 30%), radial-gradient(circle at 68% 61%, rgba(255,181,71,0.4), transparent 25%)",
                  }}
                />
              )}
              {showBoxes &&
                findings.filter(f => f.bbox).map((f, i) => (
                  <div
                    key={f.name + i}
                    aria-label={`${f.name}, ${f.confidence}% confidence`}
                    className={`group absolute border-2 border-dashed animate-fade-up ${
                      f.color === "destructive" ? "border-destructive" : f.color === "warning" ? "border-warning" : "border-info"
                    }`}
                    style={{
                      left: `${f.bbox!.x}%`, top: `${f.bbox!.y}%`,
                      width: `${f.bbox!.w}%`, height: `${f.bbox!.h}%`,
                      animationDelay: `${i * 100}ms`,
                    }}
                  >
                    {showLabels && (
                      <span
                        className={`absolute -top-6 left-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-background ${
                          f.color === "destructive" ? "bg-destructive" : f.color === "warning" ? "bg-warning" : "bg-info"
                        }`}
                      >
                        {f.name} · {f.confidence.toFixed(1)}%
                      </span>
                    )}
                  </div>
                ))}
              <div className="pointer-events-none absolute inset-0 overflow-hidden"><div className="scan-line" /></div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ToolbarBtn active={showBoxes} onClick={() => setShowBoxes((v) => !v)} icon={<Eye size={14} />} label="AI Findings" />
            <ToolbarBtn active={showHeatmap} onClick={() => setShowHeatmap((v) => !v)} icon={<Layers size={14} />} label="Heatmap" />
            <ToolbarBtn active={showLabels} onClick={() => setShowLabels((v) => !v)} icon={<Tag size={14} />} label="Labels" />
            <div className="ml-auto flex items-center gap-1">
              <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))} className="rounded-md border border-border bg-background/60 p-2 text-muted-foreground hover:text-foreground"><ZoomIn size={14} /></button>
              <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="rounded-md border border-border bg-background/60 p-2 text-muted-foreground hover:text-foreground"><ZoomOut size={14} /></button>
              <button aria-label="Reset zoom" onClick={() => setZoom(1)} className="rounded-md border border-border bg-background/60 p-2 text-muted-foreground hover:text-foreground"><RotateCcw size={14} /></button>
            </div>
          </div>
        </section>

        {/* Report */}
        <section className="rounded-2xl border border-border bg-card p-6" style={{ background: "var(--gradient-card)" }}>
          <div className="flex items-center justify-between rounded-lg border-l-4 border-warning bg-warning/10 px-4 py-3" role="alert">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-warning" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-warning">Urgency</p>
                <p className="font-display text-lg font-bold text-warning">{agent.urgency.toUpperCase()}</p>
              </div>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground">{scanId}</p>
          </div>

          {lowConf && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/30 bg-info/10 p-3 text-xs text-info">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>One or more findings have confidence below 60% — radiologist review recommended.</span>
            </div>
          )}

          <h3 className="mt-6 text-sm font-semibold text-muted-foreground">Primary Findings</h3>
          <div className="mt-3 space-y-3">
            {findings.map((f, i) => (
              <FindingCard key={f.name + i} f={f} delay={i * 80} />
            ))}
            {findings.length === 0 && (
              <p className="text-sm text-muted-foreground">No significant findings detected.</p>
            )}
          </div>

          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Gemini Agent Analysis</span>
            </div>
            <Typewriter text={agent.synthesis_text} className="mt-2 text-sm leading-relaxed text-foreground" />
          </div>

          {agent.recommended_actions.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-semibold text-muted-foreground">Immediate Actions</h3>
              <ol className="mt-3 space-y-2">
                {agent.recommended_actions.map((a, i) => (
                  <li key={a} className="flex items-start gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[11px] text-primary">{i + 1}</span>
                    <span className="text-foreground">{a}</span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {agent.specialist && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-info/30 bg-info/10 px-4 py-3 text-sm text-info">
              <MapPin size={14} />
              <span>Recommended specialist: <strong>{agent.specialist}</strong></span>
              <a
                href={`https://www.google.com/maps/search/${encodeURIComponent(agent.specialist + " near me")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs underline"
              >
                Find nearby →
              </a>
            </div>
          )}

          <h3 className="mt-6 text-sm font-semibold text-muted-foreground">Confidence Summary</h3>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-background/60 text-left font-mono uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Finding</th>
                  <th className="px-3 py-2">Confidence</th>
                  <th className="px-3 py-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f, i) => (
                  <tr key={f.name + i} className="border-t border-border">
                    <td className="px-3 py-2 font-mono text-muted-foreground">{f.model}</td>
                    <td className="px-3 py-2">{f.name}</td>
                    <td className="px-3 py-2 font-mono">{f.confidence.toFixed(1)}%</td>
                    <td className={`px-3 py-2 font-medium ${f.color === "destructive" ? "text-destructive" : f.color === "warning" ? "text-warning" : f.color === "success" ? "text-success" : "text-info"}`}>{f.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]">
              <Download size={14} /> Download PDF Report
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-4 py-2.5 text-sm font-medium hover:border-primary/60">
              <Share2 size={14} /> Share / Export
            </button>
            <Link to="/history" className="ml-auto self-center text-xs text-muted-foreground hover:text-foreground">Back to history →</Link>
          </div>

          <p className="mt-6 border-t border-border pt-4 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Educational use only.</span> XRayVision AI is not a licensed medical device.
            All outputs are AI-generated estimations intended to support, not replace, the clinical judgment of a qualified radiologist.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function ToolbarBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function FindingCard({ f, delay }: { f: FindingType; delay: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf: number;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start - delay) / 800);
      if (p > 0) setVal(f.confidence * p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [f.confidence, delay]);

  const sevDot = f.color === "destructive" ? "bg-destructive" : f.color === "warning" ? "bg-warning" : "bg-info";
  const sevText = f.color === "destructive" ? "text-destructive" : f.color === "warning" ? "text-warning" : "text-info";

  return (
    <div className="rounded-lg border border-border bg-background/60 p-4 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${sevDot}`} />
          <span className="text-sm font-semibold">{f.name}</span>
        </div>
        <span className={`rounded-full bg-card px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${sevText}`}>{f.severity}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary" style={{ width: `${val}%`, boxShadow: "0 0 8px rgba(0,200,224,0.6)" }} />
        </div>
        <span className="font-mono text-xs text-foreground">{val.toFixed(1)}%</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{f.model}</span><span className="text-border">·</span>
        <span>{f.region || "—"}</span><span className="text-border">·</span>
        <span>ICD-10 {f.icd_code || "—"}</span>
      </div>
    </div>
  );
}

function Typewriter({ text, className }: { text: string; className?: string }) {
  const [out, setOut] = useState("");
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOut(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 12);
    return () => clearInterval(id);
  }, [text]);
  return <p className={className}>{out}<span className="inline-block h-3.5 w-0.5 translate-y-0.5 bg-primary glow-pulse" /></p>;
}

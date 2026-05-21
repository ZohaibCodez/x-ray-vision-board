import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Globe, Palette, Brain, Save } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — XRayVision AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [lang, setLang] = useState("English (US)");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");
  const [autoHeatmap, setAutoHeatmap] = useState(false);
  const [threshold, setThreshold] = useState(60);

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-3xl space-y-6">
        <Section title="Region & Language" icon={<Globe size={14} />}>
          <Row label="Language">
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="rounded-md border border-border bg-background/60 px-3 py-2 text-sm focus:border-primary focus:outline-none">
              <option>English (US)</option><option>English (UK)</option><option>Español</option><option>Français</option><option>Deutsch</option>
            </select>
          </Row>
          <Row label="Units">
            <div className="flex gap-1 rounded-md border border-border bg-background/60 p-1">
              {(["metric", "imperial"] as const).map((u) => (
                <button key={u} onClick={() => setUnits(u)} className={`rounded px-3 py-1.5 text-xs font-medium capitalize ${units === u ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {u}
                </button>
              ))}
            </div>
          </Row>
        </Section>

        <Section title="Appearance" icon={<Palette size={14} />}>
          <Row label="Theme">
            <span className="rounded-md bg-primary/10 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-primary">Clinical Dark</span>
          </Row>
          <Row label="Reduced motion">
            <span className="text-xs text-muted-foreground">Honors OS preference automatically</span>
          </Row>
        </Section>

        <Section title="AI Behavior" icon={<Brain size={14} />}>
          <Row label="Show heatmap by default">
            <input type="checkbox" checked={autoHeatmap} onChange={(e) => setAutoHeatmap(e.target.checked)} className="h-4 w-4 accent-[--primary]" />
          </Row>
          <div className="border-t border-border py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Low-confidence threshold</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Flag findings below this confidence</p>
              </div>
              <span className="font-mono text-sm text-primary">{threshold}%</span>
            </div>
            <input
              type="range" min={30} max={90} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))}
              className="mt-3 w-full accent-[--primary]"
            />
          </div>
        </Section>

        <button className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]">
          <Save size={14} /> Save preferences
        </button>
      </div>
    </AppShell>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6" style={{ background: "var(--gradient-card)" }}>
      <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-4 last:border-b-0 last:pb-0">
      <p className="text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

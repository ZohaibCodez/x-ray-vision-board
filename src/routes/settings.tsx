import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — XRayVision AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [confidence, setConfidence] = useState("40");
  const [notifications, setNotifications] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    setSaving(true);
    // TODO: persist to user settings in Supabase
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppShell title="Settings">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Appearance */}
        <Section title="Appearance">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Theme</label>
            <div className="flex gap-2">
              {[
                { id: "dark", label: "Dark" },
                { id: "light", label: "Light" },
                { id: "system", label: "System" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                    theme === t.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Language</label>
            <div className="flex gap-2">
              {[
                { id: "en", label: "English" },
                { id: "ur", label: "اردو (Urdu)" },
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLanguage(l.id)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                    language === l.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Analysis */}
        <Section title="Analysis Preferences">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Confidence Threshold: {confidence}%
            </label>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={confidence}
              onChange={(e) => setConfidence(e.target.value)}
              className="w-full accent-[--primary]"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>10% (more findings)</span>
              <span>90% (fewer, high-confidence)</span>
            </div>
          </div>

          <Toggle
            label="Show AI detection boxes on images"
            checked={showBoxes}
            onChange={setShowBoxes}
          />
          <Toggle
            label="Show confidence heatmap overlay"
            checked={showHeatmap}
            onChange={setShowHeatmap}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Toggle
            label="Email notifications for critical findings"
            checked={notifications}
            onChange={setNotifications}
          />
        </Section>

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)] disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? "Saved ✓" : "Save Settings"}
        </button>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-5" style={{ background: "var(--gradient-card)" }}>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

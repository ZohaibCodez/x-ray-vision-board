import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Check, Eye, Loader2, Monitor, Moon, Save, SlidersHorizontal, Sun, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { LanguageSwitch } from "@/components/app/LanguageSwitch";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, type StringKey } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings - XRayVision AI" }] }),
  component: SettingsPage,
});

const themeOptions: { id: string; labelKey: StringKey; icon: LucideIcon }[] = [
  { id: "light", labelKey: "settings.theme.light", icon: Sun },
  { id: "dark", labelKey: "settings.theme.dark", icon: Moon },
  { id: "system", labelKey: "settings.theme.system", icon: Monitor },
];

function applyPreviewTheme(theme: string) {
  if (typeof window === "undefined") return;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  localStorage.setItem("xray_theme", theme);
}

function SettingsPage() {
  const { user, updateSettings } = useAuth();
  // Language is owned by the app-wide provider, not by local state — that is
  // what makes the switch apply everywhere instead of only on this page.
  const { lang, dir, t } = useLanguage();
  const savedSettings = user?.settings || {};
  const storedTheme = typeof window !== "undefined" ? localStorage.getItem("xray_theme") : null;
  const [theme, setTheme] = useState(String(savedSettings.theme || storedTheme || "system"));
  const [confidence, setConfidence] = useState(String(savedSettings.confidence || "40"));
  const [notifications, setNotifications] = useState(Boolean(savedSettings.notifications ?? true));
  const [showBoxes, setShowBoxes] = useState(Boolean(savedSettings.showBoxes ?? true));
  const [showHeatmap, setShowHeatmap] = useState(Boolean(savedSettings.showHeatmap ?? true));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    applyPreviewTheme(theme);
  }, [theme]);

  const onSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        theme,
        confidence: Number(confidence),
        notifications,
        showBoxes,
        showHeatmap,
        language: lang,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Settings" titleKey="settings.title">
      <div className="mx-auto max-w-4xl space-y-6" dir={dir}>
        <header className="clinical-panel-strong premium-card p-6">
          <p className="clinical-kicker">{t("settings.kicker")}</p>
          <h2 className="mt-2 font-display text-3xl font-extrabold">{t("settings.heading")}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("settings.intro")}
          </p>
        </header>

        <Section icon={Monitor} title={t("settings.appearance")} description={t("settings.appearanceDesc")}>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.theme")}</label>
            <div className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const active = theme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTheme(option.id)}
                    className={`interaction-lift min-h-24 rounded-lg border p-4 text-left ${
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background/60 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <option.icon size={18} />
                      {active && <Check size={16} />}
                    </div>
                    <p className="mt-4 text-sm font-extrabold">{t(option.labelKey)}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("lang.label")}</label>
            <LanguageSwitch size="md" />
            <p className="mt-2 text-xs text-muted-foreground">{t("settings.languageHelp")}</p>
          </div>
        </Section>

        <Section icon={SlidersHorizontal} title={t("settings.analysis")} description={t("settings.analysisDesc")}>
          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("settings.confidence")}</label>
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 font-mono text-xs text-primary">{confidence}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={confidence}
              onChange={(event) => setConfidence(event.target.value)}
              className="h-10 w-full accent-primary"
            />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{t("settings.moreSensitive")}</span>
              <span>{t("settings.moreConservative")}</span>
            </div>
          </div>

          <Toggle icon={Eye} label={t("settings.showBoxes")} checked={showBoxes} onChange={setShowBoxes} />
          <Toggle icon={Eye} label={t("settings.showHeatmap")} checked={showHeatmap} onChange={setShowHeatmap} />
        </Section>

        <Section icon={Bell} title={t("settings.notifications")} description={t("settings.notificationsDesc")}>
          <Toggle icon={Bell} label={t("settings.emailAlerts")} checked={notifications} onChange={setNotifications} />
        </Section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted-foreground">
            {t("settings.persistNote")}
          </p>
          <button onClick={onSave} disabled={saving} className="clinical-button px-6 disabled:opacity-50">
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
            {saved ? t("settings.saved") : t("settings.save")}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Section({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="clinical-panel premium-card space-y-5 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={18} />
        </span>
        <div>
          <h3 className="font-display text-lg font-bold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({ icon: Icon, label, checked, onChange }: { icon: LucideIcon; label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background/60 px-4">
      <span className="flex items-center gap-3 text-sm font-semibold text-foreground">
        <Icon size={16} className="text-primary" />
        {label}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

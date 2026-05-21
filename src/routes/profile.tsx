import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Edit3, Mail, Shield, Bell, Trash2, KeyRound, Activity } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Field } from "@/components/ui-x/Field";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — XRayVision AI" }] }),
  component: ProfilePage,
});

const usage = [
  { label: "Chest", value: 64 },
  { label: "Fracture", value: 28 },
  { label: "Wound", value: 12 },
];

function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [reportSummary, setReportSummary] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Account info */}
        <Card title="Account Information" icon={<Edit3 size={14} />} action={
          <button onClick={() => setEditing((e) => !e)} className="text-xs text-primary hover:underline">
            {editing ? "Cancel" : "Edit"}
          </button>
        }>
          <div className="flex items-center gap-5">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/15 font-display text-2xl font-bold text-primary">
              DR
            </div>
            {!editing ? (
              <div>
                <p className="font-display text-xl font-bold">Dr. Alex Reyes</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Mail size={12} /> alex.reyes@hospital.org
                </p>
                <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                  Healthcare Professional
                </span>
              </div>
            ) : (
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <Field label="Full name" defaultValue="Dr. Alex Reyes" />
                <Field label="Email" type="email" defaultValue="alex.reyes@hospital.org" />
              </div>
            )}
          </div>
          {editing && (
            <button onClick={() => setEditing(false)} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]">
              Save changes
            </button>
          )}
        </Card>

        {/* Usage */}
        <Card title="Usage Statistics" icon={<Activity size={14} />}>
          <div className="grid gap-6 sm:grid-cols-3">
            <Stat label="Total analyses" value="1,284" />
            <Stat label="Day streak" value="42" />
            <Stat label="This month" value="187" />
          </div>
          <div className="mt-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Most analyzed</p>
            <div className="mt-3 space-y-2">
              {usage.map((u) => (
                <div key={u.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span>{u.label}</span>
                    <span className="font-mono text-muted-foreground">{u.value}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full bg-primary" style={{ width: `${u.value}%`, boxShadow: "0 0 8px rgba(0,200,224,0.5)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card title="Notification Preferences" icon={<Bell size={14} />}>
          <Toggle label="Report summary emails" desc="Get a weekly digest of your scan activity." on={reportSummary} onChange={setReportSummary} />
          <Toggle label="Critical finding alerts" desc="Immediate notification when a critical finding is detected." on={criticalAlerts} onChange={setCriticalAlerts} />
        </Card>

        {/* Security */}
        <Card title="Security" icon={<Shield size={14} />}>
          <button className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-4 text-left transition-colors hover:border-primary/40 w-full">
            <div className="flex items-center gap-3">
              <KeyRound size={16} className="text-primary" />
              <div>
                <p className="text-sm font-medium">Change password</p>
                <p className="text-xs text-muted-foreground">Last updated 28 days ago</p>
              </div>
            </div>
            <span className="text-xs text-primary">→</span>
          </button>
          <div className="mt-3 rounded-lg border border-border bg-background/60 p-4">
            <p className="text-sm font-medium">Active sessions</p>
            <p className="mt-1 text-xs text-muted-foreground">2 active devices · last activity 2 minutes ago</p>
          </div>
        </Card>

        {/* Danger zone */}
        <Card title="Danger Zone" icon={<Trash2 size={14} />} accent="destructive">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated scan history. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDelete(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition-all hover:bg-destructive/20"
          >
            <Trash2 size={14} /> Delete account
          </button>
        </Card>
      </div>

      {showDelete && <DeleteModal onClose={() => setShowDelete(false)} />}
    </AppShell>
  );
}

function Card({ title, icon, children, action, accent }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; accent?: "destructive" }) {
  return (
    <section
      className={`rounded-2xl border p-6 ${accent === "destructive" ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}
      style={accent ? undefined : { background: "var(--gradient-card)" }}
    >
      <header className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <span className={`flex h-6 w-6 items-center justify-center rounded-md ${accent === "destructive" ? "bg-destructive/15 text-destructive" : "bg-primary/15 text-primary"}`}>{icon}</span>
          {title}
        </h3>
        {action}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-bold text-gradient-cyan">{value}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Toggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-b-0 last:pb-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-border"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function DeleteModal({ onClose }: { onClose: () => void }) {
  const [confirm, setConfirm] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-destructive/40 bg-card p-6 shadow-[var(--glow-red)] animate-fade-up">
        <h3 className="font-display text-xl font-bold text-destructive">Delete account?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This will permanently delete your account, scan history, and reports. Type <span className="font-mono text-destructive">DELETE</span> to confirm.
        </p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-4 w-full rounded-md border border-border bg-background py-2 px-3 text-sm focus:border-destructive focus:outline-none"
          placeholder="DELETE"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-background/60">Cancel</button>
          <button
            disabled={confirm !== "DELETE"}
            className="rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
          >
            Permanently delete
          </button>
        </div>
      </div>
    </div>
  );
}

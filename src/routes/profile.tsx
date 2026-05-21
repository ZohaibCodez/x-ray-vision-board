import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { User, Mail, Save, Loader2, ScanLine, AlertTriangle, Target } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useStats } from "@/hooks/use-scans";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — XRayVision AI" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: stats } = useStats();
  const [name, setName] = useState(user?.full_name || "");
  const [role, setRole] = useState(user?.role || "Medical Student");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const onSave = async () => {
    setSaving(true);
    // TODO: wire to profile update API when available
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const initials = user?.full_name
    ? user.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-card p-8" style={{ background: "var(--gradient-card)" }}>
          {/* Avatar + Info */}
          <div className="flex items-center gap-6 pb-6 border-b border-border">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/20 font-display text-2xl font-bold text-primary">
              {initials}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold">{user?.full_name || "User"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "recently"}</p>
            </div>
          </div>

          {/* Form */}
          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Full Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background/60 py-3 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-md border border-border bg-background/40 py-3 pl-9 pr-3 text-sm text-muted-foreground"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-md border border-border bg-background/60 px-3 py-3 text-sm focus:border-primary focus:outline-none"
              >
                <option>Medical Student</option>
                <option>Healthcare Professional</option>
                <option>Researcher</option>
                <option>Other</option>
              </select>
            </div>

            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)] disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? "Saved ✓" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="mt-6 rounded-2xl border border-border bg-card p-6" style={{ background: "var(--gradient-card)" }}>
          <h3 className="font-display text-lg font-bold">Usage Statistics</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatBox icon={ScanLine} label="Total Scans" value={String(stats?.total_scans ?? 0)} color="text-primary" />
            <StatBox icon={AlertTriangle} label="Critical Findings" value={String(stats?.critical_findings ?? 0)} color="text-destructive" />
            <StatBox icon={Target} label="Avg. Confidence" value={`${stats?.avg_confidence ?? 0}%`} color="text-success" />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <h3 className="font-display text-lg font-bold text-destructive">Danger Zone</h3>
          <p className="mt-1 text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
          <button className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20">
            Delete Account
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2">
        <Icon size={14} className={color} />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

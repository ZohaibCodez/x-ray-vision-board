import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, Check, Loader2, Mail, Save, ScanLine, ShieldCheck, Target, User, type LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useAuth } from "@/lib/auth-context";
import { useStats } from "@/hooks/use-scans";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile - XRayVision AI" }] }),
  component: ProfilePage,
});

const roles = ["Medical Student", "Healthcare Professional", "Researcher", "Educator", "Other"];

function ProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const { data: stats, isLoading: statsLoading } = useStats();
  const [name, setName] = useState(user?.full_name || "");
  const [role, setRole] = useState(user?.role || "Medical Student");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(user?.full_name || "");
    setRole(user?.role || "Medical Student");
    setAvatarUrl(user?.avatar_url || "");
  }, [user?.full_name, user?.role, user?.avatar_url]);

  const initials = useMemo(() => {
    if (!user?.full_name && !name) return "XR";
    return (name || user?.full_name || "XR")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [name, user?.full_name]);

  const hasChanges = name !== (user?.full_name || "") || role !== (user?.role || "Medical Student") || avatarUrl !== (user?.avatar_url || "");

  const onSave = async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }
    if (avatarUrl && !/^https?:\/\/.+/i.test(avatarUrl)) {
      setError("Avatar URL must start with http:// or https://.");
      return;
    }

    setSaving(true);
    try {
      await updateProfile({ full_name: name.trim(), role, avatar_url: avatarUrl.trim() || null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell title="Profile">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="clinical-panel-strong premium-card overflow-hidden p-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[var(--shadow-sm)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-3xl font-extrabold">{initials}</div>
                )}
                <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-lg bg-background/90 text-primary shadow">
                  <Camera size={15} />
                </span>
              </div>
              <div>
                <p className="clinical-kicker">Account profile</p>
                <h2 className="mt-2 font-display text-3xl font-extrabold">{user?.full_name || "User"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "recently"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <ProfileSignal icon={ShieldCheck} label="Role" value={user?.role || "Medical Student"} />
              <ProfileSignal icon={ScanLine} label="Scans" value={statsLoading ? "..." : String(stats?.total_scans ?? 0)} />
              <ProfileSignal icon={Target} label="Avg Confidence" value={statsLoading ? "..." : `${stats?.avg_confidence ?? 0}%`} />
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div className="clinical-panel premium-card space-y-5 p-6">
            <div>
              <h3 className="font-display text-lg font-bold">Personal details</h3>
              <p className="mt-1 text-sm text-muted-foreground">Keep your identity visible in reports and workspace activity.</p>
            </div>

            <Field label="Full Name" icon={User}>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="premium-input w-full rounded-md border border-border bg-background/60 py-3 pl-9 pr-3 text-sm focus:outline-none"
              />
            </Field>

            <Field label="Email" icon={Mail}>
              <input
                value={user?.email || ""}
                disabled
                className="w-full rounded-md border border-border bg-background/40 py-3 pl-9 pr-3 text-sm text-muted-foreground"
              />
            </Field>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Role</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="premium-input w-full rounded-md border border-border bg-background/60 px-3 py-3 text-sm focus:outline-none"
              >
                {roles.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>

            <Field label="Avatar URL" icon={Camera}>
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://..."
                className="premium-input w-full rounded-md border border-border bg-background/60 py-3 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </Field>

            <button onClick={onSave} disabled={saving || !hasChanges} className="clinical-button px-6 disabled:opacity-50">
              {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : <Save size={15} />}
              {saved ? "Saved" : "Save Changes"}
            </button>
          </div>

          <aside className="space-y-6">
            <div className="clinical-panel premium-card p-6">
              <h3 className="font-display text-lg font-bold">Usage Statistics</h3>
              <div className="mt-4 grid gap-3">
                <StatBox icon={ScanLine} label="Total Scans" value={String(stats?.total_scans ?? 0)} color="text-primary" />
                <StatBox icon={AlertTriangle} label="Critical Findings" value={String(stats?.critical_findings ?? 0)} color="text-destructive" />
                <StatBox icon={Target} label="Avg. Confidence" value={`${stats?.avg_confidence ?? 0}%`} color="text-success" />
              </div>
            </div>

            <div className="rounded-lg border border-warning/30 bg-warning/10 p-5">
              <h3 className="font-display text-base font-bold text-warning">Account Safety</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Account deletion requires backend identity-provider support. For now, sign out when using a shared machine.
              </p>
              <button onClick={logout} className="clinical-button-secondary mt-4 px-4">
                Sign out
              </button>
            </div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="relative">
        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </div>
  );
}

function ProfileSignal({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon size={14} className="text-primary" />
        {label}
      </div>
      <p className="mt-2 truncate font-display text-lg font-bold">{value}</p>
    </div>
  );
}

function StatBox({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-4 interaction-lift">
      <div className="flex items-center gap-2">
        <Icon size={14} className={color} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

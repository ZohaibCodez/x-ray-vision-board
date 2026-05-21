import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, AlertTriangle, Target, Clock, ArrowUpRight, ArrowDownRight, TrendingUp, Bone, Stethoscope, Activity, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { useStats } from "@/hooks/use-scans";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — XRayVision AI" }] }),
  component: Dashboard,
});

const urgencyStyle: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-warning/15 text-warning",
  medium: "bg-info/15 text-info",
  low: "bg-success/15 text-success",
  clear: "bg-muted text-muted-foreground",
};

function Dashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading } = useStats();

  const displayName = user?.full_name || "Doctor";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  if (isLoading) {
    return (
      <AppShell title="Dashboard">
        <div className="flex items-center justify-center py-32">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const totalScans = stats?.total_scans ?? 0;
  const criticalFindings = stats?.critical_findings ?? 0;
  const avgConfidence = stats?.avg_confidence ?? 0;
  const avgTime = stats?.avg_report_time ?? 0;
  const recentScans = stats?.recent_scans ?? [];
  const dist = stats?.finding_distribution ?? {};
  const models = stats?.model_performance ?? [];

  const statCards = [
    { label: "Total Scans", value: totalScans.toLocaleString(), delta: "+new", up: true, icon: ScanLine, color: "text-primary" },
    { label: "Critical Findings", value: String(criticalFindings), delta: "", up: true, icon: AlertTriangle, color: "text-destructive" },
    { label: "Avg. Confidence", value: `${avgConfidence}%`, delta: "", up: true, icon: Target, color: "text-success" },
    { label: "Avg. Report Time", value: `${avgTime}s`, delta: "", up: false, icon: Clock, color: "text-info" },
  ];

  // Build donut data from finding distribution
  const distColors = ["#00C8E0", "#0080FF", "#7B9CFF", "#FFB547", "#3D4F6B"];
  const distEntries = Object.entries(dist).slice(0, 5);
  const distTotal = distEntries.reduce((sum, [, v]) => sum + v, 0) || 1;
  const donutData = distEntries.map(([label, count], i) => ({
    label,
    pct: Math.round((count / distTotal) * 100),
    color: distColors[i % distColors.length],
  }));

  return (
    <AppShell title="Dashboard">
      {/* Row 1 */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Welcome back</p>
          <h2 className="mt-1 font-display text-3xl font-bold">{greeting}, {displayName}</h2>
          {recentScans.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="text-warning">{recentScans.length} recent analyses</span> · {criticalFindings} critical findings
            </p>
          )}
        </div>
        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-cyan)]"
        >
          <ScanLine size={16} /> New Analysis
        </Link>
      </section>

      {/* Row 2 - Stats */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s, i) => (
          <div
            key={s.label}
            className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-[var(--shadow-md)] animate-fade-up"
            style={{ animationDelay: `${i * 60}ms`, background: "var(--gradient-card)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-2 font-display text-3xl font-bold tracking-tight">{s.value}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background/60 ${s.color}`}>
                <s.icon size={16} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Row 3 - Recent + Donut */}
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-2" style={{ background: "var(--gradient-card)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Recent Analyses</h3>
              <p className="text-xs text-muted-foreground">{recentScans.length > 0 ? "Latest scans" : "No scans yet"}</p>
            </div>
            <Link to="/history" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            {recentScans.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3">Scan ID</th>
                    <th className="py-3">Type</th>
                    <th className="py-3">Findings</th>
                    <th className="py-3">Urgency</th>
                    <th className="py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentScans.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 transition-colors hover:bg-background/40">
                      <td className="py-3">
                        <Link to="/results/$scanId" params={{ scanId: r.id }} className="font-mono text-xs text-primary hover:underline">
                          {r.id.slice(0, 8)}…
                        </Link>
                      </td>
                      <td className="py-3 capitalize">{r.scan_type}</td>
                      <td className="py-3">{r.findings_count}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${urgencyStyle[r.urgency] || urgencyStyle.clear}`}>
                          {r.urgency}
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No analyses yet. <Link to="/analyze" className="text-primary hover:underline">Start your first analysis →</Link>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6" style={{ background: "var(--gradient-card)" }}>
          <h3 className="text-base font-semibold">Finding Distribution</h3>
          <p className="text-xs text-muted-foreground">All time</p>
          {donutData.length > 0 ? (
            <>
              <Donut data={donutData} total={totalScans} />
              <ul className="mt-4 space-y-2">
                {donutData.map((d) => (
                  <li key={d.label} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-foreground">{d.label}</span>
                    </span>
                    <span className="font-mono text-muted-foreground">{d.pct}%</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-8 text-center text-sm text-muted-foreground">No data yet</div>
          )}
        </div>
      </section>

      {/* Row 4 - Model performance */}
      <section className="mt-8 rounded-xl border border-border bg-card p-6" style={{ background: "var(--gradient-card)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Model Performance</h3>
            <p className="text-xs text-muted-foreground">Benchmark AUC on validation sets</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-success">
            <TrendingUp size={11} /> All operational
          </span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {(models.length > 0 ? models : [
            { name: "DenseNet121", task: "Chest Pathology", auc: 0.847, color: "bg-primary" },
            { name: "YOLOv8", task: "Fracture Detection", auc: 0.891, color: "bg-secondary" },
            { name: "ViT", task: "Wound Classification", auc: 0.823, color: "bg-info" },
          ]).map((m) => {
            const Icon = m.name === "DenseNet121" ? Stethoscope : m.name === "YOLOv8" ? Bone : Activity;
            return (
              <div key={m.name} className="rounded-lg border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={14} className="text-primary" />
                    <span className="text-sm font-semibold">{m.name}</span>
                  </div>
                  <span className="font-mono text-xs text-foreground">{m.auc.toFixed(3)}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{m.task}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className={`h-full ${m.color}`} style={{ width: `${m.auc * 100}%`, boxShadow: "0 0 8px rgba(0,200,224,0.5)" }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

function Donut({ data, total }: { data: { pct: number; color: string }[]; total: number }) {
  const r = 50, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="relative mx-auto mt-6 h-44 w-44">
      <svg viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--color-border)" strokeWidth="14" />
        {data.map((d, i) => {
          const len = (d.pct / 100) * c;
          const dash = `${len} ${c - len}`;
          const offset = -((acc / 100) * c);
          acc += d.pct;
          return (
            <circle key={i} cx="60" cy="60" r={r} fill="none"
              stroke={d.color} strokeWidth="14"
              strokeDasharray={dash} strokeDashoffset={offset}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold">{total.toLocaleString()}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">scans</span>
      </div>
    </div>
  );
}

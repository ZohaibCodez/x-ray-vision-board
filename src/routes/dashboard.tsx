import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, AlertTriangle, Target, Clock, ArrowUpRight, ArrowDownRight, TrendingUp, Bone, Stethoscope, Activity } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — XRayVision AI" }] }),
  component: Dashboard,
});

const stats = [
  { label: "Total Scans", value: "1,284", delta: "+12.4%", up: true, icon: ScanLine, color: "text-primary" },
  { label: "Critical Findings", value: "37", delta: "+3", up: true, icon: AlertTriangle, color: "text-destructive" },
  { label: "Analysis Accuracy", value: "94.7%", delta: "+1.2%", up: true, icon: Target, color: "text-success" },
  { label: "Avg. Report Time", value: "8.4s", delta: "-1.1s", up: false, icon: Clock, color: "text-info" },
];

const recent = [
  { id: "scan_2026_05_21_03", type: "Chest", patient: "PT-4821", findings: 3, urgency: "high", time: "12 min ago" },
  { id: "scan_2026_05_21_02", type: "Fracture", patient: "PT-4820", findings: 1, urgency: "medium", time: "47 min ago" },
  { id: "scan_2026_05_21_01", type: "Wound", patient: "PT-4819", findings: 2, urgency: "low", time: "2 hr ago" },
  { id: "scan_2026_05_20_18", type: "Chest", patient: "PT-4818", findings: 0, urgency: "clear", time: "5 hr ago" },
  { id: "scan_2026_05_20_17", type: "Chest", patient: "PT-4817", findings: 4, urgency: "critical", time: "Yesterday" },
];

const urgencyStyle: Record<string, string> = {
  critical: "bg-destructive/15 text-destructive",
  high: "bg-warning/15 text-warning",
  medium: "bg-info/15 text-info",
  low: "bg-success/15 text-success",
  clear: "bg-muted text-muted-foreground",
};

const dist = [
  { label: "Cardiomegaly", pct: 28, color: "#00C8E0" },
  { label: "Pneumonia", pct: 22, color: "#0080FF" },
  { label: "Pleural Effusion", pct: 18, color: "#7B9CFF" },
  { label: "Fractures", pct: 16, color: "#FFB547" },
  { label: "Other", pct: 16, color: "#3D4F6B" },
];

const models = [
  { name: "DenseNet121", task: "Chest Pathology", auc: 0.847, color: "bg-primary" },
  { name: "YOLOv8", task: "Fracture Detection", auc: 0.891, color: "bg-secondary" },
  { name: "ViT", task: "Wound Classification", auc: 0.823, color: "bg-info" },
];

function Dashboard() {
  return (
    <AppShell title="Dashboard">
      {/* Row 1 */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Welcome back</p>
          <h2 className="mt-1 font-display text-3xl font-bold">Good morning, Dr. Reyes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="text-warning">3 pending analyses</span> · 1 critical review needed
          </p>
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
        {stats.map((s, i) => (
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
            <div className={`mt-3 inline-flex items-center gap-1 font-mono text-[11px] ${s.up ? "text-success" : "text-info"}`}>
              {s.up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {s.delta} <span className="text-muted-foreground">vs last week</span>
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
              <p className="text-xs text-muted-foreground">Last 24 hours</p>
            </div>
            <Link to="/history" className="text-xs text-primary hover:underline">View all →</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3">Scan ID</th>
                  <th className="py-3">Type</th>
                  <th className="py-3">Patient</th>
                  <th className="py-3">Findings</th>
                  <th className="py-3">Urgency</th>
                  <th className="py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 transition-colors hover:bg-background/40">
                    <td className="py-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                    <td className="py-3">{r.type}</td>
                    <td className="py-3 font-mono text-xs">{r.patient}</td>
                    <td className="py-3">{r.findings}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${urgencyStyle[r.urgency]}`}>
                        {r.urgency}
                      </span>
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6" style={{ background: "var(--gradient-card)" }}>
          <h3 className="text-base font-semibold">Finding Distribution</h3>
          <p className="text-xs text-muted-foreground">All time</p>
          <Donut data={dist} />
          <ul className="mt-4 space-y-2">
            {dist.map((d) => (
              <li key={d.label} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-foreground">{d.label}</span>
                </span>
                <span className="font-mono text-muted-foreground">{d.pct}%</span>
              </li>
            ))}
          </ul>
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
          {models.map((m) => {
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
                <Sparkline />
              </div>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

function Donut({ data }: { data: { pct: number; color: string }[] }) {
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
            <circle
              key={i}
              cx="60" cy="60" r={r} fill="none"
              stroke={d.color} strokeWidth="14"
              strokeDasharray={dash} strokeDashoffset={offset}
              style={{ transition: "stroke-dasharray 0.6s ease" }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-bold">1,284</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">findings</span>
      </div>
    </div>
  );
}

function Sparkline() {
  const pts = [4, 6, 5, 8, 7, 9, 8, 10, 9, 11, 10, 12];
  const max = 12, w = 100, h = 28;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - (p / max) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-7 w-full">
      <polyline points={d} fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
    </svg>
  );
}

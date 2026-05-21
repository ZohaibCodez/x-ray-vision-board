import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Calendar, UploadCloud, ScanLine, FileImage } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "History — XRayVision AI" }] }),
  component: HistoryPage,
});

type Scan = {
  id: string;
  type: "chest" | "fracture" | "wound";
  date: string;
  session: string;
  urgency: "critical" | "high" | "medium" | "low" | "clear";
  findings: number;
};

const scans: Scan[] = [
  { id: "scan_2026_05_21_03", type: "chest", date: "May 21, 09:42", session: "PT-4821", urgency: "high", findings: 3 },
  { id: "scan_2026_05_21_02", type: "fracture", date: "May 21, 08:55", session: "PT-4820", urgency: "medium", findings: 1 },
  { id: "scan_2026_05_21_01", type: "wound", date: "May 21, 07:18", session: "PT-4819", urgency: "low", findings: 2 },
  { id: "scan_2026_05_20_18", type: "chest", date: "May 20, 18:42", session: "PT-4818", urgency: "clear", findings: 0 },
  { id: "scan_2026_05_20_17", type: "chest", date: "May 20, 15:11", session: "PT-4817", urgency: "critical", findings: 4 },
  { id: "scan_2026_05_20_12", type: "fracture", date: "May 20, 12:36", session: "PT-4816", urgency: "high", findings: 2 },
  { id: "scan_2026_05_19_22", type: "wound", date: "May 19, 22:05", session: "PT-4815", urgency: "low", findings: 1 },
  { id: "scan_2026_05_19_14", type: "chest", date: "May 19, 14:27", session: "PT-4814", urgency: "medium", findings: 2 },
  { id: "scan_2026_05_19_09", type: "chest", date: "May 19, 09:03", session: "PT-4813", urgency: "clear", findings: 0 },
];

const filters = ["All", "Chest", "Fracture", "Wound"] as const;
const urgencyStyle: Record<Scan["urgency"], string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-info/15 text-info border-info/30",
  low: "bg-success/15 text-success border-success/30",
  clear: "bg-muted text-muted-foreground border-border",
};

function HistoryPage() {
  const [filter, setFilter] = useState<typeof filters[number]>("All");
  const [query, setQuery] = useState("");

  const filtered = scans.filter((s) => {
    if (filter !== "All" && s.type !== filter.toLowerCase()) return false;
    if (query && !s.id.includes(query) && !s.session.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell title="Scan History">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Archive</p>
          <h2 className="mt-1 font-display text-3xl font-bold">All analyses</h2>
        </div>
        <Link to="/analyze" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]">
          <ScanLine size={16} /> New Analysis
        </Link>
      </div>

      {/* Filter bar */}
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/60 p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by scan ID or session..."
            className="w-full rounded-md border border-border bg-background/60 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-background/60 p-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${filter === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
          <Calendar size={12} /> Date range
        </button>
        <select className="rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none">
          <option>Newest first</option>
          <option>Oldest first</option>
          <option>Highest urgency</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s, i) => (
            <Link
              key={s.id}
              to="/results/$scanId"
              params={{ scanId: s.id }}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:border-primary/50 hover:shadow-[var(--shadow-md)] animate-fade-up"
              style={{ animationDelay: `${i * 40}ms`, background: "var(--gradient-card)" }}
            >
              <div className="relative flex h-40 items-center justify-center overflow-hidden bg-black">
                <FileImage size={36} className="text-muted-foreground/40" />
                <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />
                <span className={`absolute right-3 top-3 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${urgencyStyle[s.urgency]}`}>
                  {s.urgency}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-primary">
                    {s.type}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{s.findings} findings</span>
                </div>
                <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{s.id}</p>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{s.session}</span>
                  <span className="text-muted-foreground">{s.date}</span>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="text-primary opacity-0 transition-opacity group-hover:opacity-100">View report →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-card text-muted-foreground">
        <UploadCloud size={28} />
      </div>
      <h3 className="mt-4 font-display text-xl font-bold">No analyses yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Upload your first X-ray to start building a diagnostic history.
      </p>
      <Link to="/analyze" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]">
        <ScanLine size={16} /> Start New Analysis
      </Link>
    </div>
  );
}

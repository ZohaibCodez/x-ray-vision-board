import heroXray from "@/assets/hero-xray.jpg";

export function XrayViewer() {
  return (
    <div className="relative animate-fade-up">
      {/* Outer frame */}
      <div
        className="relative rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-lg)]"
        style={{ boxShadow: "var(--shadow-lg), var(--glow-cyan)" }}
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between px-2 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            <span className="ml-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              chest_pa_001.dcm · DenseNet121
            </span>
          </div>
          <span className="font-mono text-[11px] text-primary glow-pulse">● LIVE</span>
        </div>

        {/* Image area */}
        <div className="relative overflow-hidden rounded-xl bg-black">
          <img
            src={heroXray}
            alt="Chest X-ray with AI bounding box annotations"
            width={1024}
            height={1024}
            className="block h-auto w-full opacity-95"
          />

          {/* Scan line */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="scan-line" />
          </div>

          {/* Bounding boxes */}
          <BoundingBox
            className="left-[28%] top-[34%] h-[26%] w-[28%] border-destructive"
            color="destructive"
            label="Cardiomegaly"
            confidence="87.3%"
            placement="top-left"
          />
          <BoundingBox
            className="left-[58%] top-[52%] h-[18%] w-[20%] border-warning"
            color="warning"
            label="Pleural Effusion"
            confidence="72.1%"
            placement="bottom-right"
          />

          {/* Corner brackets */}
          {[
            "left-3 top-3 border-l-2 border-t-2",
            "right-3 top-3 border-r-2 border-t-2",
            "left-3 bottom-3 border-l-2 border-b-2",
            "right-3 bottom-3 border-r-2 border-b-2",
          ].map((c) => (
            <span key={c} className={`pointer-events-none absolute h-4 w-4 border-primary ${c}`} />
          ))}
        </div>

        {/* Bottom data strip */}
        <div className="mt-3 grid grid-cols-3 gap-2 px-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <div>kVp <span className="text-foreground">110</span></div>
          <div>mAs <span className="text-foreground">2.5</span></div>
          <div>Conf <span className="text-primary">High</span></div>
        </div>
      </div>

      {/* Floating annotation card */}
      <div className="absolute -bottom-6 -left-6 hidden w-64 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-md)] md:block animate-fade-up" style={{ animationDelay: "0.3s" }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Agent Synthesis</span>
          <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-destructive">High</span>
        </div>
        <p className="mt-2 text-sm leading-snug text-foreground">
          Cardiothoracic ratio elevated. Recommend echocardiogram.
        </p>
      </div>
    </div>
  );
}

function BoundingBox({
  className,
  color,
  label,
  confidence,
  placement,
}: {
  className: string;
  color: "destructive" | "warning" | "info";
  label: string;
  confidence: string;
  placement: "top-left" | "bottom-right";
}) {
  const textColor =
    color === "destructive" ? "text-destructive" : color === "warning" ? "text-warning" : "text-info";
  const bgColor =
    color === "destructive" ? "bg-destructive/90" : color === "warning" ? "bg-warning/90" : "bg-info/90";
  const pos = placement === "top-left" ? "-top-7 left-0" : "-bottom-7 right-0";
  return (
    <div className={`absolute border-2 border-dashed ${className} animate-fade-up`} style={{ animationDelay: "0.6s" }}>
      <span
        className={`absolute ${pos} flex items-center gap-1.5 rounded ${bgColor} px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-background`}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full bg-background ${textColor}`} />
        {label} · {confidence}
      </span>
    </div>
  );
}

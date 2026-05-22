import { Activity, Bone, Brain, Sparkles, ArrowRight, Play, Upload, Cpu, FileText, ShieldCheck, ScanLine, Stethoscope } from "lucide-react";
import { Logo } from "./Logo";
import { XrayViewer } from "./XrayViewer";

export function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-accent-glow)" }} />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />

      <div className="relative">
        <Nav />
        <Hero />
        <CapabilitiesBar />
        <HowItWorks />
        <SampleReport />
        <TrustSection />
        <CTAFooter />
        <Footer />
      </div>
    </div>
  );
}

function Nav() {
  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span className="font-display text-lg font-bold tracking-tight">
            XRayVision <span className="text-primary">AI</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#capabilities" className="hover:text-foreground transition-colors">Capabilities</a>
          <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#report" className="hover:text-foreground transition-colors">Sample report</a>
          <a href="#trust" className="hover:text-foreground transition-colors">Technology</a>
        </nav>
        <div className="flex items-center gap-3">
          <a href="/auth/login" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-block">Sign in</a>
          <a
            href="/auth/register"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary/60 hover:text-primary"
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-12 pb-24 lg:pt-20">
      <div className="grid items-center gap-16 lg:grid-cols-2">
        <div className="animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary glow-pulse" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
              AI-Powered Radiology Assistant
            </span>
          </div>

          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.5rem]">
            See What Others Miss.
            <br />
            <span className="text-gradient-cyan">Diagnose With Precision.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            XRayVision AI uses a multi-model ensemble — chest pathology, fracture detection,
            wound classification — synthesized by an intelligent agent into actionable clinical insights.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="/analyze"
              className="group inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-cyan)]"
            >
              <ScanLine size={18} />
              Start Free Analysis
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#how"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/60 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur hover:border-primary/50"
            >
              <Play size={16} />
              Watch Demo
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {["DenseNet121", "YOLOv8", "ViT", "GLM 4.5 Air"].map((t, i) => (
              <span key={t} className="flex items-center gap-2">
                {i > 0 && <span className="h-1 w-1 rounded-full bg-border" />}
                <span>{t}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="lg:pl-8">
          <XrayViewer />
        </div>
      </div>
    </section>
  );
}

const capabilities = [
  { icon: Stethoscope, title: "Chest Pathology", sub: "DenseNet121 · AUC 0.83+" },
  { icon: Bone, title: "Fracture Detection", sub: "YOLOv8 · Real-time Localization" },
  { icon: Activity, title: "Wound Classification", sub: "Vision Transformer (ViT)" },
  { icon: Brain, title: "Agentic Synthesis", sub: "OpenRouter GLM 4.5 Air" },
];

function CapabilitiesBar() {
  return (
    <section id="capabilities" className="relative border-y border-border bg-surface/40 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border/50 md:grid-cols-4">
        {capabilities.map(({ icon: Icon, title, sub }) => (
          <div key={title} className="group flex items-center gap-4 bg-background/60 p-6 transition-colors hover:bg-card/60">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-all group-hover:shadow-[var(--glow-cyan)]">
              <Icon size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold">{title}</div>
              <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const steps = [
  { n: "01", title: "Upload X-Ray Image", desc: "DICOM, PNG or JPG. Drag-and-drop or browse.", icon: Upload },
  { n: "02", title: "Select Analysis Type", desc: "Chest, fracture, or external wound.", icon: ScanLine },
  { n: "03", title: "Parallel Model Inference", desc: "DenseNet121 · YOLOv8 · ViT run in parallel.", icon: Cpu },
  { n: "04", title: "Agentic Synthesis", desc: "GLM 4.5 Air prioritizes findings and recommends next steps.", icon: Brain },
  { n: "05", title: "Structured Clinical Report", desc: "Confidence, severity, ICD-10, urgency, downloadable PDF.", icon: FileText },
];

function HowItWorks() {
  return (
    <section id="how" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">The Pipeline</span>
        <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Three Models. <span className="text-gradient-cyan">One Intelligent Report.</span>
        </h2>
        <p className="mt-4 text-muted-foreground">
          A radiology pipeline engineered for transparency at every step — from raw pixels to prioritized recommendations.
        </p>
      </div>

      <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-border bg-border/60 md:grid-cols-5">
        {steps.map(({ n, title, desc, icon: Icon }, i) => (
          <div key={n} className="relative bg-card p-6">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-muted-foreground">{n}</span>
              <Icon size={18} className="text-primary" />
            </div>
            <h3 className="mt-6 text-base font-semibold leading-snug">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            {i < steps.length - 1 && (
              <div className="absolute right-0 top-1/2 hidden h-px w-6 -translate-y-1/2 translate-x-3 bg-gradient-to-r from-primary/60 to-transparent md:block" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function SampleReport() {
  return (
    <section id="report" className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">Sample Output</span>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            What a finished report actually looks like.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Each finding includes the model that detected it, the confidence interval,
            severity, anatomical region, and the relevant ICD-10 code.
          </p>
          <div className="mt-8">
            <XrayViewer />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-md)]">
          {/* Urgency banner */}
          <div className="flex items-center justify-between rounded-lg border-l-4 border-warning bg-warning/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-widest text-warning">Urgency</span>
              <span className="font-display text-lg font-bold text-warning">HIGH</span>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">scan_2026_05_21_01</span>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-muted-foreground">Primary Findings</h4>
            <div className="mt-3 space-y-3">
              <FindingRow name="Cardiomegaly" conf={87.3} sev="destructive" model="DenseNet121" icd="I51.7" />
              <FindingRow name="Right Pleural Effusion" conf={72.1} sev="warning" model="DenseNet121" icd="J90" />
            </div>
          </div>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-muted-foreground">Secondary Findings</h4>
            <div className="mt-3 space-y-3">
              <FindingRow name="Mild Pulmonary Congestion" conf={61.4} sev="info" model="DenseNet121" icd="J81" />
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary">Agent Recommendation</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              Findings suggest cardiac decompensation with secondary pleural effusion.
              Immediate cardiology referral and echocardiogram advised.
            </p>
          </div>

          <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            This is an AI-assisted analysis only. Always confirm with a qualified radiologist.
          </p>
        </div>
      </div>
    </section>
  );
}

function FindingRow({
  name, conf, sev, model, icd,
}: { name: string; conf: number; sev: "destructive" | "warning" | "info"; model: string; icd: string }) {
  const sevColor =
    sev === "destructive" ? "bg-destructive text-destructive" :
    sev === "warning" ? "bg-warning text-warning" : "bg-info text-info";
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${sevColor.split(" ")[0]}`} />
          <span className="text-sm font-medium text-foreground">{name}</span>
        </div>
        <span className="font-mono text-xs text-foreground">{conf.toFixed(1)}%</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${conf}%`, boxShadow: "0 0 8px rgba(0,200,224,0.6)" }}
        />
      </div>
      <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{model}</span>
        <span className="h-1 w-1 rounded-full bg-border" />
        <span>ICD-10 · {icd}</span>
      </div>
    </div>
  );
}

const stats = [
  { value: "700K+", label: "Clinical Images in Training Data" },
  { value: "0.83+", label: "Mean AUC on NIH / Stanford Datasets" },
  { value: "3 → 1", label: "Specialized Models, Unified Report" },
];

function TrustSection() {
  return (
    <section id="trust" className="relative border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 md:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="border-l border-primary/40 pl-6">
              <div className="font-display text-5xl font-extrabold text-gradient-cyan">{s.value}</div>
              <div className="mt-3 text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground">
          <span>PyTorch</span>
          <span className="text-border">/</span>
          <span>Hugging Face</span>
          <span className="text-border">/</span>
          <span>OpenRouter</span>
          <span className="text-border">/</span>
          <span>Supabase</span>
          <span className="text-border">/</span>
          <span>FastAPI</span>
          <span className="text-border">/</span>
          <span>Vercel</span>
        </div>
      </div>
    </section>
  );
}

function CTAFooter() {
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-12 text-center sm:p-16" style={{ background: "var(--gradient-card)" }}>
        <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-accent-glow)" }} />
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Ready to analyze your <span className="text-gradient-cyan">first image?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Free to use for educational purposes. No credit card required.
          </p>
          <a
            href="/auth/register"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]"
          >
            Create Free Account
            <ArrowRight size={16} />
          </a>
          <p className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck size={14} className="text-primary" />
            XRayVision AI is for educational and diagnostic assistance only. Not a substitute for a licensed radiologist.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-8">
        <div className="flex items-center gap-2.5">
          <Logo size={20} />
          <span className="font-display text-sm font-bold">XRayVision AI</span>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">v2.1</span>
        </div>
        <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-warning">
          Educational Use Only
        </span>
        <span className="text-xs text-muted-foreground">© 2026 XRayVision AI</span>
      </div>
    </footer>
  );
}

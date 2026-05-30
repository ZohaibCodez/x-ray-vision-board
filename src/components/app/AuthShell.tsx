import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, LockKeyhole, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/landing/Logo";

export function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="clinical-page relative min-h-dvh overflow-hidden text-foreground">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-45" />
      <div className="relative grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-border bg-white/72 p-10 backdrop-blur-xl dark:bg-background/72 lg:flex lg:flex-col lg:justify-between">
          <Link to="/" className="flex w-fit items-center gap-3">
            <Logo size={34} />
            <span className="font-display text-xl font-extrabold">
              XRayVision <span className="text-gradient-medical">AI</span>
            </span>
          </Link>

          <div className="max-w-xl">
            <p className="clinical-kicker">Secure clinical workspace</p>
            <h1 className="mt-4 font-display text-5xl font-extrabold leading-tight">
              Diagnostic assistance with a clean chain of evidence.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
              Sign in to upload scans, review confidence-tiered findings, export reports,
              and continue care planning from one focused workspace.
            </p>

            <div className="mt-8 grid gap-3">
              {[
                { icon: Activity, title: "Multi-model analysis", text: "Chest, fracture, and wound routes stay separated for cleaner output." },
                { icon: ShieldCheck, title: "Educational guardrails", text: "Every report keeps clinical review and safety disclaimers visible." },
                { icon: LockKeyhole, title: "Private records", text: "Scan history and chat sessions are scoped to the authenticated user." },
              ].map(({ icon: Icon, title: itemTitle, text }) => (
                <div key={itemTitle} className="clinical-panel flex gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={18} />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{itemTitle}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Educational use only. Not a substitute for a licensed radiologist.
          </p>
        </section>

        <main className="flex min-h-dvh items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-md animate-fade-up">
            <Link to="/" className="mb-7 flex items-center justify-center gap-2.5 lg:hidden">
              <Logo size={32} />
              <span className="font-display text-xl font-extrabold">
                XRayVision <span className="text-gradient-medical">AI</span>
              </span>
            </Link>

            <div className="clinical-panel-strong p-6 sm:p-8">
              <p className="clinical-kicker">Account access</p>
              <h2 className="mt-2 font-display text-2xl font-extrabold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p>
              <div className="mt-6">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

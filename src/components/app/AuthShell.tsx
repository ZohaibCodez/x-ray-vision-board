import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/landing/Logo";

export function AuthShell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-accent-glow)" }} />
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-30" />

      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-[480px] animate-fade-up">
          <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
            <Logo size={32} />
            <span className="font-display text-xl font-bold">
              XRayVision <span className="text-primary">AI</span>
            </span>
          </Link>

          <div
            className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-lg)]"
            style={{ background: "var(--gradient-card)" }}
          >
            <h2 className="font-display text-2xl font-bold tracking-tight">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Educational use only · Not a substitute for a licensed radiologist
          </p>
        </div>
      </div>
    </div>
  );
}

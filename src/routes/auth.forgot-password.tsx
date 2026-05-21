import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AuthShell } from "@/components/app/AuthShell";
import { Field } from "@/components/ui-x/Field";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — XRayVision AI" }, { name: "description", content: "Reset your password." }] }),
  component: ForgotPage,
});

function ForgotPage() {
  const [sent, setSent] = useState(false);
  return (
    <AuthShell title="Reset your password" subtitle="We'll send a secure reset link to your inbox.">
      {sent ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
            <CheckCircle2 size={22} />
          </div>
          <p className="text-sm text-foreground">Check your inbox for a password reset link.</p>
          <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
          <Field label="Email" name="email" type="email" placeholder="you@hospital.org" icon={<Mail size={16} />} required />
          <button className="w-full rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground hover:shadow-[var(--glow-cyan)]">
            Send reset link
          </button>
          <Link to="/auth/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/app/AuthShell";
import { Field } from "@/components/ui-x/Field";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — XRayVision AI" }, { name: "description", content: "Sign in to your diagnostic workspace." }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      await login(email, password);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to access your diagnostic workspace">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Field label="Email" name="email" type="email" placeholder="you@hospital.org" icon={<Mail size={16} />} required />
        <Field label="Password" name="password" type="password" placeholder="••••••••" required />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-border bg-background accent-[--primary]" />
            Keep me signed in
          </label>
          <Link to="/auth/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-cyan)] disabled:opacity-70"
        >
          {loading ? (<><Loader2 size={16} className="animate-spin" /> Signing in...</>) : "Sign In"}
        </button>

        <div className="flex items-center gap-3 py-2">
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">or continue with</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background/60 py-3 text-sm font-medium text-foreground hover:border-primary/60"
        >
          <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2c-2 1.4-4.5 2.2-7.3 2.2-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.7 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.6l6.3 5.2c-.4.4 6.4-4.7 6.4-14.8 0-1.2-.1-2.3-.4-3.5z"/>
          </svg>
          Continue with Google
        </button>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/auth/register" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

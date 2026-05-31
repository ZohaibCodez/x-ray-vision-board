import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Loader2, Sparkles } from "lucide-react";
import { AuthShell } from "@/components/app/AuthShell";
import { Field } from "@/components/ui-x/Field";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Sign in — XRayVision AI" }, { name: "description", content: "Sign in to your diagnostic workspace." }] }),
  component: LoginPage,
});

// Shared demo account so reviewers can explore without registering.
const DEMO_EMAIL = "ahmad123@gmail.com";
const DEMO_PASSWORD = "12345678";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState("");

  const signIn = async (email: string, password: string) => {
    setError("");
    await login(email, password);
    navigate({ to: "/dashboard" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const onDemoLogin = async () => {
    setDemoLoading(true);
    try {
      await signIn(DEMO_EMAIL, DEMO_PASSWORD);
    } catch (err: any) {
      setError(err.message || "Demo login failed. Please try again.");
    } finally {
      setDemoLoading(false);
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
          disabled={loading || demoLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-cyan)] disabled:opacity-70"
        >
          {loading ? (<><Loader2 size={16} className="animate-spin" /> Signing in...</>) : "Sign In"}
        </button>

        <div className="flex items-center gap-3 py-1">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={onDemoLogin}
          disabled={loading || demoLoading}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/5 py-3 text-sm font-semibold text-primary transition-all hover:bg-primary/10 disabled:opacity-70"
        >
          {demoLoading ? (<><Loader2 size={16} className="animate-spin" /> Loading demo...</>) : (<><Sparkles size={16} /> Try demo account</>)}
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

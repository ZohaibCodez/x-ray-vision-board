import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, User as UserIcon, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/app/AuthShell";
import { Field } from "@/components/ui-x/Field";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/auth/register")({
  head: () => ({ meta: [{ title: "Create account — XRayVision AI" }, { name: "description", content: "Create your XRayVision AI account." }] }),
  component: RegisterPage,
});

const roles = ["Medical Student", "Healthcare Professional", "Researcher", "Other"];

function strength(pw: string): 0 | 1 | 2 | 3 | 4 {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s as 0 | 1 | 2 | 3 | 4;
}

function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [pw, setPw] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const s = useMemo(() => strength(pw), [pw]);

  const colors = ["bg-border", "bg-destructive", "bg-warning", "bg-info", "bg-success"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const labelColor = ["text-muted-foreground", "text-destructive", "text-warning", "text-info", "text-success"];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    setError("");
    setLoading(true);

    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value;

    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      await register(email, password, name, role);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your account" subtitle="Free for educational use — no credit card required">
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Field label="Full name" name="name" placeholder="Dr. Alex Reyes" icon={<UserIcon size={16} />} required />
        <Field label="Email" name="email" type="email" placeholder="you@hospital.org" icon={<Mail size={16} />} required />
        <Field
          label="Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <div className="-mt-2">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= s ? colors[s] : "bg-border"}`}
              />
            ))}
          </div>
          {pw && (
            <p className={`mt-1.5 text-[11px] font-mono uppercase tracking-wider ${labelColor[s]}`}>
              Strength · {labels[s]}
            </p>
          )}
        </div>
        <Field label="Confirm password" name="confirm" type="password" placeholder="Re-enter password" required />

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            I am a
          </label>
          <div className="grid grid-cols-2 gap-2">
            {roles.map((r) => (
              <button
                type="button"
                key={r}
                onClick={() => setRole(r)}
                className={`rounded-md border px-3 py-2 text-xs font-medium transition-all ${
                  role === r
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-[--primary]"
          />
          <span>
            I acknowledge that XRayVision AI is for educational and diagnostic assistance only,
            and is not a substitute for a licensed radiologist.
          </span>
        </label>

        <button
          type="submit"
          disabled={!agreed || loading}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-sm font-semibold text-primary-foreground transition-all hover:shadow-[var(--glow-cyan)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (<><Loader2 size={16} className="animate-spin" /> Creating account...</>) : "Create Account"}
        </button>

        <p className="pt-2 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

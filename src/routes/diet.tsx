import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Loader2, Salad, Sparkles, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { dietApi } from "@/lib/api";
import type { DietPlanResponse } from "@/lib/types";

export const Route = createFileRoute("/diet")({
  head: () => ({ meta: [{ title: "Diet Planner - XRayVision AI" }] }),
  component: DietPage,
});

const preferences = ["Balanced", "Vegetarian", "Vegan", "Keto", "High-Protein", "Low-Carb"];

function DietPage() {
  const [condition, setCondition] = useState("");
  const [pref, setPref] = useState("Balanced");
  const [restrictions, setRestrictions] = useState("");
  const [goals, setGoals] = useState("general health");
  const [language, setLanguage] = useState<"en" | "ur">("en");
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DietPlanResponse | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await dietApi.generate({
        condition: condition || undefined,
        dietary_preferences: pref.toLowerCase(),
        restrictions: restrictions ? restrictions.split(",").map(s => s.trim()) : [],
        goals,
        language,
      });
      setPlan(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate diet plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Diet Planner">
      <div className="mx-auto max-w-4xl">
        {!plan ? (
          <>
            <header className="mb-8 clinical-panel-strong premium-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Salad size={18} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">AI Diet Plan Generator</h2>
                  <p className="text-sm text-muted-foreground">Get a personalized meal plan based on your health condition</p>
                </div>
              </div>
            </header>

            {error && (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="clinical-panel premium-card space-y-6 p-6">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Medical Condition (optional)</label>
                <input
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  placeholder="e.g., diabetes, heart disease, high blood pressure"
                  className="premium-input w-full rounded-md border border-border bg-background/60 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Dietary Preference</label>
                <div className="flex flex-wrap gap-2">
                  {preferences.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPref(p)}
                      className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-medium interaction-lift ${
                        pref === p
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background/60 text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Restrictions (comma-separated)</label>
                <input
                  value={restrictions}
                  onChange={(e) => setRestrictions(e.target.value)}
                  placeholder="e.g., gluten-free, dairy-free, nut allergy"
                  className="premium-input w-full rounded-md border border-border bg-background/60 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Health Goals</label>
                <input
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="e.g., weight loss, muscle gain, general health"
                  className="premium-input w-full rounded-md border border-border bg-background/60 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex gap-1 rounded-md border border-border bg-background/60 p-1">
                  <button onClick={() => setLanguage("en")} className={`rounded px-2.5 py-1 text-xs font-medium ${language === "en" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>English</button>
                  <button onClick={() => setLanguage("ur")} className={`rounded px-2.5 py-1 text-xs font-medium ${language === "ur" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>Urdu</button>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning/10 p-4 text-sm text-muted-foreground">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
                <p>Educational meal guidance only. For hypertension, diabetes, kidney disease, pregnancy, allergies, or prescribed medicines, review the plan with a qualified clinician or dietitian.</p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="clinical-button h-14 w-full text-base disabled:opacity-50"
              >
                {loading ? (<><Loader2 size={18} className="animate-spin" /> Generating plan...</>) : (<><Sparkles size={18} /> Generate Diet Plan</>)}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="clinical-panel-strong premium-card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-primary">Your Plan</p>
                <h2 className="mt-1 font-display text-2xl font-bold">{plan.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.summary}</p>
              </div>
              <button
                onClick={() => setPlan(null)}
                className="clinical-button-secondary px-4"
              >
                New Plan
              </button>
            </div>

            <div className="space-y-4">
              {plan.plan.map((day) => (
                <div key={day.day} className="clinical-panel premium-card scroll-reveal p-5">
                  <h3 className="font-display text-lg font-bold text-primary">{day.day}</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MealCard title="Breakfast" meal={day.breakfast} />
                    <MealCard title="Lunch" meal={day.lunch} />
                    <MealCard title="Dinner" meal={day.dinner} />
                  </div>
                  {day.snacks.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Snacks</p>
                      <div className="flex flex-wrap gap-2">
                        {day.snacks.map((s, i) => (
                          <span key={i} className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs">
                            {s.name} {s.calories ? `| ${s.calories} cal` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {plan.tips.length > 0 && (
              <div className="clinical-panel premium-card mt-6 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={16} className="text-primary" />
                  <span className="font-mono text-[11px] uppercase tracking-widest text-primary">Health Tips</span>
                </div>
                <ul className="space-y-2">
                  {plan.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] text-primary">{i + 1}</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function MealCard({ title, meal }: { title: string; meal: { name: string; description: string; calories?: number | null; nutrients?: string | null } }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3 interaction-lift">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-semibold">{meal.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{meal.description}</p>
      <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {meal.calories && <span>{meal.calories} cal</span>}
        {meal.nutrients && <><span className="text-border">|</span><span>{meal.nutrients}</span></>}
      </div>
    </div>
  );
}

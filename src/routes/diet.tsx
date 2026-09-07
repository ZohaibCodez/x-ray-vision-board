import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Loader2, Printer, Salad, Sparkles, Lightbulb } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { dietApi } from "@/lib/api";
import { useLanguage, type StringKey } from "@/lib/i18n";
import type { DietPlanResponse } from "@/lib/types";

export const Route = createFileRoute("/diet")({
  head: () => ({ meta: [{ title: "Diet Planner - XRayVision AI" }] }),
  component: DietPage,
});

/**
 * The form is deliberately plain: pick from a few buttons, press one big
 * button. The previous version asked for a free-text medical condition,
 * "Keto / Low-Carb" preferences and comma-separated restrictions, which is
 * more than a typical user here can answer.
 *
 * `condition` and `goal` are the English terms the backend matches on; only
 * the label the user reads is translated.
 */
const healthOptions: {
  id: string;
  labelKey: StringKey;
  condition?: string;
  goal?: string;
}[] = [
  { id: "none", labelKey: "diet.condition.none" },
  { id: "sugar", labelKey: "diet.condition.sugar", condition: "diabetes" },
  { id: "bp", labelKey: "diet.condition.bp", condition: "high blood pressure" },
  { id: "heart", labelKey: "diet.condition.heart", condition: "heart disease" },
  { id: "kidney", labelKey: "diet.condition.kidney", condition: "kidney disease" },
  { id: "weight", labelKey: "diet.condition.weight", goal: "weight loss" },
];

const foodOptions: { id: string; labelKey: StringKey; preference: string }[] = [
  { id: "all", labelKey: "diet.food.everything", preference: "balanced" },
  { id: "nomeat", labelKey: "diet.food.noMeat", preference: "vegetarian" },
  { id: "nobeef", labelKey: "diet.food.noBeef", preference: "no beef" },
];

const avoidOptions: { id: string; labelKey: StringKey; restriction: string }[] = [
  { id: "egg", labelKey: "diet.avoid.egg", restriction: "egg" },
  { id: "milk", labelKey: "diet.avoid.milk", restriction: "dairy" },
  { id: "wheat", labelKey: "diet.avoid.wheat", restriction: "gluten" },
  { id: "nuts", labelKey: "diet.avoid.nuts", restriction: "nuts" },
];

function DietPage() {
  const { lang, dir, t } = useLanguage();
  const [health, setHealth] = useState("none");
  const [food, setFood] = useState("all");
  const [avoid, setAvoid] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DietPlanResponse | null>(null);
  const [error, setError] = useState("");

  const toggleAvoid = (id: string) => {
    setAvoid((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const selectedHealth = healthOptions.find((o) => o.id === health);
      const selectedFood = foodOptions.find((o) => o.id === food);

      const result = await dietApi.generate({
        condition: selectedHealth?.condition,
        dietary_preferences: selectedFood?.preference || "balanced",
        restrictions: avoidOptions
          .filter((o) => avoid.includes(o.id))
          .map((o) => o.restriction),
        goals: selectedHealth?.goal || "general health",
        language: lang,
      });
      setPlan(result);
    } catch (err: any) {
      setError(err.message || t("diet.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Diet Planner" titleKey="diet.title">
      <div className="mx-auto max-w-4xl" dir={dir}>
        {!plan ? (
          <>
            <header className="clinical-panel-strong premium-card mb-8 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Salad size={18} />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">{t("diet.heading")}</h2>
                  <p className="text-sm text-muted-foreground">{t("diet.subtitle")}</p>
                </div>
              </div>
            </header>

            {error && (
              <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="clinical-panel premium-card space-y-7 p-6">
              <Choice
                label={t("diet.conditionLabel")}
                help={t("diet.conditionHelp")}
                options={healthOptions.map((o) => ({ id: o.id, label: t(o.labelKey) }))}
                selected={[health]}
                onSelect={setHealth}
              />

              <Choice
                label={t("diet.foodLabel")}
                options={foodOptions.map((o) => ({ id: o.id, label: t(o.labelKey) }))}
                selected={[food]}
                onSelect={setFood}
              />

              <Choice
                label={t("diet.avoidLabel")}
                options={avoidOptions.map((o) => ({ id: o.id, label: t(o.labelKey) }))}
                selected={avoid}
                onSelect={toggleAvoid}
                multi
              />

              <div className="flex items-start gap-3 rounded-lg border border-warning/25 bg-warning/10 p-4 text-sm text-muted-foreground">
                <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" />
                <p>{t("diet.disclaimer")}</p>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="clinical-button h-14 w-full text-base disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> {t("diet.generating")}
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> {t("diet.generate")}
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="clinical-panel-strong premium-card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-primary">
                  {t("diet.yourPlan")}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold">{plan.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.summary}</p>
              </div>
              <div className="flex shrink-0 gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="clinical-button-secondary px-4"
                >
                  <Printer size={15} /> {t("diet.print")}
                </button>
                <button onClick={() => setPlan(null)} className="clinical-button-secondary px-4">
                  {t("diet.newPlan")}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {plan.plan.map((day) => (
                <div key={day.day} className="clinical-panel premium-card scroll-reveal p-5">
                  <h3 className="font-display text-lg font-bold text-primary">{day.day}</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MealCard title={t("diet.breakfast")} meal={day.breakfast} />
                    <MealCard title={t("diet.lunch")} meal={day.lunch} />
                    <MealCard title={t("diet.dinner")} meal={day.dinner} />
                  </div>
                  {day.snacks.length > 0 && (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {t("diet.snacks")}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {day.snacks.map((s, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-border bg-background/60 px-3 py-1 text-xs"
                          >
                            {s.name}
                            {s.calories ? ` · ${s.calories} ${t("diet.calories")}` : ""}
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
                <div className="mb-3 flex items-center gap-2">
                  <Lightbulb size={16} className="text-primary" />
                  <span className="font-mono text-[11px] uppercase tracking-widest text-primary">
                    {t("diet.tips")}
                  </span>
                </div>
                <ul className="space-y-2">
                  {plan.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-[10px] text-primary">
                        {i + 1}
                      </span>
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

function Choice({
  label,
  help,
  options,
  selected,
  onSelect,
  multi = false,
}: {
  label: string;
  help?: string;
  options: { id: string; label: string }[];
  selected: string[];
  onSelect: (id: string) => void;
  multi?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-foreground">{label}</label>
      {help && <p className="mt-0.5 text-xs text-muted-foreground">{help}</p>}
      <div className="mt-3 flex flex-wrap gap-2" role={multi ? "group" : "radiogroup"}>
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={active}
              onClick={() => onSelect(option.id)}
              className={`interaction-lift min-h-11 rounded-lg border px-4 py-2 text-sm font-medium ${
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background/60 text-muted-foreground hover:border-primary/40"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MealCard({
  title,
  meal,
}: {
  title: string;
  meal: { name: string; description: string; calories?: number | null; nutrients?: string | null };
}) {
  return (
    <div className="interaction-lift rounded-lg border border-border bg-background/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-sm font-semibold">{meal.name}</p>
      <p className="mt-1 text-xs text-muted-foreground">{meal.description}</p>
      {(meal.calories || meal.nutrients) && (
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {meal.calories && <span>{meal.calories} cal</span>}
          {meal.calories && meal.nutrients && <span className="text-border">|</span>}
          {meal.nutrients && <span>{meal.nutrients}</span>}
        </div>
      )}
    </div>
  );
}

import { Languages } from "lucide-react";
import { useLanguage, type Lang } from "@/lib/i18n";

const options: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  // Always shown in Urdu script — a user looking for Urdu recognises this,
  // not the word "Urdu" written in English.
  { id: "ur", label: "اردو" },
];

/**
 * App-wide language toggle. Every instance reads and writes the same state,
 * so switching here changes the whole app, not just the current page.
 */
export function LanguageSwitch({ size = "sm" }: { size?: "sm" | "md" }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div
      className="flex gap-1 rounded-md border border-border bg-background/60 p-1"
      role="group"
      aria-label={t("lang.switch")}
    >
      {options.map((option) => {
        const active = lang === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setLang(option.id)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded font-medium transition-colors ${
              size === "md" ? "px-3 py-2 text-sm" : "px-2.5 py-1 text-xs"
            } ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {size === "md" && <Languages size={15} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

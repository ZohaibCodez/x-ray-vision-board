/**
 * Application language (English / Urdu).
 *
 * The Settings page used to store a `language` value on the profile that
 * nothing ever read, and the Chat and Diet pages each kept their own toggle
 * that reset to English on every mount — so switching language did nothing.
 * This module is the single source of truth: it persists the choice, applies
 * `lang`/`dir` to <html>, and hands every screen its strings.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "ur";

export const STORAGE_KEY = "xray_lang";

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "ur";
}

// ── Strings ───────────────────────────────────────────────────────

const strings = {
  // Navigation / shell
  "nav.dashboard": { en: "Dashboard", ur: "ڈیش بورڈ" },
  "nav.analyze": { en: "New Analysis", ur: "نیا تجزیہ" },
  "nav.chat": { en: "Health Chat", ur: "ہیلتھ چیٹ" },
  "nav.diet": { en: "Diet Planner", ur: "کھانے کا پلان" },
  "nav.clinics": { en: "Clinics", ur: "کلینک" },
  "nav.history": { en: "History", ur: "ریکارڈ" },
  "nav.profile": { en: "Profile", ur: "پروفائل" },
  "nav.settings": { en: "Settings", ur: "سیٹنگز" },
  "nav.docs": { en: "Docs", ur: "دستاویزات" },
  "nav.support": { en: "Support", ur: "مدد" },

  "shell.workspace": { en: "Workspace", ur: "ورک اسپیس" },
  "shell.skipToContent": { en: "Skip to content", ur: "مواد پر جائیں" },
  "shell.search": { en: "Search scans, findings...", ur: "اسکین یا نتائج تلاش کریں..." },
  "shell.searchLabel": { en: "Search workspace", ur: "ورک اسپیس میں تلاش کریں" },
  "shell.notifications": { en: "Notifications", ur: "اطلاعات" },
  "shell.notifNew": { en: "2 new", ur: "2 نئی" },
  "shell.notifModelsTitle": { en: "AI models are ready", ur: "اے آئی ماڈل تیار ہیں" },
  "shell.notifModelsBody": {
    en: "All 4 models loaded and online. You can start a new analysis.",
    ur: "چاروں ماڈل لوڈ ہو کر آن لائن ہیں۔ آپ نیا تجزیہ شروع کر سکتے ہیں۔",
  },
  "shell.notifEduTitle": { en: "Educational reminder", ur: "تعلیمی یاد دہانی" },
  "shell.notifEduBody": {
    en: "This tool is for educational use only. Always consult a licensed clinician.",
    ur: "یہ ٹول صرف تعلیمی مقصد کے لیے ہے۔ ہمیشہ مستند ڈاکٹر سے مشورہ کریں۔",
  },
  "shell.notifJustNow": { en: "Just now", ur: "ابھی ابھی" },
  "shell.notifToday": { en: "Today", ur: "آج" },
  "shell.notifDismiss": { en: "Dismiss all", ur: "سب ہٹا دیں" },
  "shell.signOut": { en: "Sign out", ur: "سائن آؤٹ" },
  "shell.openNav": { en: "Open navigation", ur: "مینو کھولیں" },
  "shell.closeNav": { en: "Close navigation", ur: "مینو بند کریں" },
  "shell.expandSidebar": { en: "Expand sidebar", ur: "سائیڈ بار کھولیں" },
  "shell.collapseSidebar": { en: "Collapse sidebar", ur: "سائیڈ بار بند کریں" },
  "shell.collapse": { en: "Collapse", ur: "سمیٹیں" },
  "shell.aiEnsemble": { en: "AI Ensemble", ur: "اے آئی ماڈلز" },
  "shell.modelsOnline": { en: "4 models online", ur: "4 ماڈل آن لائن" },
  "shell.educationalOnly": { en: "Educational use only", ur: "صرف تعلیمی استعمال" },
  "shell.user": { en: "User", ur: "صارف" },
  "shell.medicalStudent": { en: "Medical Student", ur: "میڈیکل طالبِ علم" },
  "shell.goToDashboard": { en: "Go to dashboard", ur: "ڈیش بورڈ پر جائیں" },
  "shell.goToHome": { en: "Go to home", ur: "ہوم پیج پر جائیں" },

  // Language switcher
  "lang.label": { en: "Language", ur: "زبان" },
  "lang.english": { en: "English", ur: "انگریزی" },
  "lang.urdu": { en: "Urdu", ur: "اردو" },
  "lang.switch": { en: "Change language", ur: "زبان تبدیل کریں" },

  // Chat
  "chat.title": { en: "Health Chat", ur: "ہیلتھ چیٹ" },
  "chat.assistant": { en: "XRayVision Health Assistant", ur: "ایکسرے وژن ہیلتھ اسسٹنٹ" },
  "chat.subtitle": {
    en: "Ask about symptoms, diseases, remedies, or diet",
    ur: "علامات، بیماریوں، گھریلو علاج یا کھانے کے بارے میں پوچھیں",
  },
  "chat.newChat": { en: "New Chat", ur: "نئی چیٹ" },
  "chat.emptyTitle": { en: "Start a health conversation", ur: "صحت کے بارے میں بات شروع کریں" },
  "chat.emptyBody": {
    en: "Ask about symptoms, get home remedies, or request a diet plan",
    ur: "علامات بتائیں، گھریلو علاج پوچھیں، یا کھانے کا پلان بنوائیں",
  },
  "chat.suggest.1": { en: "I have a headache and fever", ur: "مجھے سر درد اور بخار ہے" },
  "chat.suggest.2": { en: "Home remedies for sore throat", ur: "گلے کی خراش کا گھریلو علاج" },
  "chat.suggest.3": { en: "Which doctor for back pain?", ur: "کمر درد کے لیے کون سا ڈاکٹر؟" },
  "chat.suggest.4": { en: "Diet plan for diabetes", ur: "شوگر کے مریض کے لیے کھانے کا پلان" },
  "chat.placeholder": {
    en: "Describe your symptoms or ask a health question...",
    ur: "اپنی علامات بتائیں یا صحت سے متعلق سوال پوچھیں...",
  },
  "chat.thinking": { en: "Thinking...", ur: "سوچ رہا ہے..." },
  "chat.send": { en: "Send message", ur: "پیغام بھیجیں" },
  "chat.startVoice": { en: "Start voice input", ur: "بول کر لکھوائیں" },
  "chat.stopVoice": { en: "Stop listening", ur: "سننا بند کریں" },
  "chat.voiceUnsupported": {
    en: "Voice input is not supported in this browser. Try Chrome.",
    ur: "اس براؤزر میں بول کر لکھوانے کی سہولت نہیں ہے۔ کروم استعمال کریں۔",
  },
  "chat.specialist": { en: "Recommended specialist", ur: "تجویز کردہ ماہر ڈاکٹر" },
  "chat.remedies": { en: "Home remedies", ur: "گھریلو علاج" },
  "chat.unavailable": {
    en: "The health assistant is unavailable right now.",
    ur: "ہیلتھ اسسٹنٹ اس وقت دستیاب نہیں ہے۔",
  },
  "chat.retry": { en: "Try again", ur: "دوبارہ کوشش کریں" },

  // Diet
  "diet.title": { en: "Diet Planner", ur: "کھانے کا پلان" },
  "diet.heading": { en: "Make My Meal Plan", ur: "میرا کھانے کا پلان بنائیں" },
  "diet.subtitle": {
    en: "A simple 7-day plan of everyday Pakistani home food",
    ur: "روزمرہ کے پاکستانی گھریلو کھانوں پر مبنی سات دن کا آسان پلان",
  },
  "diet.conditionLabel": { en: "Do you have any health problem?", ur: "کیا آپ کو کوئی بیماری ہے؟" },
  "diet.conditionHelp": { en: "Optional — leave blank if none", ur: "اختیاری — کوئی نہیں تو خالی چھوڑ دیں" },
  "diet.condition.none": { en: "No health problem", ur: "کوئی بیماری نہیں" },
  "diet.condition.sugar": { en: "Sugar (diabetes)", ur: "شوگر" },
  "diet.condition.bp": { en: "Blood pressure", ur: "بلڈ پریشر" },
  "diet.condition.heart": { en: "Heart problem", ur: "دل کی تکلیف" },
  "diet.condition.kidney": { en: "Kidney problem", ur: "گردے کی تکلیف" },
  "diet.condition.weight": { en: "Weight loss", ur: "وزن کم کرنا" },

  "diet.foodLabel": { en: "What do you eat?", ur: "آپ کیا کھاتے ہیں؟" },
  "diet.food.everything": { en: "Everything", ur: "سب کچھ" },
  "diet.food.noMeat": { en: "No meat", ur: "گوشت نہیں" },
  "diet.food.noBeef": { en: "No beef", ur: "بیف نہیں" },

  "diet.avoidLabel": { en: "Anything you cannot eat?", ur: "کوئی چیز جو آپ نہیں کھا سکتے؟" },
  "diet.avoid.egg": { en: "Egg", ur: "انڈا" },
  "diet.avoid.milk": { en: "Milk / dahi", ur: "دودھ / دہی" },
  "diet.avoid.wheat": { en: "Wheat / roti", ur: "گندم / روٹی" },
  "diet.avoid.nuts": { en: "Nuts", ur: "خشک میوہ" },

  "diet.generate": { en: "Make My Plan", ur: "میرا پلان بنائیں" },
  "diet.generating": { en: "Making your plan...", ur: "آپ کا پلان بن رہا ہے..." },
  "diet.disclaimer": {
    en: "This is general food guidance, not medical treatment. If you have sugar, blood pressure, kidney disease, are pregnant, or take any medicine, show this plan to your doctor first.",
    ur: "یہ صرف عام غذائی رہنمائی ہے، علاج نہیں۔ اگر آپ کو شوگر، بلڈ پریشر، گردے کی تکلیف ہو، آپ حاملہ ہوں یا کوئی دوا لے رہے ہوں تو یہ پلان پہلے اپنے ڈاکٹر کو دکھائیں۔",
  },
  "diet.yourPlan": { en: "Your Plan", ur: "آپ کا پلان" },
  "diet.newPlan": { en: "Make a New Plan", ur: "نیا پلان بنائیں" },
  "diet.breakfast": { en: "Breakfast", ur: "ناشتہ" },
  "diet.lunch": { en: "Lunch", ur: "دوپہر کا کھانا" },
  "diet.dinner": { en: "Dinner", ur: "رات کا کھانا" },
  "diet.snacks": { en: "Snacks", ur: "ہلکا پھلکا" },
  "diet.tips": { en: "Simple Tips", ur: "آسان مشورے" },
  "diet.calories": { en: "cal", ur: "کیلوریز" },
  "diet.failed": { en: "Could not make the plan. Please try again.", ur: "پلان نہیں بن سکا۔ دوبارہ کوشش کریں۔" },
  "diet.print": { en: "Print / Save", ur: "پرنٹ / محفوظ کریں" },

  // Settings
  "settings.title": { en: "Settings", ur: "سیٹنگز" },
  "settings.kicker": { en: "Workspace controls", ur: "ورک اسپیس کنٹرول" },
  "settings.heading": {
    en: "Personalize your diagnostic workspace",
    ur: "اپنے ورک اسپیس کو اپنی مرضی کے مطابق بنائیں",
  },
  "settings.intro": {
    en: "Theme, analysis defaults, overlays, language, and notifications are stored with your profile.",
    ur: "تھیم، تجزیے کی ترتیبات، اوورلے، زبان اور اطلاعات آپ کی پروفائل کے ساتھ محفوظ ہوتی ہیں۔",
  },
  "settings.appearance": { en: "Appearance", ur: "ظاہری شکل" },
  "settings.appearanceDesc": {
    en: "Choose the visual mode and interface language.",
    ur: "تھیم اور ایپ کی زبان منتخب کریں۔",
  },
  "settings.theme": { en: "Theme", ur: "تھیم" },
  "settings.theme.light": { en: "Light", ur: "روشن" },
  "settings.theme.dark": { en: "Dark", ur: "گہرا" },
  "settings.theme.system": { en: "System", ur: "سسٹم" },
  "settings.languageHelp": {
    en: "Applies to the whole app right away, including the health chat and meal plans.",
    ur: "پوری ایپ پر فوراً لاگو ہوتا ہے، بشمول ہیلتھ چیٹ اور کھانے کے پلان۔",
  },
  "settings.analysis": { en: "Analysis Preferences", ur: "تجزیے کی ترجیحات" },
  "settings.analysisDesc": {
    en: "Set defaults for model confidence and visual overlays.",
    ur: "ماڈل کی کانفیڈنس اور اوورلے کی ترتیبات مقرر کریں۔",
  },
  "settings.confidence": { en: "Confidence Threshold", ur: "کانفیڈنس کی حد" },
  "settings.moreSensitive": { en: "More sensitive", ur: "زیادہ حساس" },
  "settings.moreConservative": { en: "More conservative", ur: "زیادہ محتاط" },
  "settings.showBoxes": { en: "Show AI detection boxes on images", ur: "تصویروں پر اے آئی کے باکس دکھائیں" },
  "settings.showHeatmap": { en: "Show confidence heatmap overlay", ur: "ہیٹ میپ اوورلے دکھائیں" },
  "settings.notifications": { en: "Notifications", ur: "اطلاعات" },
  "settings.notificationsDesc": {
    en: "Control alert behavior for urgent reports.",
    ur: "ضروری رپورٹس کی اطلاعات کنٹرول کریں۔",
  },
  "settings.emailAlerts": {
    en: "Email notifications for critical findings",
    ur: "اہم نتائج پر ای میل اطلاع",
  },
  "settings.persistNote": {
    en: "Settings apply immediately in this browser and persist after saving.",
    ur: "سیٹنگز اسی وقت لاگو ہو جاتی ہیں اور محفوظ کرنے کے بعد برقرار رہتی ہیں۔",
  },
  "settings.save": { en: "Save Settings", ur: "سیٹنگز محفوظ کریں" },
  "settings.saved": { en: "Saved", ur: "محفوظ ہو گیا" },
} as const;

export type StringKey = keyof typeof strings;

// ── Context ───────────────────────────────────────────────────────

interface LanguageContextValue {
  lang: Lang;
  dir: "ltr" | "rtl";
  isUrdu: boolean;
  setLang: (lang: Lang) => void;
  t: (key: StringKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isLang(stored) ? stored : "en";
  } catch {
    return "en";
  }
}

/** Apply the language to <html> so `dir`-aware CSS and screen readers follow. */
export function applyLanguage(lang: Lang) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ur" ? "rtl" : "ltr";
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private mode — the in-memory choice still works for this session.
  }
}

export function LanguageProvider({
  children,
  profileLanguage,
  onChange,
}: {
  children: ReactNode;
  /** `settings.language` from the signed-in profile, when there is one. */
  profileLanguage?: unknown;
  /**
   * Called whenever the user picks a language, so the caller can persist it
   * to the signed-in profile. Without this, a switch made anywhere outside
   * the Settings page's "Save" button only lived in localStorage — the next
   * login would restore whatever language was last explicitly saved there,
   * which is why the app kept reverting to Urdu after logging back in.
   */
  onChange?: (lang: Lang) => void;
}) {
  const [lang, setLangState] = useState<Lang>("en");

  // Restore on mount. Kept out of useState's initializer so the server and the
  // first client render agree, avoiding a hydration mismatch.
  useEffect(() => {
    const initial = readStoredLang();
    setLangState(initial);
    applyLanguage(initial);
  }, []);

  // A saved profile preference wins over whatever this browser had.
  useEffect(() => {
    if (isLang(profileLanguage)) {
      setLangState(profileLanguage);
      applyLanguage(profileLanguage);
    }
  }, [profileLanguage]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      applyLanguage(next);
      onChange?.(next);
    },
    [onChange],
  );

  const t = useCallback(
    (key: StringKey) => {
      const entry = strings[key];
      if (!entry) return key;
      return entry[lang] || entry.en;
    },
    [lang],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      dir: lang === "ur" ? "rtl" : "ltr",
      isUrdu: lang === "ur",
      setLang,
      t,
    }),
    [lang, setLang, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Access the current language and translator.
 *
 * Falls back to English outside a provider so a stray component never crashes
 * the page it is on.
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;

  return {
    lang: "en",
    dir: "ltr",
    isUrdu: false,
    setLang: () => {},
    t: (key: StringKey) => strings[key]?.en ?? key,
  };
}

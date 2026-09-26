import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPin,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Salad,
  ScanLine,
  Search,
  Settings,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/lib/auth-context";
import { useLanguage, type StringKey } from "@/lib/i18n";
import { LanguageSwitch } from "@/components/app/LanguageSwitch";

const navItems = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { to: "/analyze", labelKey: "nav.analyze", icon: ScanLine },
  { to: "/chat", labelKey: "nav.chat", icon: MessageSquare },
  { to: "/diet", labelKey: "nav.diet", icon: Salad },
  { to: "/clinics", labelKey: "nav.clinics", icon: MapPin },
  { to: "/history", labelKey: "nav.history", icon: History },
  { to: "/profile", labelKey: "nav.profile", icon: User },
  { to: "/settings", labelKey: "nav.settings", icon: Settings },
] as const satisfies readonly { to: string; labelKey: StringKey; icon: typeof User }[];

const secondaryNav = [
  { to: "/docs", labelKey: "nav.docs", icon: BookOpen },
  { to: "/support", labelKey: "nav.support", icon: LifeBuoy },
] as const satisfies readonly { to: string; labelKey: StringKey; icon: typeof User }[];

export function AppShell({
  children,
  title,
  titleKey,
}: {
  children: ReactNode;
  /** Fallback title, used when `titleKey` is not given. */
  title: string;
  /** Preferred: a translation key, so the header follows the app language. */
  titleKey?: StringKey;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { t, term } = useLanguage();
  const navigate = useNavigate();

  // The desktop "collapse to icons" toggle is plain component state, not a
  // media query — without this, collapsing the sidebar on desktop and then
  // opening it on mobile (or just resizing down) showed the same icon-only
  // layout there too, since the mobile drawer isn't meant to ever collapse.
  const expanded = !collapsed || mobileOpen;

  // Close notification panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/auth/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const initials = useMemo(() => {
    if (!user?.full_name) return "XR";
    return user.full_name
      .split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [user?.full_name]);

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <div className="clinical-page relative min-h-dvh text-foreground">
      <a href="#main-content" className="skip-link">
        {t("shell.skipToContent")}
      </a>
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-45" />

      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm md:hidden"
          aria-label={t("shell.closeNav")}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`app-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-white/88 shadow-[var(--shadow-lg)] backdrop-blur-xl transition-all duration-200 dark:bg-card/88 md:visible md:translate-x-0 md:pointer-events-auto ${
          collapsed ? "md:w-20" : "md:w-72"
        } ${
          mobileOpen
            ? "is-onscreen w-72 translate-x-0 visible pointer-events-auto"
            : // `invisible`/`pointer-events-none` are the real guard here, not the
              // transform: under RTL, translating this off-canvas can silently fail
              // to move it (a transform + backdrop-blur + dir-flip quirk), which left
              // the "closed" drawer sitting on top of the page, blocking the hamburger
              // button. Hiding it outright means it can't block clicks either way.
              "is-offscreen invisible pointer-events-none w-72 -translate-x-full md:w-auto"
        }`}
      >
        <div className={`flex h-18 items-center justify-between border-b border-border ${collapsed && !mobileOpen ? "md:justify-center" : "px-5"}`}>
          <Link to="/" className="group flex min-h-12 items-center gap-3" aria-label={t("shell.goToHome")}>
            <Logo size={30} />
            {expanded && (
              <span className="font-display text-lg font-extrabold transition-colors group-hover:text-primary">
                XRayVision <span className="text-gradient-medical">AI</span>
              </span>
            )}
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground interaction-lift hover:bg-surface hover:text-foreground md:hidden"
            aria-label={t("shell.closeNav")}
          >
            <X size={18} />
          </button>
        </div>

        {/* On mobile the header is too narrow for this next to the title and
            user card, so it gets its own row here instead. */}
        {expanded && (
          <div className="flex items-center justify-between border-b border-border px-5 py-3 md:hidden">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("lang.label")}</span>
            <LanguageSwitch />
          </div>
        )}

        <div className={`px-4 py-4 ${collapsed && !mobileOpen ? "md:px-3" : ""}`}>
          {expanded && (
            <div className="clinical-panel-strong premium-card p-3">
              <div className="flex items-center gap-2">
                <span className="status-dot flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Activity size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold">{t("shell.aiEnsemble")}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{t("shell.modelsOnline")}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.to || pathname.startsWith(item.to + "/");
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? "page" : undefined}
                    title={!expanded ? t(item.labelKey) : undefined}
                    className={`group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm interaction-lift ${
                      active
                        ? "nav-item-active bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
                        : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-surface"
                    } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                  >
                    <item.icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
                    {expanded && <span className="font-semibold">{t(item.labelKey)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {expanded && (
            <>
              <div className="my-5 border-t border-border" />
              <ul className="space-y-1">
                {secondaryNav.map((item) => (
                  <li key={item.labelKey}>
                    <Link
                      to={item.to}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground interaction-lift hover:bg-white hover:text-foreground dark:hover:bg-surface"
                    >
                      <item.icon size={18} />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="border-t border-border p-3">
          {expanded ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning">
              <ShieldCheck size={15} />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">{t("shell.educationalOnly")}</span>
            </div>
          ) : (
            <div className="mb-3 hidden justify-center text-warning md:flex">
              <ShieldCheck size={16} />
            </div>
          )}
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="hidden min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-muted-foreground interaction-lift hover:text-foreground dark:bg-surface md:flex"
            aria-label={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
          >
            {collapsed ? <ChevronRight size={15} className="rtl-flip" /> : <ChevronLeft size={15} className="rtl-flip" />}
            {!collapsed && <span className="text-xs font-semibold">{t("shell.collapse")}</span>}
          </button>
        </div>
      </aside>

      <div
        className={`relative flex min-h-dvh flex-col transition-[padding] duration-200 ${
          collapsed ? "app-content-collapsed md:pl-20" : "app-content-expanded md:pl-72"
        }`}
      >
        <header className="sticky top-0 z-20 flex min-h-18 items-center gap-4 border-b border-border bg-white/78 px-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl dark:bg-background/78 md:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground interaction-lift dark:bg-card md:hidden"
            aria-label={t("shell.openNav")}
          >
            <PanelLeftOpen size={18} className="rtl-flip" />
          </button>

          <button
            onClick={() => setCollapsed((value) => !value)}
            className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground interaction-lift hover:text-foreground dark:bg-card md:flex"
            aria-label={collapsed ? t("shell.expandSidebar") : t("shell.collapseSidebar")}
          >
            {collapsed ? <PanelLeftOpen size={18} className="rtl-flip" /> : <PanelLeftClose size={18} className="rtl-flip" />}
          </button>

          <div className="min-w-0 flex-1 md:flex-none">
            <p className="clinical-kicker hidden md:block">{t("shell.workspace")}</p>
            <h1 className="truncate font-display text-lg font-extrabold md:text-xl">
              {titleKey ? t(titleKey) : title}
            </h1>
          </div>

          <div className="ms-auto flex shrink-0 items-center gap-2 sm:gap-3">
            {/* On mobile this lives inside the sidebar drawer instead — the
                header is too narrow to fit it next to the title and user card. */}
            <div className="hidden md:block">
              <LanguageSwitch />
            </div>
            <label className="relative hidden lg:block">
              <span className="sr-only">{t("shell.searchLabel")}</span>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder={t("shell.search")}
                className="premium-input h-11 w-[300px] rounded-lg border border-border bg-white/80 pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none dark:bg-card/80"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground xl:block">
                Ctrl K
              </span>
            </label>
            <div className="relative" ref={notifRef}>
              <button
                aria-label={t("shell.notifications")}
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground interaction-lift hover:border-primary/40 hover:text-foreground dark:bg-card"
              >
                <Bell size={17} />
                <span className="status-dot absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warning text-warning" />
              </button>

              {notifOpen && (
                <div className="absolute end-0 top-14 z-50 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-white shadow-[var(--shadow-lg)] backdrop-blur-xl dark:bg-card">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <p className="text-sm font-bold">{t("shell.notifications")}</p>
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase text-warning">{t("shell.notifNew")}</span>
                  </div>
                  <ul className="divide-y divide-border">
                    <li className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Activity size={14} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold">{t("shell.notifModelsTitle")}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{t("shell.notifModelsBody")}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">{t("shell.notifJustNow")}</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3 px-4 py-3">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                        <ShieldCheck size={14} />
                      </span>
                      <div>
                        <p className="text-xs font-semibold">{t("shell.notifEduTitle")}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{t("shell.notifEduBody")}</p>
                        <p className="mt-1 font-mono text-[10px] text-muted-foreground/60">{t("shell.notifToday")}</p>
                      </div>
                    </li>
                  </ul>
                  <div className="border-t border-border px-4 py-2">
                    <button onClick={() => setNotifOpen(false)} className="w-full rounded-lg py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">
                      {t("shell.notifDismiss")}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-2 shadow-[var(--shadow-sm)] dark:bg-card">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="max-w-36 truncate text-xs font-bold">{user?.full_name || t("shell.user")}</p>
                <p className="max-w-36 truncate text-[11px] text-muted-foreground">{term(user?.role) || t("shell.medicalStudent")}</p>
              </div>
              <button
                onClick={handleLogout}
                aria-label={t("shell.signOut")}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground interaction-lift hover:bg-surface hover:text-foreground"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 md:px-8 md:py-8" tabIndex={-1}>
          <div className="mx-auto w-full max-w-[1440px] animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}

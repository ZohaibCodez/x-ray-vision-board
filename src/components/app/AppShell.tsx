import { useEffect, useMemo, useState, type ReactNode } from "react";
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
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "New Analysis", icon: ScanLine },
  { to: "/chat", label: "Health Chat", icon: MessageSquare },
  { to: "/diet", label: "Diet Planner", icon: Salad },
  { to: "/clinics", label: "Clinics", icon: MapPin },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const secondaryNav = [
  { to: "/dashboard", label: "Docs", icon: BookOpen },
  { to: "/dashboard", label: "Support", icon: LifeBuoy },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();

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
        Skip to content
      </a>
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-45" />

      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm md:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-white/88 shadow-[var(--shadow-lg)] backdrop-blur-xl transition-all duration-200 dark:bg-card/88 md:translate-x-0 ${
          collapsed ? "md:w-20" : "md:w-72"
        } ${mobileOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full md:w-auto"}`}
      >
        <div className={`flex h-18 items-center border-b border-border ${collapsed ? "md:justify-center" : "px-5"}`}>
          <Link to="/dashboard" className="group flex min-h-12 items-center gap-3" aria-label="Go to dashboard">
            <Logo size={30} />
            {!collapsed && (
              <span className="font-display text-lg font-extrabold transition-colors group-hover:text-primary">
                XRayVision <span className="text-gradient-medical">AI</span>
              </span>
            )}
          </Link>
        </div>

        <div className={`px-4 py-4 ${collapsed ? "md:px-3" : ""}`}>
          {!collapsed && (
            <div className="clinical-panel-strong premium-card p-3">
              <div className="flex items-center gap-2">
                <span className="status-dot flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Activity size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold">AI Ensemble</p>
                  <p className="font-mono text-[10px] text-muted-foreground">4 models online</p>
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
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm interaction-lift ${
                      active
                        ? "nav-item-active bg-primary text-primary-foreground shadow-[var(--shadow-sm)]"
                        : "text-muted-foreground hover:bg-white hover:text-foreground dark:hover:bg-surface"
                    } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                  >
                    <item.icon size={18} className="shrink-0 transition-transform duration-200 group-hover:scale-105" />
                    {!collapsed && <span className="font-semibold">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {!collapsed && (
            <>
              <div className="my-5 border-t border-border" />
              <ul className="space-y-1">
                {secondaryNav.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-muted-foreground interaction-lift hover:bg-white hover:text-foreground dark:hover:bg-surface"
                    >
                      <item.icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        <div className="border-t border-border p-3">
          {!collapsed ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-warning">
              <ShieldCheck size={15} />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">Educational use only</span>
            </div>
          ) : (
            <div className="mb-3 hidden justify-center text-warning md:flex">
              <ShieldCheck size={16} />
            </div>
          )}
          <button
            onClick={() => setCollapsed((value) => !value)}
            className="hidden min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-white text-muted-foreground interaction-lift hover:text-foreground dark:bg-surface md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && <span className="text-xs font-semibold">Collapse</span>}
          </button>
        </div>
      </aside>

      <div className={`relative flex min-h-dvh flex-col transition-[padding] duration-200 ${collapsed ? "md:pl-20" : "md:pl-72"}`}>
        <header className="sticky top-0 z-20 flex min-h-18 items-center gap-4 border-b border-border bg-white/78 px-4 shadow-[0_1px_0_rgba(15,23,42,0.03)] backdrop-blur-xl dark:bg-background/78 md:px-8">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground interaction-lift dark:bg-card md:hidden"
            aria-label="Open navigation"
          >
            <PanelLeftOpen size={18} />
          </button>

          <button
            onClick={() => setCollapsed((value) => !value)}
            className="hidden h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground interaction-lift hover:text-foreground dark:bg-card md:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>

          <div>
            <p className="clinical-kicker hidden md:block">Workspace</p>
            <h1 className="font-display text-lg font-extrabold md:text-xl">{title}</h1>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <label className="relative hidden lg:block">
              <span className="sr-only">Search workspace</span>
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search scans, findings..."
                className="premium-input h-11 w-[300px] rounded-lg border border-border bg-white/80 pl-9 pr-16 text-sm placeholder:text-muted-foreground focus:outline-none dark:bg-card/80"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground xl:block">
                Ctrl K
              </span>
            </label>
            <button
              aria-label="Notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-white text-muted-foreground interaction-lift hover:border-primary/40 hover:text-foreground dark:bg-card"
            >
              <Bell size={17} />
              <span className="status-dot absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-warning text-warning" />
            </button>
            <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-white px-2 shadow-[var(--shadow-sm)] dark:bg-card">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <div className="hidden sm:block">
                <p className="max-w-36 truncate text-xs font-bold">{user?.full_name || "User"}</p>
                <p className="max-w-36 truncate text-[11px] text-muted-foreground">{user?.role || "Medical Student"}</p>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
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

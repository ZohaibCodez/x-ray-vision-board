import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ScanLine, History, User, Settings, BookOpen, LifeBuoy,
  Bell, Search, ChevronLeft, ChevronRight, LogOut,
} from "lucide-react";
import { Logo } from "@/components/landing/Logo";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/analyze", label: "New Analysis", icon: ScanLine },
  { to: "/history", label: "History", icon: History },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const secondaryNav = [
  { to: "/dashboard", label: "Documentation", icon: BookOpen },
  { to: "/dashboard", label: "Support", icon: LifeBuoy },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0" style={{ background: "var(--gradient-hero)" }} />
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-20" />

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-surface/80 backdrop-blur-md transition-[width] duration-200 ease-in-out md:flex ${
            collapsed ? "w-16" : "w-60"
          }`}
        >
          <div className={`flex h-16 items-center border-b border-border ${collapsed ? "justify-center" : "px-5"}`}>
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <Logo size={26} />
              {!collapsed && (
                <span className="font-display text-base font-bold">
                  XRayVision <span className="text-primary">AI</span>
                </span>
              )}
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-5">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-card hover:text-foreground"
                      }`}
                    >
                      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />}
                      <item.icon size={18} className="shrink-0" />
                      {!collapsed && <span className="font-medium">{item.label}</span>}
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
                      <a
                        href="#"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                      >
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </nav>

          <div className={`border-t border-border p-3 ${collapsed ? "items-center" : ""}`}>
            {!collapsed ? (
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">v2.1</span>
                <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-warning">
                  Edu Only
                </span>
              </div>
            ) : (
              <div className="flex justify-center">
                <span className="font-mono text-[9px] uppercase tracking-widest text-warning">EDU</span>
              </div>
            )}
            <button
              onClick={() => setCollapsed((c) => !c)}
              className="mt-3 flex w-full items-center justify-center rounded-md border border-border bg-background/60 py-1.5 text-muted-foreground hover:text-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className={`flex w-full flex-1 flex-col transition-[padding] duration-200 ${collapsed ? "md:pl-16" : "md:pl-60"}`}>
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
            <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
              <Logo size={22} />
            </Link>
            <h1 className="hidden font-display text-lg font-bold md:block">{title}</h1>
            <div className="ml-auto flex items-center gap-3">
              <div className="relative hidden lg:block">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search scans, findings..."
                  className="w-[280px] rounded-md border border-border bg-card/60 py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button
                aria-label="Notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card/60 text-muted-foreground hover:border-primary/60 hover:text-foreground"
              >
                <Bell size={16} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive shadow-[0_0_8px_rgba(255,71,87,0.8)]" />
              </button>
              <div className="flex items-center gap-3 rounded-md border border-border bg-card/60 px-2 py-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 font-mono text-xs font-semibold text-primary">
                  DR
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold leading-tight">Dr. Reyes</div>
                  <div className="text-[10px] leading-tight text-muted-foreground">Radiologist</div>
                </div>
                <Link to="/" aria-label="Sign out" className="text-muted-foreground hover:text-foreground">
                  <LogOut size={14} />
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="animate-fade-up">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

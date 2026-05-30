/**
 * Authentication context and provider.
 *
 * Wraps the app to provide auth state, login/register/logout functions,
 * and a hook to access them from any component.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { authApi } from "./api";
import type { UserProfile } from "./types";

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: string) => Promise<void>;
  updateProfile: (params: { full_name?: string; role?: string; avatar_url?: string | null }) => Promise<void>;
  updateSettings: (settings: Record<string, unknown>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function applyTheme(theme: unknown) {
  if (typeof window === "undefined") return;
  const selected = typeof theme === "string" ? theme : localStorage.getItem("xray_theme") || "system";
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = selected === "dark" || (selected === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  localStorage.setItem("xray_theme", selected);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const stored = authApi.getStoredUser();
    if (stored) {
      setUser(stored);
      applyTheme(stored.settings?.theme);
    } else {
      applyTheme(localStorage.getItem("xray_theme") || "system");
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const onChange = () => {
      if ((localStorage.getItem("xray_theme") || user?.settings?.theme) === "system") {
        applyTheme("system");
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [user?.settings?.theme]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setUser(res.user);
    applyTheme(res.user.settings?.theme);
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string, role: string) => {
      const res = await authApi.register(email, password, fullName, role);
      setUser(res.user);
      applyTheme(res.user.settings?.theme);
    },
    [],
  );

  const updateProfile = useCallback(async (params: { full_name?: string; role?: string; avatar_url?: string | null }) => {
    const res = await authApi.updateProfile(params);
    setUser(res);
  }, []);

  const updateSettings = useCallback(async (settings: Record<string, unknown>) => {
    const res = await authApi.updateSettings(settings);
    setUser(res);
    applyTheme(res.settings?.theme);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    applyTheme(localStorage.getItem("xray_theme") || "system");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        updateProfile,
        updateSettings,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook to access authentication state and actions.
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

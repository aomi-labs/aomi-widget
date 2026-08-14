"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import styles from "./v2.module.css";

export type V2Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

const STORAGE_KEY = "aomi-v2-theme";
const HTML_CLASS = "aomi-v2-dark";

const ThemeContext = createContext<{
  theme: V2Theme;
  resolved: Resolved;
  setTheme: (theme: V2Theme) => void;
} | null>(null);

function readStoredTheme(): V2Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

function systemPrefersDark() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolveTheme(theme: V2Theme): Resolved {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

function applyHtmlHint(resolved: Resolved) {
  document.documentElement.classList.toggle(HTML_CLASS, resolved === "dark");
}

export function V2ThemeProvider({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const [theme, setThemeState] = useState<V2Theme>("system");
  const [resolved, setResolved] = useState<Resolved>("light");

  useEffect(() => {
    const next = readStoredTheme();
    setThemeState(next);
    const value = resolveTheme(next);
    setResolved(value);
    applyHtmlHint(value);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setResolved((current) => {
        const next = resolveTheme(theme);
        applyHtmlHint(next);
        return next === current ? current : next;
      });
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    return () => {
      document.documentElement.classList.remove(HTML_CLASS);
    };
  }, []);

  const setTheme = (next: V2Theme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    const value = resolveTheme(next);
    setResolved(value);
    applyHtmlHint(value);
  };

  const value = useMemo(
    () => ({ theme, resolved, setTheme }),
    [theme, resolved],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div
        className={`${styles.root} ${resolved === "dark" ? styles.dark : ""} ${className}`.trim()}
        data-theme={resolved}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useV2Theme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useV2Theme must be used within V2ThemeProvider");
  }
  return ctx;
}

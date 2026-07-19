export const COLOR_THEME_STORAGE_KEY = "aomi-build-color-theme";

export type ColorTheme = "light" | "dark";

export function resolveColorTheme(
  storedTheme: string | null,
  prefersDark: boolean,
): ColorTheme {
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;
  return prefersDark ? "dark" : "light";
}

export function applyColorTheme(theme: ColorTheme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.dataset.theme = theme;
}

export function readColorTheme(): ColorTheme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function saveColorTheme(theme: ColorTheme) {
  applyColorTheme(theme);
  try {
    window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, theme);
  } catch {
    // The applied theme should still work when storage is unavailable.
  }
}

export const COLOR_THEME_INIT_SCRIPT = `(() => {
  const root = document.documentElement;
  let stored = null;
  try { stored = window.localStorage.getItem(${JSON.stringify(COLOR_THEME_STORAGE_KEY)}); } catch {}
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.dataset.theme = theme;
})();`;

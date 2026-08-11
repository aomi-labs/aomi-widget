export const SETTINGS_STORAGE_KEY = "aomi_settings";

export type ColorMode = "light" | "dark" | "auto";

export function resolveColorMode(
  colorMode: ColorMode,
  prefersDark: boolean,
): "light" | "dark" {
  if (colorMode === "auto") return prefersDark ? "dark" : "light";
  return colorMode;
}

export const COLOR_MODE_INIT_SCRIPT = `(() => {
  const root = document.documentElement;
  let colorMode = "auto";
  try {
    const stored = JSON.parse(window.localStorage.getItem(${JSON.stringify(SETTINGS_STORAGE_KEY)}) || "null");
    if (stored?.colorMode === "light" || stored?.colorMode === "dark" || stored?.colorMode === "auto") {
      colorMode = stored.colorMode;
    }
  } catch {}
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  const theme = colorMode === "auto" ? (prefersDark ? "dark" : "light") : colorMode;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
})();`;

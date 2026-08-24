const AOMI_COLOR_THEME_STORAGE_KEY = "aomi-landing-color-theme";

function resolveAomiColorTheme() {
  let stored = null;
  try {
    stored = window.localStorage.getItem(AOMI_COLOR_THEME_STORAGE_KEY);
  } catch {}
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyAomiColorTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  for (const button of document.querySelectorAll(
    ".v3-reference-theme-toggle",
  )) {
    const nextTheme = theme === "dark" ? "light" : "dark";
    button.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
    button.setAttribute("title", `Switch to ${nextTheme} mode`);
    const icon = button.querySelector("span");
    if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
  }
}

function saveAomiColorTheme(theme) {
  applyAomiColorTheme(theme);
  try {
    window.localStorage.setItem(AOMI_COLOR_THEME_STORAGE_KEY, theme);
  } catch {}
}

function createAomiThemeToggle() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "v3-reference-theme-toggle";
  const icon = document.createElement("span");
  icon.setAttribute("aria-hidden", "true");
  button.append(icon);
  button.addEventListener("click", () => {
    const nextTheme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    saveAomiColorTheme(nextTheme);
  });
  return button;
}

applyAomiColorTheme(resolveAomiColorTheme());

document.addEventListener(
  "DOMContentLoaded",
  () => {
    window.setTimeout(() => {
      if (!document.querySelector(".v3-reference-theme-corner")) {
        const corner = document.createElement("div");
        corner.className = "v3-reference-theme-corner";
        corner.append(createAomiThemeToggle());
        document.body.append(corner);
      }
      applyAomiColorTheme(resolveAomiColorTheme());
    });
  },
  { once: true },
);

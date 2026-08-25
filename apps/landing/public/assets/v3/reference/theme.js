function applyAomiSystemTheme(prefersDark) {
  const theme = prefersDark ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

const aomiSystemTheme = window.matchMedia("(prefers-color-scheme: dark)");
applyAomiSystemTheme(aomiSystemTheme.matches);
aomiSystemTheme.addEventListener?.("change", (event) => {
  applyAomiSystemTheme(event.matches);
});

"use client";

import { Moon, Sun } from "lucide-react";
import { readColorTheme, saveColorTheme } from "../color-theme";
import themeStyles from "../marketing-theme.module.css";

export function ColorThemeToggle() {
  function toggleTheme() {
    const nextTheme = readColorTheme() === "dark" ? "light" : "dark";
    saveColorTheme(nextTheme);
  }

  return (
    <button
      type="button"
      className={themeStyles.toggle}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      onClick={toggleTheme}
    >
      <Moon className={themeStyles.moon} aria-hidden />
      <Sun className={themeStyles.sun} aria-hidden />
    </button>
  );
}

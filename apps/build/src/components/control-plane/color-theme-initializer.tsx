"use client";

import { useEffect } from "react";

import { watchColorTheme } from "@build/lib/color-theme";

export function ColorThemeInitializer() {
  useEffect(() => watchColorTheme(), []);
  return null;
}

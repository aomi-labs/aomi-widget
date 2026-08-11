import { afterEach, describe, expect, it, vi } from "vitest";

import {
  COLOR_THEME_STORAGE_KEY,
  resolveColorTheme,
  watchColorTheme,
} from "./color-theme";

describe("resolveColorTheme", () => {
  it("keeps an explicit saved theme", () => {
    expect(resolveColorTheme("light", true)).toBe("light");
    expect(resolveColorTheme("dark", false)).toBe("dark");
  });

  it("falls back to the system preference", () => {
    expect(resolveColorTheme(null, true)).toBe("dark");
    expect(resolveColorTheme("invalid", false)).toBe("light");
  });
});

describe("watchColorTheme", () => {
  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("tracks system changes until the user saves an explicit theme", () => {
    let prefersDark = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal(
      "matchMedia",
      () =>
        ({
          get matches() {
            return prefersDark;
          },
          addEventListener: (_event: string, listener: () => void) => {
            listeners.add(listener);
          },
          removeEventListener: (_event: string, listener: () => void) => {
            listeners.delete(listener);
          },
        }) as MediaQueryList,
    );

    const stop = watchColorTheme();
    expect(document.documentElement.dataset.theme).toBe("light");

    prefersDark = true;
    listeners.forEach((listener) => listener());
    expect(document.documentElement.dataset.theme).toBe("dark");

    window.localStorage.setItem(COLOR_THEME_STORAGE_KEY, "light");
    listeners.forEach((listener) => listener());
    expect(document.documentElement.dataset.theme).toBe("light");

    stop();
    expect(listeners.size).toBe(0);
  });
});

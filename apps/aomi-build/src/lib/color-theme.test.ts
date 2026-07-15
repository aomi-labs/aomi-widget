import { describe, expect, it } from "vitest";

import { resolveColorTheme } from "./color-theme";

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

import { describe, expect, it } from "vitest";

import { resolveColorMode } from "./color-theme";

describe("resolveColorMode", () => {
  it("follows the system preference in auto mode", () => {
    expect(resolveColorMode("auto", true)).toBe("dark");
    expect(resolveColorMode("auto", false)).toBe("light");
  });

  it("preserves explicit light and dark choices", () => {
    expect(resolveColorMode("light", true)).toBe("light");
    expect(resolveColorMode("dark", false)).toBe("dark");
  });
});

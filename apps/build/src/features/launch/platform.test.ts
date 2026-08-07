import { beforeEach, describe, expect, it } from "vitest";

import {
  platformHref,
  platformParam,
  readPlatform,
  writePlatform,
} from "./platform";

describe("platformParam", () => {
  it("trims, and defaults absent or repeated params to Community", () => {
    expect(platformParam("  somm.finance ")).toBe("somm.finance");
    // Build has no unscoped view: no usable param means the default platform.
    expect(platformParam(undefined)).toBe("community");
    expect(platformParam("")).toBe("community");
    expect(platformParam("   ")).toBe("community");
    // Next hands back an array when a param repeats; there is no single
    // platform to honour, so scope falls back to Community.
    expect(platformParam(["a", "b"])).toBe("community");
  });
});

describe("platformHref", () => {
  it("re-attaches the platform only before a Project exists", () => {
    expect(platformHref("/projects", "somm.finance")).toBe(
      "/projects?platform=somm.finance",
    );
    expect(platformHref("/operate/deployments/new", "somm.finance")).toBe(
      "/operate/deployments/new?platform=somm.finance",
    );
  });

  it("leaves routes that are not platform-scoped alone", () => {
    for (const href of [
      "/overview",
      "/settings/general",
      "/build",
      "/projects/3",
      "/integrations",
      "/operate/bots",
    ]) {
      expect(platformHref(href, "somm.finance")).toBe(href);
    }
  });

  it("does not double-append or invent a platform", () => {
    expect(platformHref("/projects?platform=a", "b")).toBe(
      "/projects?platform=a",
    );
    expect(platformHref("/projects", null)).toBe("/projects");
    expect(platformHref("/projects", undefined)).toBe("/projects");
  });

  it("encodes a platform name so it cannot open a second parameter", () => {
    expect(platformHref("/projects", "a&launch=bound")).toBe(
      "/projects?platform=a%26launch%3Dbound",
    );
  });
});

describe("platform storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips a selection and clears it", () => {
    expect(readPlatform()).toBeNull();
    writePlatform("  somm.finance  ");
    expect(readPlatform()).toBe("somm.finance");
    writePlatform(null);
    expect(readPlatform()).toBeNull();
  });

  it("treats a blank selection as none", () => {
    writePlatform("   ");
    expect(readPlatform()).toBeNull();
  });
});

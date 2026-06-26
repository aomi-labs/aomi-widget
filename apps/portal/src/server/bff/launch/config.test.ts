import { afterEach, describe, expect, it, vi } from "vitest";

import { launchConfig } from "./config";

describe("launchConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses community launch defaults", () => {
    const config = launchConfig();
    expect(config.platform).toBe("community");
    expect(config.sourceBranch).toBe("main");
    expect(config.aomiTomlPaths).toEqual(["aomi.toml"]);
    expect(config.targetTags).toEqual([]);
  });

  it("honors APP_DEPLOY env overrides and comma-separated values", () => {
    vi.stubEnv("APP_DEPLOY_PLATFORM", "partners");
    vi.stubEnv("APP_DEPLOY_SOURCE_BRANCH", "release");
    vi.stubEnv("APP_DEPLOY_AOMI_TOML_PATHS", "aomi.toml, agents/aomi.toml");
    vi.stubEnv("APP_DEPLOY_TARGET_TAGS", "staging, launch");

    const config = launchConfig();
    expect(config.platform).toBe("partners");
    expect(config.sourceBranch).toBe("release");
    expect(config.aomiTomlPaths).toEqual(["aomi.toml", "agents/aomi.toml"]);
    expect(config.targetTags).toEqual(["staging", "launch"]);
  });
});

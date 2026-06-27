import { afterEach, describe, expect, it, vi } from "vitest";

import { launchConfig } from "./config";

describe("launchConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses community launch defaults", () => {
    const config = launchConfig();
    expect(config.platform).toBe("community");
    expect(config.platforms).toEqual(["community"]);
    expect(config.templateRepo).toBe("aomi-labs/playground-example");
    expect(config.createdRepoPrivate).toBe(false);
    expect(config.targetTags).toEqual([]);
  });

  it("honors APP_DEPLOY env overrides and comma-separated values", () => {
    vi.stubEnv("APP_DEPLOY_PLATFORMS", "partners, somm.finance, partners");
    vi.stubEnv("APP_DEPLOY_TEMPLATE_REPO", "acme/template");
    vi.stubEnv("APP_DEPLOY_CREATED_REPO_PRIVATE", "true");
    vi.stubEnv("APP_DEPLOY_TARGET_TAGS", "staging, launch");

    const config = launchConfig();
    expect(config.platform).toBe("partners");
    expect(config.platforms).toEqual(["partners", "somm.finance"]);
    expect(config.templateRepo).toBe("acme/template");
    expect(config.createdRepoPrivate).toBe(true);
    expect(config.targetTags).toEqual(["staging", "launch"]);
  });

  it("accepts APP_DEPLOY_PLATFORMS as a JSON string array", () => {
    vi.stubEnv("APP_DEPLOY_PLATFORMS", '["somm.finance", "community", ""]');

    const config = launchConfig();
    expect(config.platform).toBe("somm.finance");
    expect(config.platforms).toEqual(["somm.finance", "community"]);
  });

  it("falls back to public platform envs during deployment bootstrap", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_APP_DEPLOY_PLATFORMS",
      '["somm.finance", "community"]',
    );

    const config = launchConfig();
    expect(config.platform).toBe("somm.finance");
    expect(config.platforms).toEqual(["somm.finance", "community"]);
  });

  it("accepts a single platform env as a one-item platform list", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DEPLOY_PLATFORM", "somm.finance");

    const config = launchConfig();
    expect(config.platform).toBe("somm.finance");
    expect(config.platforms).toEqual(["somm.finance"]);
  });
});

// Ported from apps/portal/src/server/bff/launch/config.test.ts.
import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveLaunchConfig } from "../src/bff/config";

describe("resolveLaunchConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses community launch defaults", () => {
    const config = resolveLaunchConfig();
    expect(config.platform).toBe("community");
    expect(config.platforms).toEqual(["community"]);
    expect(config.catalogPlatforms).toEqual([]);
    expect(config.templateRepo).toBe("aomi-labs/playground-example");
    expect(config.createdRepoPrivate).toBe(false);
    expect(config.targetTags).toEqual([]);
  });

  it("honors APP_DEPLOY env overrides and comma-separated values", () => {
    vi.stubEnv("APP_DEPLOY_PLATFORMS", "partners, somm.finance, partners");
    vi.stubEnv("APP_DEPLOY_TEMPLATE_REPO", "acme/template");
    vi.stubEnv("APP_DEPLOY_CREATED_REPO_PRIVATE", "true");
    vi.stubEnv("APP_DEPLOY_TARGET_TAGS", "staging, launch");

    const config = resolveLaunchConfig();
    expect(config.platform).toBe("partners");
    expect(config.platforms).toEqual(["partners", "somm.finance"]);
    expect(config.catalogPlatforms).toEqual([]);
    expect(config.templateRepo).toBe("acme/template");
    expect(config.createdRepoPrivate).toBe(true);
    expect(config.targetTags).toEqual(["staging", "launch"]);
  });

  it("accepts APP_DEPLOY_PLATFORMS as a JSON string array", () => {
    vi.stubEnv("APP_DEPLOY_PLATFORMS", '["somm.finance", "community", ""]');

    const config = resolveLaunchConfig();
    expect(config.platform).toBe("somm.finance");
    expect(config.platforms).toEqual(["somm.finance", "community"]);
    expect(config.catalogPlatforms).toEqual([]);
  });

  it("falls back to public platform envs during deployment bootstrap", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_APP_DEPLOY_PLATFORMS",
      '["somm.finance", "community"]',
    );

    const config = resolveLaunchConfig();
    expect(config.platform).toBe("somm.finance");
    expect(config.platforms).toEqual(["somm.finance", "community"]);
    expect(config.catalogPlatforms).toEqual([]);
  });

  it("accepts a single platform env as a one-item platform list", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_DEPLOY_PLATFORM", "somm.finance");

    const config = resolveLaunchConfig();
    expect(config.platform).toBe("somm.finance");
    expect(config.platforms).toEqual(["somm.finance"]);
    expect(config.catalogPlatforms).toEqual([]);
  });

  it("uses explicit catalog platforms without changing deploy platforms", () => {
    vi.stubEnv("APP_DEPLOY_PLATFORMS", "community,somm.finance");
    vi.stubEnv("APP_CATALOG_PLATFORMS", "official, somm.finance, official");

    const config = resolveLaunchConfig();
    expect(config.platform).toBe("community");
    expect(config.platforms).toEqual(["community", "somm.finance"]);
    expect(config.catalogPlatforms).toEqual(["official", "somm.finance"]);
  });

  it("falls back to public catalog platform envs", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_CATALOG_PLATFORMS", '["somm.finance"]');

    const config = resolveLaunchConfig();
    expect(config.platform).toBe("community");
    expect(config.platforms).toEqual(["community"]);
    expect(config.catalogPlatforms).toEqual(["somm.finance"]);
  });

  it("explicit overrides win over env", () => {
    vi.stubEnv("APP_DEPLOY_PLATFORMS", "community");
    vi.stubEnv("APP_DEPLOY_TEMPLATE_REPO", "acme/template");

    const config = resolveLaunchConfig({
      platform: "partners",
      templateRepo: "krexa/agent-template",
      targetTags: ["staging"],
    });
    expect(config.platform).toBe("partners");
    expect(config.templateRepo).toBe("krexa/agent-template");
    expect(config.targetTags).toEqual(["staging"]);
  });
});

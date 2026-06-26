import { afterEach, describe, expect, it, vi } from "vitest";

import { launchConfig } from "./config";

describe("launchConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses community launch defaults", () => {
    const config = launchConfig();
    expect(config.platform).toBe("community");
    expect(config.templateRepo).toBe("aomi-labs/playground-example");
    expect(config.createdRepoPrivate).toBe(false);
    expect(config.targetTags).toEqual([]);
  });

  it("honors APP_DEPLOY env overrides and comma-separated values", () => {
    vi.stubEnv("APP_DEPLOY_PLATFORM", "partners");
    vi.stubEnv("APP_DEPLOY_TEMPLATE_REPO", "acme/template");
    vi.stubEnv("APP_DEPLOY_CREATED_REPO_PRIVATE", "true");
    vi.stubEnv("APP_DEPLOY_TARGET_TAGS", "staging, launch");

    const config = launchConfig();
    expect(config.platform).toBe("partners");
    expect(config.templateRepo).toBe("acme/template");
    expect(config.createdRepoPrivate).toBe(true);
    expect(config.targetTags).toEqual(["staging", "launch"]);
  });
});

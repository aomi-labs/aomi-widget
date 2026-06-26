import "server-only";

import { DeployError, type SourceRef } from "@aomi-labs/deploy";
import { resolveDeployPlatform } from "@portal/lib/deploy-platform";

const TEMPLATE_REPO = "aomi-labs/playground-example";
const CREATED_REPO_PRIVATE = false;
const DEFAULT_AOMI_TOML_PATHS = ["aomi.toml"];
const SOURCE_REF_ENV = "APP_DEPLOY_SOURCE_REF";
const SOURCE_COMMIT_ENV = "APP_DEPLOY_SOURCE_COMMIT";

export type LaunchConfig = {
  platform: string;
  templateRepo: string;
  createdRepoPrivate: boolean;
  aomiTomlPaths: string[];
  targetTags: string[];
};

function envValue(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

function commaList(value: string | undefined, fallback: string[] = []): string[] {
  const parsed = (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : fallback;
}

export function launchConfig(): LaunchConfig {
  return {
    platform: envValue("APP_DEPLOY_PLATFORM") ?? resolveDeployPlatform(),
    templateRepo: TEMPLATE_REPO,
    createdRepoPrivate: CREATED_REPO_PRIVATE,
    aomiTomlPaths: commaList(
      envValue("APP_DEPLOY_AOMI_TOML_PATHS"),
      DEFAULT_AOMI_TOML_PATHS,
    ),
    targetTags: commaList(envValue("APP_DEPLOY_TARGET_TAGS")),
  };
}

export function launchDeploySourceRef(): SourceRef {
  const value =
    process.env[SOURCE_REF_ENV]?.trim() ||
    process.env[SOURCE_COMMIT_ENV]?.trim();
  if (!value) {
    throw new DeployError(
      "INVALID_REQUEST",
      `${SOURCE_REF_ENV} or ${SOURCE_COMMIT_ENV} must be set to an immutable source commit SHA`,
    );
  }
  return value;
}

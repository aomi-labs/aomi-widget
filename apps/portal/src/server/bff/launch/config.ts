import "server-only";

import { DeployError, type SourceRef } from "@aomi-labs/deploy";
import { resolveDeployPlatform } from "@portal/lib/deploy-platform";

const TEMPLATE_REPO = "aomi-labs/playground-example";
const CREATED_REPO_PRIVATE = false;
const AOMI_TOML_PATHS = ["aomi.toml"];
const TARGET_TAGS: string[] = [];
const SOURCE_REF_ENV = "APP_DEPLOY_SOURCE_REF";
const SOURCE_COMMIT_ENV = "APP_DEPLOY_SOURCE_COMMIT";

export type LaunchConfig = {
  platform: string;
  templateRepo: string;
  createdRepoPrivate: boolean;
  aomiTomlPaths: string[];
  targetTags: string[];
};

export function launchConfig(): LaunchConfig {
  return {
    platform: resolveDeployPlatform(),
    templateRepo: TEMPLATE_REPO,
    createdRepoPrivate: CREATED_REPO_PRIVATE,
    aomiTomlPaths: [...AOMI_TOML_PATHS],
    targetTags: [...TARGET_TAGS],
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

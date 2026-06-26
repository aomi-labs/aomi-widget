import "server-only";

import type { SourceRef } from "@aomi-labs/deploy";
import { resolveDeployPlatform } from "@portal/lib/deploy-platform";

const TEMPLATE_REPO = "aomi-labs/playground-example";
const CREATED_REPO_PRIVATE = false;
const DEFAULT_SOURCE_BRANCH = "main";
const DEFAULT_AOMI_TOML_PATHS = ["aomi.toml"];

export type LaunchConfig = {
  platform: string;
  templateRepo: string;
  createdRepoPrivate: boolean;
  sourceRef: SourceRef;
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
  const sourceBranch = envValue("APP_DEPLOY_SOURCE_BRANCH") ?? DEFAULT_SOURCE_BRANCH;
  return {
    platform: envValue("APP_DEPLOY_PLATFORM") ?? resolveDeployPlatform(),
    templateRepo: TEMPLATE_REPO,
    createdRepoPrivate: CREATED_REPO_PRIVATE,
    sourceRef: { kind: "branch", value: sourceBranch } satisfies SourceRef,
    aomiTomlPaths: commaList(
      envValue("APP_DEPLOY_AOMI_TOML_PATHS"),
      DEFAULT_AOMI_TOML_PATHS,
    ),
    targetTags: commaList(envValue("APP_DEPLOY_TARGET_TAGS")),
  };
}

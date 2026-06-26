import "server-only";

import { resolveDeployPlatform } from "@portal/lib/deploy-platform";

const DEFAULT_TEMPLATE_REPO = "aomi-labs/playground-example";

export type LaunchConfig = {
  platform: string;
  templateRepo: string;
  createdRepoPrivate: boolean;
  targetTags: string[];
};

function envString(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function envBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes";
}

function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function launchConfig(): LaunchConfig {
  return {
    platform: process.env.APP_DEPLOY_PLATFORM?.trim() || resolveDeployPlatform(),
    templateRepo:
      process.env.APP_DEPLOY_TEMPLATE_REPO?.trim() ||
      envString("NEXT_PUBLIC_APP_DEPLOY_TEMPLATE_REPO", DEFAULT_TEMPLATE_REPO),
    createdRepoPrivate: envBoolean("APP_DEPLOY_CREATED_REPO_PRIVATE", false),
    targetTags: envList("APP_DEPLOY_TARGET_TAGS"),
  };
}

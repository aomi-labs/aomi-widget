import "server-only";

import { DEFAULT_DEPLOY_PLATFORM } from "@build/lib/deploy-platform";

const DEFAULT_TEMPLATE_REPO = "aomi-labs/playground-example";

export type LaunchConfig = {
  platform: string;
  platforms: string[];
  catalogPlatforms: string[];
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

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function envJsonOrCommaList(name: string): string[] {
  const raw = process.env[name]?.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return dedupe(
        parsed
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean),
      );
    }
  } catch {
    // Fall through to comma-separated parsing for Vercel/plain .env ergonomics.
  }

  return dedupe(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function deployPlatforms(): string[] {
  for (const name of [
    "APP_DEPLOY_PLATFORMS",
    "NEXT_PUBLIC_APP_DEPLOY_PLATFORMS",
    "APP_DEPLOY_PLATFORM",
    "NEXT_PUBLIC_APP_DEPLOY_PLATFORM",
  ]) {
    const platforms = envJsonOrCommaList(name);
    if (platforms.length > 0) return platforms;
  }

  return [DEFAULT_DEPLOY_PLATFORM];
}

function catalogPlatforms(): string[] {
  for (const name of [
    "APP_CATALOG_PLATFORMS",
    "NEXT_PUBLIC_APP_CATALOG_PLATFORMS",
  ]) {
    const platforms = envJsonOrCommaList(name);
    if (platforms.length > 0) return platforms;
  }

  return [];
}

export function launchConfig(): LaunchConfig {
  const resolvedPlatforms = deployPlatforms();

  return {
    platform: resolvedPlatforms[0],
    platforms: resolvedPlatforms,
    catalogPlatforms: catalogPlatforms(),
    templateRepo:
      process.env.APP_DEPLOY_TEMPLATE_REPO?.trim() ||
      envString("NEXT_PUBLIC_APP_DEPLOY_TEMPLATE_REPO", DEFAULT_TEMPLATE_REPO),
    createdRepoPrivate: envBoolean("APP_DEPLOY_CREATED_REPO_PRIVATE", false),
    targetTags: envList("APP_DEPLOY_TARGET_TAGS"),
  };
}

export function resolveLaunchPlatform(
  value: unknown,
  config = launchConfig(),
): string | null {
  if (value === undefined) return config.platform;
  if (typeof value !== "string") return null;
  const platform = value.trim();
  return config.platforms.includes(platform) ? platform : null;
}

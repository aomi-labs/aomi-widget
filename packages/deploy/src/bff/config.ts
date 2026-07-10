// =============================================================================
// Launch BFF configuration.
//
// Every value can be passed explicitly to `createLaunchRoutes`; anything left
// out falls back to the `APP_DEPLOY_*` environment variables (the same names
// the Aomi portal uses), then to library defaults.
// =============================================================================

import { DEFAULT_TEMPLATE_REPO } from "../launch/contracts";

export const DEFAULT_DEPLOY_PLATFORM = "community";
export { DEFAULT_TEMPLATE_REPO };

export type LaunchConfig = {
  /** Platform every launch route operates on (first of `platforms`). */
  platform: string;
  /** All deployable platforms, first is the default. */
  platforms: string[];
  /** Platforms whose apps show in the catalog (optional). */
  catalogPlatforms: string[];
  /** Template `owner/repo` the one-shot flow forks. */
  templateRepo: string;
  /** Create scaffolded repos as private. */
  createdRepoPrivate: boolean;
  /** Target tags applied on activation (e.g. ["staging"]). */
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

function deployPlatformsFromEnv(): string[] {
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

function catalogPlatformsFromEnv(): string[] {
  for (const name of [
    "APP_CATALOG_PLATFORMS",
    "NEXT_PUBLIC_APP_CATALOG_PLATFORMS",
  ]) {
    const platforms = envJsonOrCommaList(name);
    if (platforms.length > 0) return platforms;
  }

  return [];
}

/** Resolve the launch config: explicit overrides win, then env, then defaults. */
export function resolveLaunchConfig(
  overrides?: Partial<LaunchConfig>,
): LaunchConfig {
  const platforms =
    overrides?.platforms ??
    (overrides?.platform ? [overrides.platform] : deployPlatformsFromEnv());

  return {
    platform: overrides?.platform ?? platforms[0],
    platforms,
    catalogPlatforms: overrides?.catalogPlatforms ?? catalogPlatformsFromEnv(),
    templateRepo:
      overrides?.templateRepo ??
      (process.env.APP_DEPLOY_TEMPLATE_REPO?.trim() ||
        envString("NEXT_PUBLIC_APP_DEPLOY_TEMPLATE_REPO", DEFAULT_TEMPLATE_REPO)),
    createdRepoPrivate:
      overrides?.createdRepoPrivate ??
      envBoolean("APP_DEPLOY_CREATED_REPO_PRIVATE", false),
    targetTags: overrides?.targetTags ?? envList("APP_DEPLOY_TARGET_TAGS"),
  };
}

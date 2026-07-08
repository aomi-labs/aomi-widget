import "server-only";

import type { DeployPayload } from "@aomi-labs/deploy";

type AppsLike = { platform?: { apps?: Array<Record<string, unknown>> } };

export function releaseTagsFromDeployment(
  deployment?: DeployPayload | AppsLike,
): string[] {
  const apps = (deployment as AppsLike | undefined)?.platform?.apps ?? [];
  return apps
    .map((app) => (app.release_tag ?? app.releaseTag) as string | undefined)
    .map((tag) => tag?.trim())
    .filter((tag): tag is string => Boolean(tag));
}

export function appNamesFromDeployment(
  deployment?: DeployPayload | AppsLike,
): string[] {
  const apps = (deployment as AppsLike | undefined)?.platform?.apps ?? [];
  return apps
    .map((app) => (app.name as string | undefined)?.trim())
    .filter((name): name is string => Boolean(name));
}

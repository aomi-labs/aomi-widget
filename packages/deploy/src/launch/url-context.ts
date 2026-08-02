// =============================================================================
// Launch URL context — matching install-redirect query params to sources.
// =============================================================================

import type { UserSource } from "../types";
import { normalizeRepo } from "./state";

export type LaunchUrlContext = {
  installationId: string | null;
  repo: string | null;
};

export function readLaunchUrlContext(search: string): LaunchUrlContext | null {
  const params = new URLSearchParams(search);
  const installationId = params.get("installation_id")?.trim() || null;
  const repo = normalizeRepo(params.get("repo") ?? "");

  if (!installationId && !repo) {
    return null;
  }

  return { installationId, repo };
}

export function sourceMatchesLaunchUrlContext(
  source: UserSource,
  context: LaunchUrlContext,
): boolean {
  if (
    context.installationId &&
    String(source.installationId) !== context.installationId
  ) {
    return false;
  }

  if (context.repo) {
    return normalizeRepo(source.repositoryLink ?? "") === context.repo;
  }

  return true;
}

export function hasSourceForLaunchUrlContext(
  sources: UserSource[],
  context: LaunchUrlContext | null,
): boolean {
  if (!context) {
    return true;
  }

  return sources.some((source) =>
    sourceMatchesLaunchUrlContext(source, context),
  );
}

/**
 * Read `?platform=` off a router's `searchParams` value (Next hands back an
 * array when the param repeats — there is no single platform to honour then).
 * Hosts each spelled this out and disagreed about trimming.
 */
export function platformParam(
  value: string | string[] | undefined,
): string | undefined {
  const platform = typeof value === "string" ? value.trim() : "";
  return platform || undefined;
}

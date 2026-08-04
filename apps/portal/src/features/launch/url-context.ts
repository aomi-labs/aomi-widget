"use client";

import type { UserProject } from "./dashboard";
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

export function projectMatchesLaunchUrlContext(
  project: UserProject,
  context: LaunchUrlContext,
): boolean {
  if (
    context.installationId &&
    String(project.installationId) !== context.installationId
  ) {
    return false;
  }

  if (context.repo) {
    return normalizeRepo(project.repositoryLink ?? "") === context.repo;
  }

  return true;
}

export function hasProjectForLaunchUrlContext(
  projects: UserProject[],
  context: LaunchUrlContext | null,
): boolean {
  if (!context) {
    return true;
  }

  return projects.some((project) =>
    projectMatchesLaunchUrlContext(project, context),
  );
}

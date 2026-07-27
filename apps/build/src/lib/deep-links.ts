import { getLastProjectId } from "./last-project";

/** Project page tabs — keep in sync with `ProjectPage` TABS. */
export type ProjectTab =
  | "home"
  | "deployments"
  | "providers"
  | "environment"
  | "chat";

/** Deep link into a project. Home omits `?tab=` (default). */
export function projectHref(sourceId: number, tab?: ProjectTab): string {
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0) return "/projects";
  if (!tab || tab === "home") return `/projects/${sourceId}`;
  return `/projects/${sourceId}?tab=${tab}`;
}

/** Last opened project, or the Projects list when none. */
export function lastProjectHref(tab?: ProjectTab): string {
  const id = getLastProjectId();
  if (!id) return "/projects";
  return projectHref(id, tab);
}

/** Operate Usage, optionally scoped to one project. */
export function usageHref(sourceId?: number | null): string {
  if (
    sourceId != null &&
    Number.isSafeInteger(sourceId) &&
    sourceId > 0
  ) {
    return `/operate/usage?project=${sourceId}`;
  }
  return "/operate/usage";
}

export function lastUsageHref(): string {
  return usageHref(getLastProjectId());
}

/** Secrets / Environment: last project tab, else Settings → Secrets hub. */
export function lastEnvironmentHref(): string {
  const id = getLastProjectId();
  if (!id) return "/settings/secrets";
  return projectHref(id, "environment");
}

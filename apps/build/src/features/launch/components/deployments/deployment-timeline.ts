import type { UserSourceLatestDeployment } from "@aomi-labs/deploy";
import type { DeploymentRecord } from "@build/features/launch/contracts";

/** One deployment for the project timeline. `commit` is decoded from the
 * deployment id (`dep_<install>_<repokey>_<shortcommit>`) when history does
 * not carry the full commit hash. */
export type TimelineDeployment = {
  deploymentId: string;
  commit: string | null;
  apps: string[];
  releaseTags: string[];
  current: boolean;
  actor: string | null;
  sdkVersion: string | null;
  createdAt: number;
};

/** One promotion record, tagged with the app it belongs to (for the activity feed). */
export type TimelineActivity = DeploymentRecord & {
  app: string;
};

export function commitFromDeploymentId(deploymentId: string): string | null {
  const parts = deploymentId.split("_");
  return parts.length === 4 ? parts[3] : null;
}

/**
 * Merge deployment history with per-app promotion records into a newest-first
 * deployment list. History is the source of truth for what was deployed;
 * promotion records enrich it with actor/current state and preserve legacy
 * deployments that are only present in the activation log.
 */
export function buildDeploymentList(
  recordsByApp: Record<string, DeploymentRecord[]> | null,
  history: UserSourceLatestDeployment[] | null = null,
): TimelineDeployment[] {
  const byId = new Map<string, TimelineDeployment>();
  for (const [app, rows] of Object.entries(recordsByApp ?? {})) {
    for (const row of rows) {
      const existing = byId.get(row.deploymentId);
      if (!existing) {
        byId.set(row.deploymentId, {
          deploymentId: row.deploymentId,
          commit: commitFromDeploymentId(row.deploymentId),
          apps: [app],
          releaseTags: [row.releaseTag],
          current: row.current,
          actor: row.actor,
          sdkVersion: row.sdkVersion,
          createdAt: row.createdAt,
        });
        continue;
      }
      if (!existing.apps.includes(app)) existing.apps.push(app);
      if (!existing.releaseTags.includes(row.releaseTag)) {
        existing.releaseTags.push(row.releaseTag);
      }
      existing.current = existing.current || row.current;
      if (row.createdAt > existing.createdAt) {
        existing.createdAt = row.createdAt;
        existing.actor = row.actor;
        existing.sdkVersion = row.sdkVersion;
      }
    }
  }

  for (const entry of history ?? []) {
    if (!entry.deploymentId) continue;
    const existing = byId.get(entry.deploymentId);
    const apps = entry.apps.map((app) => app.name);
    const releaseTags = [
      ...entry.releaseTags,
      ...entry.apps.flatMap((app) => (app.releaseTag ? [app.releaseTag] : [])),
    ];
    const sdkVersion =
      entry.sdkVersion ??
      entry.apps.find((app) => app.sdkVersion)?.sdkVersion ??
      existing?.sdkVersion ??
      null;
    byId.set(entry.deploymentId, {
      deploymentId: entry.deploymentId,
      commit:
        existing?.commit ?? commitFromDeploymentId(entry.deploymentId),
      apps: [...new Set([...(existing?.apps ?? []), ...apps])],
      releaseTags: [
        ...new Set([...(existing?.releaseTags ?? []), ...releaseTags]),
      ],
      current: existing?.current ?? false,
      actor: existing?.actor ?? null,
      sdkVersion,
      createdAt: entry.createdAt ?? existing?.createdAt ?? 0,
    });
  }

  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

/** Current first, then newest. Used after runtime remaps `current`. */
export function sortDeploymentsForTimeline(
  deployments: TimelineDeployment[],
): TimelineDeployment[] {
  return [...deployments].sort((a, b) => {
    if (a.current !== b.current) return a.current ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
}

export function buildActivityList(
  recordsByApp: Record<string, DeploymentRecord[]> | null,
): TimelineActivity[] {
  if (!recordsByApp) return [];
  return Object.entries(recordsByApp)
    .flatMap(([app, rows]) => rows.map((row) => ({ ...row, app })))
    .sort((a, b) => b.createdAt - a.createdAt);
}

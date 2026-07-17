import type { DeploymentRecord } from "@build/features/launch/contracts";

/** One deployment as derived purely from the DB promotion records — no GitHub
 *  reads. `commit` is decoded from the deployment id
 *  (`dep_<install>_<repokey>_<shortcommit>`). */
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
 * Merge per-app promotion records into a newest-first deployment list. A single
 * deploy can touch several apps (same `deploymentId`, one record per app), so
 * records are grouped by `deploymentId`. A deployment is "current" when any of
 * its apps' latest record is live; `createdAt`/`actor`/`sdkVersion` come from
 * the newest record in the group.
 */
export function buildDeploymentList(
  recordsByApp: Record<string, DeploymentRecord[]> | null,
): TimelineDeployment[] {
  if (!recordsByApp) return [];

  const byId = new Map<string, TimelineDeployment>();
  for (const [app, rows] of Object.entries(recordsByApp)) {
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

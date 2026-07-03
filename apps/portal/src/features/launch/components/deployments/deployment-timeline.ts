import type { DeploymentActivation } from "@portal/features/launch/contracts";

/** One deployment as derived purely from the DB activation timeline — no
 *  GitHub reads. `commit` is decoded from the deployment id
 *  (`dep_<install>_<repokey>_<shortcommit>`). */
export type TimelineDeployment = {
  deploymentId: string;
  commit: string | null;
  apps: string[];
  releaseTags: string[];
  current: boolean;
  lastAction: string;
  actor: string | null;
  createdAt: number;
};

export type TimelineActivity = DeploymentActivation & {
  app: string;
};

function commitFromDeploymentId(deploymentId: string): string | null {
  const parts = deploymentId.split("_");
  return parts.length === 4 ? parts[3] : null;
}

/**
 * Merge per-app activation rows into a newest-first deployment list. A single
 * deploy can touch several apps (same `deploymentId`, one activation row per
 * app), so rows are grouped by `deploymentId`. A deployment is "current" when
 * any of its apps' latest activation is live; `createdAt`/`lastAction`/`actor`
 * come from the newest row in the group.
 */
export function buildDeploymentList(
  activationsByApp: Record<string, DeploymentActivation[]> | null,
): TimelineDeployment[] {
  if (!activationsByApp) return [];

  const byId = new Map<string, TimelineDeployment>();
  for (const [app, rows] of Object.entries(activationsByApp)) {
    for (const row of rows) {
      const existing = byId.get(row.deploymentId);
      if (!existing) {
        byId.set(row.deploymentId, {
          deploymentId: row.deploymentId,
          commit: commitFromDeploymentId(row.deploymentId),
          apps: [app],
          releaseTags: [row.releaseTag],
          current: row.current,
          lastAction: row.action,
          actor: row.actor,
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
        existing.lastAction = row.action;
        existing.actor = row.actor;
      }
    }
  }

  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function buildActivityList(
  activationsByApp: Record<string, DeploymentActivation[]> | null,
): TimelineActivity[] {
  if (!activationsByApp) return [];
  return Object.entries(activationsByApp)
    .flatMap(([app, rows]) => rows.map((row) => ({ ...row, app })))
    .sort((a, b) => b.createdAt - a.createdAt);
}

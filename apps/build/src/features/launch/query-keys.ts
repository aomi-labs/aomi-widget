export const buildQueryKeys = {
  all: ["aomi-build"] as const,
  sdkStatus: () => [...buildQueryKeys.all, "sdk-status"] as const,
  projects: (account: string) =>
    [...buildQueryKeys.all, "account", account, "projects"] as const,
  // Server-filtered single-source read backing a project detail page. Nested
  // under the `projects` key so invalidating the projects prefix covers detail
  // pages too. Warm navigations seed it from the `projects` list cache.
  projectSource: (
    account: string,
    sourceId: number,
    platform?: string | null,
  ) =>
    [
      ...buildQueryKeys.projects(account),
      "source",
      platform?.trim() || "default",
      sourceId,
    ] as const,
  deployments: (account: string) =>
    [...buildQueryKeys.all, "account", account, "deployments"] as const,
  operate: (
    account: string,
    kind: string,
    sourceId: number | null = null,
    platform?: string | null,
  ) =>
    [
      ...buildQueryKeys.all,
      "account",
      account,
      "operate",
      kind,
      platform?.trim() || "default",
      sourceId ?? "all",
    ] as const,
  operateDetail: (
    account: string,
    sourceId: number,
    applicationId: number,
    platform?: string | null,
  ) =>
    [
      ...buildQueryKeys.all,
      "account",
      account,
      "operate",
      "observability-detail",
      platform?.trim() || "default",
      sourceId,
      applicationId,
    ] as const,
  bots: (account: string) =>
    [...buildQueryKeys.all, "account", account, "bots"] as const,
  modelKeys: (account: string) =>
    [...buildQueryKeys.all, "account", account, "model-keys"] as const,
};

export const buildQueryStaleTime = {
  projects: 60_000,
  deployments: 15_000,
  sdkStatus: 5 * 60_000,
  operate: 30_000,
  modelKeys: 60_000,
} as const;

export function githubAccountKey(login: string | null): string | null {
  const normalized = login?.trim().toLowerCase();
  return normalized || null;
}

export const buildQueryKeys = {
  all: ["aomi-build"] as const,
  sdkStatus: () => [...buildQueryKeys.all, "sdk-status"] as const,
  projects: (account: string) =>
    [...buildQueryKeys.all, "account", account, "projects"] as const,
  deployments: (account: string) =>
    [...buildQueryKeys.all, "account", account, "deployments"] as const,
  operate: (account: string, kind: string, sourceId: number | null = null) =>
    [
      ...buildQueryKeys.all,
      "account",
      account,
      "operate",
      kind,
      sourceId ?? "all",
    ] as const,
  operateDetail: (account: string, sourceId: number, applicationId: number) =>
    [
      ...buildQueryKeys.all,
      "account",
      account,
      "operate",
      "observability-detail",
      sourceId,
      applicationId,
    ] as const,
  bots: (account: string) =>
    [...buildQueryKeys.all, "account", account, "bots"] as const,
  modelKeys: (account: string) =>
    [...buildQueryKeys.all, "account", account, "model-keys"] as const,
  integrations: (account: string) =>
    [...buildQueryKeys.all, "account", account, "integrations"] as const,
};

export const buildQueryStaleTime = {
  projects: 60_000,
  deployments: 15_000,
  sdkStatus: 5 * 60_000,
  operate: 30_000,
  integrations: 60_000,
  modelKeys: 60_000,
} as const;

export function githubAccountKey(login: string | null): string | null {
  const normalized = login?.trim().toLowerCase();
  return normalized || null;
}

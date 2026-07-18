export const buildQueryKeys = {
  all: ["aomi-build"] as const,
  sdkStatus: () => [...buildQueryKeys.all, "sdk-status"] as const,
  projects: (account: string) =>
    [...buildQueryKeys.all, "account", account, "projects"] as const,
  deployments: (account: string) =>
    [...buildQueryKeys.all, "account", account, "deployments"] as const,
};

export function githubAccountKey(login: string | null): string | null {
  const normalized = login?.trim().toLowerCase();
  return normalized || null;
}

// Single source of truth for Aomi Build BFF route paths.
//
// Isomorphic — imported by client call sites, server route handlers, and tests.
// Boundary rule: every path under `/api/bff/*` is served by an app-local route
// handler; any other `/api/*` path is forwarded to the Rust backend by the
// `[...slug]` proxy. Backend-contract paths
// (e.g. `/api/integrations/github-app/oauth/start`) deliberately live outside
// this registry — they are owned by the backend, not Aomi Build.

const BFF = "/api/bff";

export const API_PATHS = {
  bff: {
    auth: {
      github: {
        login: `${BFF}/auth/github/login`,
        callback: `${BFF}/auth/github/callback`,
        status: `${BFF}/auth/github/status`,
        signout: `${BFF}/auth/github/signout`,
        devSession: `${BFF}/auth/github/dev-session`,
      },
    },
    launch: {
      preflight: `${BFF}/launch/preflight`,
      deploy: `${BFF}/launch/deploy`,
      redeploy: `${BFF}/launch/redeploy`,
      create: `${BFF}/launch/create`,
      activate: `${BFF}/launch/activate`,
      sources: `${BFF}/launch/sources`,
      sdkStatus: `${BFF}/launch/sdk-status`,
      status: (deploymentId: string) =>
        `${BFF}/launch/status?deploymentId=${encodeURIComponent(deploymentId)}`,
      app: (name: string, releaseTag?: string) => {
        const params = new URLSearchParams({ name });
        if (releaseTag) params.set("releaseTag", releaseTag);
        return `${BFF}/launch/app?${params}`;
      },
    },
    deployments: {
      preflight: `${BFF}/deployments/preflight`,
      deploy: `${BFF}/deployments/deploy`,
      redeploy: `${BFF}/deployments/redeploy`,
      promote: `${BFF}/deployments/promote`,
      sources: `${BFF}/deployments/sources`,
      feed: (
        limit: number,
        cursor?: { createdAt: number; id: number } | null,
      ) => {
        const params = new URLSearchParams({ limit: String(limit) });
        if (cursor) {
          params.set("cursorCreatedAt", String(cursor.createdAt));
          params.set("cursorId", String(cursor.id));
        }
        return `${BFF}/deployments/feed?${params}`;
      },
      history: (appSourceId: number, limit?: number) => {
        const params = new URLSearchParams({
          appSourceId: String(appSourceId),
        });
        if (limit) params.set("limit", String(limit));
        return `${BFF}/deployments/history?${params}`;
      },
      sdkStatus: `${BFF}/deployments/sdk-status`,
      status: (deploymentId: string) =>
        `${BFF}/deployments/status?deploymentId=${encodeURIComponent(deploymentId)}`,
      secrets: (appSourceId: number) =>
        `${BFF}/deployments/secrets?appSourceId=${appSourceId}`,
      requiredSecrets: (appSourceId: number) =>
        `${BFF}/deployments/required-secrets?appSourceId=${appSourceId}`,
      records: (app: string, appSourceId?: number) =>
        `${BFF}/deployments/records?app=${encodeURIComponent(app)}${
          appSourceId != null ? `&appSourceId=${appSourceId}` : ""
        }`,
      deactivate: `${BFF}/deployments/deactivate`,
      sdkUpgrade: `${BFF}/deployments/sdk-upgrade`,
      sdkUpgradeStatus: (appSourceId: number) =>
        `${BFF}/deployments/sdk-upgrade-status?appSourceId=${appSourceId}`,
    },
    operate: {
      bots: `${BFF}/operate/bots`,
      transactions: `${BFF}/operate/transactions`,
      usage: `${BFF}/operate/usage`,
      logs: `${BFF}/operate/logs`,
      observability: `${BFF}/operate/observability`,
      observabilityDetail: (appSourceId: number, applicationId: number) => {
        const params = new URLSearchParams({
          appSourceId: String(appSourceId),
          applicationId: String(applicationId),
        });
        return `${BFF}/operate/observability/detail?${params}`;
      },
    },
    integrations: {
      base: `${BFF}/integrations`,
    },
    e2e: {
      execute: `${BFF}/e2e/execute`,
      wallet: `${BFF}/e2e/wallet`,
    },
  },
} as const;

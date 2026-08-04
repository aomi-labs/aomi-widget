// Single source of truth for portal-owned BFF route paths.
//
// Isomorphic — imported by client call sites, server route handlers, and tests.
// Boundary rule: every path under `/api/bff/*` is served by a portal route
// handler (apps/portal/src/app/api/bff/**); any other `/api/*` path is forwarded
// to the Rust backend by the `[...slug]` proxy. Backend-contract paths
// (e.g. `/api/integrations/github-app/oauth/start`) deliberately live outside
// this registry — they are owned by the backend, not the portal.

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
      projects: `${BFF}/launch/projects`,
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
      projects: `${BFF}/deployments/projects`,
      history: (projectId: number, limit?: number) => {
        const params = new URLSearchParams({
          projectId: String(projectId),
        });
        if (limit) params.set("limit", String(limit));
        return `${BFF}/deployments/history?${params}`;
      },
      sdkStatus: `${BFF}/deployments/sdk-status`,
      status: (deploymentId: string) =>
        `${BFF}/deployments/status?deploymentId=${encodeURIComponent(deploymentId)}`,
      secrets: (projectId: number) =>
        `${BFF}/deployments/secrets?projectId=${projectId}`,
      records: (app: string, projectId?: number) =>
        `${BFF}/deployments/records?app=${encodeURIComponent(app)}${
          projectId != null ? `&projectId=${projectId}` : ""
        }`,
      deactivate: `${BFF}/deployments/deactivate`,
    },
    e2e: {
      execute: `${BFF}/e2e/execute`,
      solana: `${BFF}/e2e/solana`,
      wallet: `${BFF}/e2e/wallet`,
    },
  },
} as const;

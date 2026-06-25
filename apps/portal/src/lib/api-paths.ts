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
      // Exchange a wallet provider credential (Para/Privy) for an aomi_session.
      exchange: `${BFF}/auth/exchange`,
    },
    launch: {
      preflight: `${BFF}/launch/preflight`,
      deploy: `${BFF}/launch/deploy`,
      redeploy: `${BFF}/launch/redeploy`,
      create: `${BFF}/launch/create`,
      activate: `${BFF}/launch/activate`,
      syncInstalled: `${BFF}/launch/sync-installed`,
      sources: `${BFF}/launch/sources`,
      status: (deploymentId: string) =>
        `${BFF}/launch/status?deploymentId=${encodeURIComponent(deploymentId)}`,
      app: (name: string, releaseTag?: string) => {
        const params = new URLSearchParams({ name });
        if (releaseTag) params.set("releaseTag", releaseTag);
        return `${BFF}/launch/app?${params}`;
      },
      checkRepo: (repo: string) =>
        `${BFF}/launch/check-repo?repo=${encodeURIComponent(repo)}`,
    },
    e2e: {
      execute: `${BFF}/e2e/execute`,
      wallet: `${BFF}/e2e/wallet`,
    },
  },
} as const;

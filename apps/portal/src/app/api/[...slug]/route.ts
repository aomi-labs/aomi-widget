import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";
import { configuredBackendUrl } from "@portal/server/backend-url";
import { launchConfig } from "@portal/server/bff/launch/config";

/**
 * Portal's same-origin backend proxy. The transport machinery (header filtering,
 * bearer minting from the `aomi_session` cookie, SSE, forwarding) lives in
 * `@aomi-labs/account`'s `createBackendProxy`, shared with base + landing. Portal
 * supplies only its own policy: the route allowlist, session-app catalog
 * platform defaults, and the GitHub-install platform default.
 */

// Backend routes this proxy is willing to forward. Everything under `/api/bff/*`
// is portal-owned and served by its own handler (a more specific route wins over
// this catch-all); every other `/api/*` path is forwarded to the Rust backend.
const ALLOWED_ROUTES: AllowedRoute[] = [
  {
    pattern: /^\/api\/account(\/.*)?$/,
    methods: new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]),
  },
  { pattern: /^\/api\/state$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/chat$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/system$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/interrupt$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/secrets$/, methods: new Set(["GET", "POST", "DELETE"]) },
  { pattern: /^\/api\/secrets\/[^/]+$/, methods: new Set(["DELETE"]) },
  { pattern: /^\/api\/updates$/, methods: new Set(["GET"]) },
  // Threads-era backend routes plus their pre-rename `session` twins: the
  // old patterns stay allowlisted (they just 404 upstream on a new backend)
  // so portal deploys don't have to be lockstep with the backend cutover.
  { pattern: /^\/api\/threads$/, methods: new Set(["GET", "POST"]) },
  {
    pattern: /^\/api\/threads\/[^/]+$/,
    methods: new Set(["GET", "PATCH", "DELETE"]),
  },
  { pattern: /^\/api\/sessions$/, methods: new Set(["GET", "POST"]) },
  {
    pattern: /^\/api\/sessions\/[^/]+$/,
    methods: new Set(["GET", "PATCH", "DELETE"]),
  },
  { pattern: /^\/api\/events$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/thread\/apps$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/thread\/models$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/thread\/model$/, methods: new Set(["POST"]) },
  { pattern: /^\/api\/session\/apps$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/session\/models$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/session\/model$/, methods: new Set(["POST"]) },
  {
    pattern: /^\/api\/integrations\/github-app\/oauth\/start$/,
    methods: new Set(["GET"]),
  },
  { pattern: /^\/api\/control\/apps$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/control\/models$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/control\/model$/, methods: new Set(["POST"]) },
  {
    pattern: /^\/api\/control\/provider-keys$/,
    methods: new Set(["GET", "POST"]),
  },
  {
    pattern: /^\/api\/control\/provider-keys\/[^/]+$/,
    methods: new Set(["DELETE"]),
  },
  { pattern: /^\/api\/settings\/account$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/settings\/apps\/overview$/, methods: new Set(["GET"]) },
  {
    pattern: /^\/api\/settings\/api-keys$/,
    methods: new Set(["GET", "POST"]),
  },
  {
    pattern: /^\/api\/settings\/api-keys\/[^/]+$/,
    methods: new Set(["DELETE"]),
  },
  {
    pattern: /^\/api\/settings\/bot-registrations$/,
    methods: new Set(["GET", "POST"]),
  },
  { pattern: /^\/api\/simulate$/, methods: new Set(["POST"]) },
];

function applyPortalDefaults(upstreamUrl: URL): void {
  if (
    (upstreamUrl.pathname === "/api/thread/apps" ||
      upstreamUrl.pathname === "/api/session/apps") &&
    !upstreamUrl.searchParams.get("platform")
  ) {
    for (const platform of launchConfig().catalogPlatforms) {
      upstreamUrl.searchParams.append("platform", platform);
    }
  }

  if (
    upstreamUrl.pathname === "/api/integrations/github-app/oauth/start" &&
    !upstreamUrl.searchParams.get("platform")
  ) {
    upstreamUrl.searchParams.set("platform", launchConfig().platform);
  }
}

export const { GET, POST, PUT, PATCH, DELETE } = createBackendProxy({
  allowedRoutes: ALLOWED_ROUTES,
  // Keep portal's existing upstream resolution (AOMI_PROXY_BACKEND_URL wins,
  // then BACKEND_URL/NEXT_PUBLIC_BACKEND_URL); pass it explicitly so portal's
  // deploy behavior is unchanged.
  upstreamBaseUrl: process.env.AOMI_PROXY_BACKEND_URL || configuredBackendUrl(),
  applyDefaults: applyPortalDefaults,
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

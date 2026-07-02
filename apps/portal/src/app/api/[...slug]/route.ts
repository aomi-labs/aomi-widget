import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";
import { launchConfig } from "@portal/server/bff/launch/config";

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
  { pattern: /^\/api\/sessions$/, methods: new Set(["GET", "POST"]) },
  {
    pattern: /^\/api\/sessions\/[^/]+$/,
    methods: new Set(["GET", "PATCH", "DELETE"]),
  },
  { pattern: /^\/api\/events$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/session\/apps$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/session\/models$/, methods: new Set(["GET"]) },
  { pattern: /^\/api\/session\/model$/, methods: new Set(["POST"]) },
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

export const { GET, POST, PUT, PATCH, DELETE } = createBackendProxy({
  allowedRoutes: ALLOWED_ROUTES,
  applyDefaults: (upstreamUrl) => {
    if (
      upstreamUrl.pathname !== "/api/session/apps" ||
      upstreamUrl.searchParams.has("platform")
    ) {
      return;
    }
    for (const platform of launchConfig().catalogPlatforms) {
      upstreamUrl.searchParams.append("platform", platform);
    }
  },
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

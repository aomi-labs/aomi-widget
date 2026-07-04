import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";
import { resolveBetterAuthCanonicalUserId } from "@portal/lib/aomi-account/canonical-session";
import { launchConfig } from "@portal/server/bff/launch/config";

const ALLOWED_ROUTES: AllowedRoute[] = [
  {
    pattern: /^\/api\/account(\/.*)?$/,
    methods: new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]),
  },
  { pattern: /^\/api\/state$/, methods: new Set(["GET"]), auth: "optional" },
  { pattern: /^\/api\/chat$/, methods: new Set(["POST"]), auth: "optional" },
  { pattern: /^\/api\/system$/, methods: new Set(["POST"]), auth: "optional" },
  {
    pattern: /^\/api\/interrupt$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
  { pattern: /^\/api\/secrets$/, methods: new Set(["GET", "POST", "DELETE"]) },
  { pattern: /^\/api\/secrets\/[^/]+$/, methods: new Set(["DELETE"]) },
  { pattern: /^\/api\/updates$/, methods: new Set(["GET"]), auth: "optional" },
  {
    pattern: /^\/api\/threads$/,
    methods: new Set(["GET", "POST"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/threads\/[^/]+$/,
    methods: new Set(["GET", "PATCH", "DELETE"]),
    auth: "optional",
  },
  { pattern: /^\/api\/events$/, methods: new Set(["GET"]), auth: "optional" },
  {
    pattern: /^\/api\/thread\/apps$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/thread\/models$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/thread\/model$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/control\/apps$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/control\/models$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/control\/model$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
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
  {
    pattern: /^\/api\/simulate$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
];

function rewriteLegacyThreadPath(upstreamUrl: URL): void {
  if (upstreamUrl.pathname === "/api/sessions") {
    upstreamUrl.pathname = "/api/threads";
    return;
  }

  if (upstreamUrl.pathname.startsWith("/api/sessions/")) {
    upstreamUrl.pathname = `/api/threads/${upstreamUrl.pathname.slice(
      "/api/sessions/".length,
    )}`;
    return;
  }

  if (upstreamUrl.pathname === "/api/session/apps") {
    upstreamUrl.pathname = "/api/thread/apps";
    return;
  }

  if (upstreamUrl.pathname === "/api/session/models") {
    upstreamUrl.pathname = "/api/thread/models";
    return;
  }

  if (upstreamUrl.pathname === "/api/session/model") {
    upstreamUrl.pathname = "/api/thread/model";
  }
}

export const { GET, POST, PUT, PATCH, DELETE } = createBackendProxy({
  allowedRoutes: ALLOWED_ROUTES,
  resolveCanonicalUserId: resolveBetterAuthCanonicalUserId,
  applyDefaults: (upstreamUrl) => {
    rewriteLegacyThreadPath(upstreamUrl);
    if (
      upstreamUrl.pathname !== "/api/thread/apps" ||
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

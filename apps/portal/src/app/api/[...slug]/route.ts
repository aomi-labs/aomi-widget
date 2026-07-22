import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";
import { resolvePortalCanonicalUserId } from "@portal/lib/widget-auth/principal";
import { launchConfig } from "@portal/server/bff/launch/config";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";

const ALLOWED_ROUTES: AllowedRoute[] = [
  {
    pattern: /^\/api\/account(\/.*)?$/,
    methods: new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]),
  },
  {
    pattern: /^\/api\/integrations\/github-app\/oauth\/start$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/thread\/state$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/thread\/chat$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
  { pattern: /^\/api\/system$/, methods: new Set(["POST"]), auth: "optional" },
  {
    pattern: /^\/api\/thread\/interrupt$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
  { pattern: /^\/api\/secrets$/, methods: new Set(["GET", "POST", "DELETE"]) },
  { pattern: /^\/api\/secrets\/[^/]+$/, methods: new Set(["DELETE"]) },
  {
    pattern: /^\/api\/thread\/updates$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
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
  {
    pattern: /^\/api\/threads\/[^/]+\/(archive|unarchive)$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/thread\/events$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/thread\/apps$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/thread\/models$/,
    methods: new Set(["GET"]),
    auth: "none",
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
    pattern: /^\/api\/exec\/simulate$/,
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

const proxy = createBackendProxy({
  allowedRoutes: ALLOWED_ROUTES,
  resolveCanonicalUserId: resolvePortalCanonicalUserId,
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

type ProxyHandler = typeof proxy.GET;

async function handleWithCors(
  handler: ProxyHandler,
  ...args: Parameters<ProxyHandler>
): Promise<Response> {
  return applyWidgetCors(args[0], await handler(...args));
}

export function GET(...args: Parameters<ProxyHandler>): Promise<Response> {
  return handleWithCors(proxy.GET, ...args);
}
export function POST(...args: Parameters<ProxyHandler>): Promise<Response> {
  return handleWithCors(proxy.POST, ...args);
}
export function PUT(...args: Parameters<ProxyHandler>): Promise<Response> {
  return handleWithCors(proxy.PUT, ...args);
}
export function PATCH(...args: Parameters<ProxyHandler>): Promise<Response> {
  return handleWithCors(proxy.PATCH, ...args);
}
export function DELETE(...args: Parameters<ProxyHandler>): Promise<Response> {
  return handleWithCors(proxy.DELETE, ...args);
}

export function OPTIONS(request: Request): Response {
  return widgetCorsPreflight(request, [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ]);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

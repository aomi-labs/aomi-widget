import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";
import {
  withWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";
import { resolvePortalCanonicalUserId } from "@portal/lib/widget-auth/principal";
import { launchConfig } from "@portal/server/bff/launch/config";
import type { NextRequest } from "next/server";

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

export const GET = withWidgetCors(proxy.GET);
export const POST = withWidgetCors(proxy.POST);
export const PUT = withWidgetCors(proxy.PUT);
export const PATCH = withWidgetCors(proxy.PATCH);
export const DELETE = withWidgetCors(proxy.DELETE);

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
): Promise<Response> {
  const method = request.headers
    .get("access-control-request-method")
    ?.toUpperCase();
  if (!method) {
    return Response.json({ error: "missing_cors_method" }, { status: 400 });
  }
  const { slug } = await context.params;
  const url = new URL(`/api/${(slug ?? []).join("/")}`, request.url);
  rewriteLegacyThreadPath(url);
  const route = ALLOWED_ROUTES.find(
    (candidate) =>
      candidate.pattern.test(url.pathname) && candidate.methods.has(method),
  );
  if (!route) {
    return Response.json({ error: "Unsupported API route" }, { status: 404 });
  }
  return widgetCorsPreflight(request, [...route.methods, "OPTIONS"]);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

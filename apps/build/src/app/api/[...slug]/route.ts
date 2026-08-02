import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";
import { type NextRequest, NextResponse } from "next/server";

import { configuredBackendUrl } from "@build/server/backend-url";
import { launchConfig } from "@build/server/bff/launch/config";
import { buildFailures } from "@build/server/bff/failures";

const ALLOWED_ROUTES: AllowedRoute[] = [
  {
    pattern: /^\/api\/integrations\/github-app\/oauth\/start$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
];

function applyBuildDefaults(upstreamUrl: URL): void {
  if (
    upstreamUrl.pathname === "/api/integrations/github-app/oauth/start" &&
    !upstreamUrl.searchParams.get("platform")
  ) {
    upstreamUrl.searchParams.set("platform", launchConfig().platform);
  }
}

type RouteContext = { params: Promise<{ slug: string[] }> };
type RouteHandler = (
  req: NextRequest,
  context: RouteContext,
) => Promise<NextResponse>;

const backendProxy = createBackendProxy({
  allowedRoutes: ALLOWED_ROUTES,
  upstreamBaseUrl: process.env.AOMI_PROXY_BACKEND_URL || configuredBackendUrl(),
  applyDefaults: applyBuildDefaults,
  resolveCanonicalUserId: async () => null,
  observeFailure: (failure) => {
    buildFailures.handle({ source: "proxy", failure });
  },
}) as unknown as Record<
  "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  RouteHandler
>;

export const GET: RouteHandler = (req, context) =>
  backendProxy.GET(req, context);
export const POST: RouteHandler = (req, context) =>
  backendProxy.POST(req, context);
export const PUT: RouteHandler = (req, context) =>
  backendProxy.PUT(req, context);
export const PATCH: RouteHandler = (req, context) =>
  backendProxy.PATCH(req, context);
export const DELETE: RouteHandler = (req, context) =>
  backendProxy.DELETE(req, context);

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

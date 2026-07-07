import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";
import { type NextRequest, NextResponse } from "next/server";

const LOCAL_BACKEND_URL = "http://127.0.0.1:8080";

const ALLOWED_ROUTES: AllowedRoute[] = [
  { pattern: /^\/api\/state$/, methods: new Set(["GET"]), auth: "optional" },
  { pattern: /^\/api\/chat$/, methods: new Set(["POST"]), auth: "optional" },
  { pattern: /^\/api\/system$/, methods: new Set(["POST"]), auth: "optional" },
  {
    pattern: /^\/api\/interrupt$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
  { pattern: /^\/api\/updates$/, methods: new Set(["GET"]), auth: "optional" },
  { pattern: /^\/api\/events$/, methods: new Set(["GET"]), auth: "optional" },
  { pattern: /^\/api\/threads$/, methods: new Set(["POST"]), auth: "optional" },
  {
    pattern: /^\/api\/simulate$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
];

function explicitBackendUrl(): string | null {
  const configured = process.env.AOMI_PROXY_BACKEND_URL?.trim();
  if (!configured) return null;

  try {
    const parsed = new URL(configured);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function isDeployedRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function proxyConfigurationError(): string | null {
  const configured = process.env.AOMI_PROXY_BACKEND_URL?.trim();
  if (configured && !explicitBackendUrl()) {
    return "AOMI_PROXY_BACKEND_URL must be an absolute http(s) URL.";
  }

  if (!configured && isDeployedRuntime()) {
    return "AOMI_PROXY_BACKEND_URL is required for deployed Base app proxies.";
  }

  return null;
}

function upstreamBaseUrl(): string {
  return explicitBackendUrl() ?? LOCAL_BACKEND_URL;
}

function rewriteLegacySessionPath(upstreamUrl: URL): void {
  if (upstreamUrl.pathname === "/api/sessions") {
    upstreamUrl.pathname = "/api/threads";
  }
}

const proxy = createBackendProxy({
  allowedRoutes: ALLOWED_ROUTES,
  upstreamBaseUrl: upstreamBaseUrl(),
  resolveCanonicalUserId: async () => null,
  applyDefaults: rewriteLegacySessionPath,
});

async function requireConfiguredProxy(
  handler: (
    req: NextRequest,
    context: { params: Promise<{ slug?: string[] }> },
  ) => Promise<NextResponse>,
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
): Promise<NextResponse> {
  const error = proxyConfigurationError();
  if (error) {
    console.error("Aomi Base proxy is not configured", { error });
    return NextResponse.json(
      { error: "Backend proxy is not configured" },
      { status: 503 },
    );
  }

  return handler(req, context);
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = (
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
) => requireConfiguredProxy(proxy.GET, req, context);

export const POST = (
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
) => requireConfiguredProxy(proxy.POST, req, context);

export const PUT = (
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
) => requireConfiguredProxy(proxy.PUT, req, context);

export const PATCH = (
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
) => requireConfiguredProxy(proxy.PATCH, req, context);

export const DELETE = (
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
) => requireConfiguredProxy(proxy.DELETE, req, context);

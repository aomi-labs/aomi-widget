import { NextRequest, NextResponse } from "next/server";

import { mintAccountBearer } from "@portal/lib/aomi-account/bearer";
import { getSessionUserId } from "@portal/lib/aomi-account/session";

/**
 * Same-origin proxy that fronts the Rust backend and **injects the
 * AccountBearer server-side** from our session cookie (Option 2). The browser
 * holds no bearer: it calls `/api/*` same-origin, this route reads `aomi_session`,
 * mints `sub` = canonical user id, and forwards with `Authorization` set. See
 * docs/topics/account-authentication/facts/service-identity.md ("Transport").
 *
 * Structure mirrors the WIP `codex/widget-auth-pre-rust` proxy so the eventual
 * merge is a reconcile, not a rewrite — the one deliberate divergence is that we
 * *mint* the bearer here rather than forward a browser-supplied one.
 */
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "cookie",
  "host",
  "origin",
  "referer",
  "transfer-encoding",
]);

// The browser never supplies `authorization` — we mint and inject it from the
// session below. Anything in the incoming `authorization` header is ignored.
const ALLOWED_REQUEST_HEADERS = new Set([
  "accept",
  "content-type",
  "aomi-app-key",
  "x-session-id",
]);

// Backend routes this proxy is willing to forward. Portal-owned routes
// (`/api/account/sessions/exchange`, `/api/onboard/*`, `/api/e2e/*`,
// `/api/mcp/*`) are served by their own handlers — a more specific route always
// wins over this catch-all, so they never reach here.
const ALLOWED_ROUTES: Array<{
  pattern: RegExp;
  methods: ReadonlySet<string>;
}> = [
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

function resolveUpstreamBaseUrl(): string {
  const configured =
    process.env.AOMI_PROXY_BACKEND_URL ??
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_BACKEND_URL;
  if (configured) {
    try {
      return new URL(configured).toString();
    } catch {
      // NEXT_PUBLIC_BACKEND_URL may be "/" for same-origin browser calls; the
      // server-side proxy still needs an absolute upstream, so fall through.
    }
  }
  return "https://api.aomi.dev";
}

const UPSTREAM_BASE_URL = resolveUpstreamBaseUrl();

function buildUpstreamUrl(req: NextRequest, slug: string[] | undefined): URL {
  const target = new URL(`/api/${(slug ?? []).join("/")}`, UPSTREAM_BASE_URL);
  target.search = req.nextUrl.search;
  return target;
}

function isAllowedProxyRequest(pathname: string, method: string): boolean {
  return ALLOWED_ROUTES.some(
    (route) => route.pattern.test(pathname) && route.methods.has(method),
  );
}

function copyRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (
      ALLOWED_REQUEST_HEADERS.has(lowerKey) &&
      !HOP_BY_HOP_HEADERS.has(lowerKey)
    ) {
      headers.set(key, value);
    }
  });
  return headers;
}

/**
 * Inject `Authorization: Bearer <AccountBearer>` minted from the session, when
 * the request carries a valid `aomi_session` cookie. No session → forward
 * unauthenticated (the backend treats it as anonymous). A misconfigured signer
 * degrades to anonymous + a warning rather than failing every API call.
 */
async function injectBearer(req: NextRequest, headers: Headers): Promise<void> {
  const userId = await getSessionUserId(req);
  if (!userId) return;
  try {
    const { accessToken } = await mintAccountBearer(userId);
    headers.set("authorization", `Bearer ${accessToken}`);
  } catch (error) {
    console.warn("Aomi proxy: could not mint AccountBearer; forwarding anonymous", {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function copyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  const cacheControl = upstream.headers.get("cache-control");
  if (contentType) headers.set("content-type", contentType);
  if (contentType?.includes("text/event-stream")) {
    headers.set("cache-control", "no-cache, no-transform");
  } else if (cacheControl) {
    headers.set("cache-control", cacheControl);
  }
  return headers;
}

async function handle(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
): Promise<NextResponse> {
  const { slug } = await context.params;
  const upstreamUrl = buildUpstreamUrl(req, slug);

  if (!isAllowedProxyRequest(upstreamUrl.pathname, req.method)) {
    return NextResponse.json({ error: "Unsupported API route" }, { status: 404 });
  }

  const headers = copyRequestHeaders(req);
  await injectBearer(req, headers);

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : await req.text(),
      redirect: "manual",
    });
    return new NextResponse(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: copyResponseHeaders(upstream),
    });
  } catch (error) {
    console.error("Aomi upstream request failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Upstream request failed" }, { status: 502 });
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

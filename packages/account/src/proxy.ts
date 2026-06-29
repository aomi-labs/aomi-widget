import { type NextRequest, NextResponse } from "next/server";

import { mintAccountBearer } from "./bearer";
import { getSessionedCanonicalId } from "./session";

/**
 * The shared same-origin proxy that fronts the Rust backend and **injects the
 * AccountBearer server-side** from the `aomi_session` cookie (Option 2). Every
 * Aomi BFF (portal, base, landing) mounts this with its own route allowlist; the
 * machinery — header filtering, upstream forwarding, bearer minting, SSE — is
 * identical, only the policy (`allowedRoutes`) and a couple of hooks differ.
 *
 * The browser holds no bearer: it calls `/api/*` same-origin, this handler reads
 * `aomi_session`, mints `sub` = canonical user id, and forwards with
 * `Authorization` set. See
 * docs/topics/account-authentication/facts/service-identity.md ("Transport").
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
// session below. Anything in the incoming `authorization` header is ignored, and
// `cookie` is never forwarded upstream (it carries our session, which the backend
// must never see).
const ALLOWED_REQUEST_HEADERS = new Set([
  "accept",
  "content-type",
  "aomi-app-key",
  "x-session-id",
]);

export type AllowedRoute = {
  pattern: RegExp;
  methods: ReadonlySet<string>;
};

export type ProxyConfig = {
  /**
   * Backend routes this proxy is willing to forward. A request whose path+method
   * matches none is rejected with 404. Each app owns its allowlist (they
   * legitimately differ — portal exposes settings/control, base the widget
   * surface) while sharing this machinery.
   */
  allowedRoutes: ReadonlyArray<AllowedRoute>;
  /** Mutate the upstream URL before forwarding (e.g. inject a default query param). */
  applyDefaults?: (upstreamUrl: URL) => void;
  /**
   * Optionally take over the response for a specific route (e.g. merge extra
   * data into a backend payload). Return a `NextResponse` to short-circuit, or
   * `null` to fall through to the default pass-through.
   */
  transformResponse?: (ctx: {
    req: NextRequest;
    upstreamUrl: URL;
    upstream: Response;
    copyResponseHeaders: (upstream: Response) => Headers;
  }) => Promise<NextResponse | null>;
  /** Override the upstream backend base URL (defaults to env-derived). */
  upstreamBaseUrl?: string;
};

function defaultBackendUrl(): string {
  if (process.env.VERCEL_ENV === "preview") return "https://api-staging.aomi.dev";
  if (process.env.VERCEL_ENV === "production") return "https://api.aomi.dev";
  return "http://127.0.0.1:8080";
}

function resolveUpstreamBaseUrl(config: ProxyConfig): string {
  const configured = config.upstreamBaseUrl ?? process.env.AOMI_PROXY_BACKEND_URL;
  if (configured) {
    try {
      return new URL(configured).toString();
    } catch {
      // NEXT_PUBLIC_BACKEND_URL may be "/" for same-origin browser calls; the
      // server-side proxy still needs an absolute upstream, so fall through.
    }
  }
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    defaultBackendUrl()
  ).replace(/\/+$/, "");
}

function buildUpstreamUrl(
  baseUrl: string,
  req: NextRequest,
  slug: string[] | undefined,
): URL {
  const target = new URL(`/api/${(slug ?? []).join("/")}`, baseUrl);
  target.search = req.nextUrl.search;
  return target;
}

function isAllowedProxyRequest(
  routes: ReadonlyArray<AllowedRoute>,
  pathname: string,
  method: string,
): boolean {
  return routes.some(
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
  const canonicalId = await getSessionedCanonicalId(req);
  if (!canonicalId) return;
  try {
    const { bearer } = await mintAccountBearer(canonicalId);
    headers.set("authorization", `Bearer ${bearer}`);
  } catch (error) {
    console.warn(
      "Aomi proxy: could not mint AccountBearer; forwarding anonymous",
      { message: error instanceof Error ? error.message : String(error) },
    );
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

/**
 * Build the `{ GET, POST, PUT, PATCH, DELETE }` route handlers for an app's
 * `app/api/[...slug]/route.ts`. The app stays a thin config:
 *
 * ```ts
 * export const { GET, POST, PUT, PATCH, DELETE } = createBackendProxy({
 *   allowedRoutes: APP_ROUTES,
 * });
 * export const runtime = "nodejs";
 * export const dynamic = "force-dynamic";
 * ```
 */
export function createBackendProxy(config: ProxyConfig) {
  async function handle(
    req: NextRequest,
    context: { params: Promise<{ slug?: string[] }> },
  ): Promise<NextResponse> {
    const { slug } = await context.params;
    // Resolve per request, not at factory creation, so the upstream tracks env
    // (and stays test-friendly — tests can set the backend URL before a call).
    const upstreamUrl = buildUpstreamUrl(resolveUpstreamBaseUrl(config), req, slug);
    config.applyDefaults?.(upstreamUrl);

    if (!isAllowedProxyRequest(config.allowedRoutes, upstreamUrl.pathname, req.method)) {
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

      if (config.transformResponse) {
        const transformed = await config.transformResponse({
          req,
          upstreamUrl,
          upstream,
          copyResponseHeaders,
        });
        if (transformed) return transformed;
      }

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

  return { GET: handle, POST: handle, PUT: handle, PATCH: handle, DELETE: handle };
}

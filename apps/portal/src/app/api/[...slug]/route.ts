import { NextRequest, NextResponse } from "next/server";

import { mintAccountBearer } from "@aomi-labs/account";
import type { AomiAppDescriptor } from "@aomi-labs/client";
import { getSessionedCanonicalId } from "@portal/server/cookies/session";
import { configuredBackendUrl } from "@portal/server/backend-url";
import { deploymentClient } from "@portal/server/bff/backend";
import { launchConfig } from "@portal/server/bff/launch/config";

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

// Backend routes this proxy is willing to forward. Boundary rule: everything
// under `/api/bff/*` is portal-owned and served by its own handler (a more
// specific route always wins over this catch-all); every other `/api/*` path is
// forwarded to the Rust backend here. No portal route is nested inside a
// proxied namespace anymore, so the `/api/account/*` family below forwards
// cleanly.
const ALLOWED_ROUTES: Array<{
  pattern: RegExp;
  methods: ReadonlySet<string>;
}> = [
  // The whole account family — `/api/account` plus sub-routes the settings UI
  // calls (`/payment`, `/payment/byok`, `/app-keys[/id]`, `/approvals`,
  // `/bots[/id]`, `/usage`). The backend authorizes each by the injected user
  // bearer, so the proxy only needs to forward them. (The wallet→session
  // exchange is a portal route at `/api/bff/auth/exchange`, not here.)
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

function resolveUpstreamBaseUrl(): string {
  const configured = process.env.AOMI_PROXY_BACKEND_URL;
  if (configured) {
    try {
      return new URL(configured).toString();
    } catch {
      // NEXT_PUBLIC_BACKEND_URL may be "/" for same-origin browser calls; the
      // server-side proxy still needs an absolute upstream, so fall through.
    }
  }
  return configuredBackendUrl();
}

const UPSTREAM_BASE_URL = resolveUpstreamBaseUrl();

function buildUpstreamUrl(req: NextRequest, slug: string[] | undefined): URL {
  const target = new URL(`/api/${(slug ?? []).join("/")}`, UPSTREAM_BASE_URL);
  target.search = req.nextUrl.search;
  return target;
}

function applyPortalDefaults(upstreamUrl: URL): void {
  if (
    upstreamUrl.pathname === "/api/integrations/github-app/oauth/start" &&
    !upstreamUrl.searchParams.get("platform")
  ) {
    upstreamUrl.searchParams.set("platform", launchConfig().platform);
  }
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
  const canonicalId = await getSessionedCanonicalId(req);
  if (!canonicalId) return;
  try {
    const { accessToken: accountBearer } = await mintAccountBearer(canonicalId);
    headers.set("authorization", `Bearer ${accountBearer}`);
  } catch (error) {
    console.warn(
      "Aomi proxy: could not mint AccountBearer; forwarding anonymous",
      {
        message: error instanceof Error ? error.message : String(error),
      },
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

function normalizeAppDescriptor(item: unknown): AomiAppDescriptor | null {
  if (typeof item === "string" && item.trim().length > 0) {
    return { name: item.trim() };
  }
  if (!item || typeof item !== "object" || !("name" in item)) {
    return null;
  }
  const raw = item as Record<string, unknown>;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;
  const descriptor: AomiAppDescriptor = {
    ...raw,
    name,
  } as AomiAppDescriptor;
  const applicationId = raw.applicationId ?? raw.application_id ?? raw.id;
  if (typeof applicationId === "number" || typeof applicationId === "string") {
    descriptor.applicationId = applicationId;
  }
  if (typeof raw.platform === "string") descriptor.platform = raw.platform;
  if (typeof raw.appReleaseTag === "string") {
    descriptor.appReleaseTag = raw.appReleaseTag;
  } else if (typeof raw.app_release_tag === "string") {
    descriptor.appReleaseTag = raw.app_release_tag;
  }
  if (typeof raw.isActive === "boolean") {
    descriptor.isActive = raw.isActive;
  } else if (typeof raw.is_active === "boolean") {
    descriptor.isActive = raw.is_active;
  }
  if (typeof raw.isPublic === "boolean") {
    descriptor.isPublic = raw.isPublic;
  } else if (typeof raw.is_public === "boolean") {
    descriptor.isPublic = raw.is_public;
  }
  // Drop the snake_case originals carried over by the spread so the descriptor
  // exposes a single camelCase identity (no `application_id`/`applicationId`
  // twins downstream).
  for (const key of [
    "application_id",
    "app_release_tag",
    "is_active",
    "is_public",
  ]) {
    delete (descriptor as unknown as Record<string, unknown>)[key];
  }
  return descriptor;
}

function appIdentityKey(app: AomiAppDescriptor): string {
  const applicationId = app.applicationId?.toString().trim();
  if (applicationId) return `application:${applicationId}`;
  const platform = app.platform?.trim();
  if (platform) return `platform:${platform}:${app.name}`;
  return `name:${app.name}`;
}

function normalizeAppDescriptors(data: unknown): AomiAppDescriptor[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => normalizeAppDescriptor(item))
    .filter((item): item is AomiAppDescriptor => item !== null);
}

async function mergePlatformApps(
  descriptors: AomiAppDescriptor[],
): Promise<AomiAppDescriptor[]> {
  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const merged = new Map(
      descriptors.map((descriptor) => [appIdentityKey(descriptor), descriptor]),
    );
    const appLists = await Promise.allSettled(
      config.platforms.map((platform) => client.listApps({ platform })),
    );

    for (const [index, result] of appLists.entries()) {
      if (result.status !== "fulfilled" || !Array.isArray(result.value)) {
        if (result.status === "rejected") {
          console.warn("Aomi proxy: could not list platform apps", {
            platform: config.platforms[index],
            message:
              result.reason instanceof Error
                ? result.reason.message
                : String(result.reason),
          });
        }
        continue;
      }
      for (const app of result.value) {
        if (!app.name || !app.isPublic || !app.isActive || !app.loaded) {
          continue;
        }
        const descriptor: AomiAppDescriptor = {
          name: app.name,
          applicationId: app.id,
          platform: app.platform ?? config.platforms[index] ?? null,
          label: app.label,
          appReleaseTag: app.appReleaseTag,
          isActive: app.isActive,
          isPublic: app.isPublic,
        };
        const key = appIdentityKey(descriptor);
        if (!merged.has(key)) {
          merged.set(key, descriptor);
        }
      }
    }

    return Array.from(merged.values());
  } catch (error) {
    console.warn(
      "Aomi proxy: could not merge platform apps into session apps",
      {
        message: error instanceof Error ? error.message : String(error),
      },
    );
    return descriptors;
  }
}

async function handle(
  req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> },
): Promise<NextResponse> {
  const { slug } = await context.params;
  const upstreamUrl = buildUpstreamUrl(req, slug);
  applyPortalDefaults(upstreamUrl);

  if (!isAllowedProxyRequest(upstreamUrl.pathname, req.method)) {
    return NextResponse.json(
      { error: "Unsupported API route" },
      { status: 404 },
    );
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
    if (
      req.method === "GET" &&
      upstream.ok &&
      upstreamUrl.pathname === "/api/session/apps"
    ) {
      const descriptors = normalizeAppDescriptors(await upstream.json());
      const merged = await mergePlatformApps(descriptors);
      return NextResponse.json(merged, {
        status: upstream.status,
        headers: copyResponseHeaders(upstream),
      });
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
    return NextResponse.json(
      { error: "Upstream request failed" },
      { status: 502 },
    );
  }
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;

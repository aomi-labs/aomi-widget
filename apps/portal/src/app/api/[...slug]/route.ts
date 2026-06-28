import { NextResponse } from "next/server";

import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";
import type { AomiAppDescriptor } from "@aomi-labs/client";
import { configuredBackendUrl } from "@portal/server/backend-url";
import { deploymentClient } from "@portal/server/bff/backend";
import { launchConfig } from "@portal/server/bff/launch/config";

/**
 * Portal's same-origin backend proxy. The transport machinery (header filtering,
 * bearer minting from the `aomi_session` cookie, SSE, forwarding) lives in
 * `@aomi-labs/account`'s `createBackendProxy`, shared with base + landing. Portal
 * supplies only its own policy: the route allowlist, the GitHub-install platform
 * default, and the platform-app merge on `/api/session/apps`.
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

function applyPortalDefaults(upstreamUrl: URL): void {
  if (
    upstreamUrl.pathname === "/api/integrations/github-app/oauth/start" &&
    !upstreamUrl.searchParams.get("platform")
  ) {
    upstreamUrl.searchParams.set("platform", launchConfig().platform);
  }
}

function normalizeAppDescriptors(data: unknown): AomiAppDescriptor[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => {
      if (typeof item === "string" && item.trim().length > 0) {
        return { name: item.trim() };
      }
      if (item && typeof item === "object" && "name" in item) {
        const descriptor = item as AomiAppDescriptor;
        if (descriptor.name?.trim()) {
          return { ...descriptor, name: descriptor.name.trim() };
        }
      }
      return null;
    })
    .filter((item): item is AomiAppDescriptor => item !== null);
}

async function mergePlatformApps(
  descriptors: AomiAppDescriptor[],
): Promise<AomiAppDescriptor[]> {
  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const merged = new Map(
      descriptors.map((descriptor) => [descriptor.name, descriptor]),
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
        if (!merged.has(app.name)) {
          merged.set(app.name, { name: app.name });
        }
      }
    }

    return Array.from(merged.values());
  } catch (error) {
    console.warn("Aomi proxy: could not merge platform apps into session apps", {
      message: error instanceof Error ? error.message : String(error),
    });
    return descriptors;
  }
}

export const { GET, POST, PUT, PATCH, DELETE } = createBackendProxy({
  allowedRoutes: ALLOWED_ROUTES,
  // Keep portal's existing upstream resolution (AOMI_PROXY_BACKEND_URL wins, then
  // BACKEND_URL/NEXT_PUBLIC_BACKEND_URL); pass it explicitly so portal's deploy
  // behavior is unchanged.
  upstreamBaseUrl: process.env.AOMI_PROXY_BACKEND_URL || configuredBackendUrl(),
  applyDefaults: applyPortalDefaults,
  async transformResponse({ req, upstreamUrl, upstream, copyResponseHeaders }) {
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
    return null;
  },
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

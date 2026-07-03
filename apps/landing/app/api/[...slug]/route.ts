import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";

/**
 * Landing's same-origin backend proxy. The transport machinery (header
 * filtering, optional bearer minting, SSE, forwarding)
 * lives in `@aomi-labs/account`'s `createBackendProxy`, shared with portal +
 * base. Landing is unauthenticated in this cleanup, so it passes an anonymous
 * resolver and forwards only the widget routes below.
 */
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
  { pattern: /^\/api\/simulate$/, methods: new Set(["POST"]) },
];

export const { GET, POST, PUT, PATCH, DELETE } = createBackendProxy({
  allowedRoutes: ALLOWED_ROUTES,
  resolveCanonicalUserId: async () => null,
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

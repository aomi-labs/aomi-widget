import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";

/**
 * base's same-origin backend proxy. The transport machinery (header filtering,
 * bearer minting from the `aomi_session` cookie, SSE, forwarding) lives in
 * `@aomi-labs/account`'s `createBackendProxy`, shared with portal + landing.
 *
 * base authenticates with a Base smart account (no provider JWT): its session is
 * established by the local SIWE routes under `/api/bff/auth/siwe/*`, after which
 * this proxy injects the AccountBearer from the `aomi_session` cookie. The old
 * browser-held-bearer routes (`/api/account/exchange`, `/api/auth/privy/begin`)
 * are gone — the browser no longer supplies `Authorization`.
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
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

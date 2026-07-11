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
  { pattern: /^\/api\/thread\/state$/, methods: new Set(["GET"]), auth: "optional" },
  { pattern: /^\/api\/thread\/chat$/, methods: new Set(["POST"]), auth: "optional" },
  { pattern: /^\/api\/system$/, methods: new Set(["POST"]), auth: "optional" },
  {
    pattern: /^\/api\/thread\/interrupt$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
  { pattern: /^\/api\/secrets$/, methods: new Set(["GET", "POST", "DELETE"]) },
  { pattern: /^\/api\/secrets\/[^/]+$/, methods: new Set(["DELETE"]) },
  { pattern: /^\/api\/thread\/updates$/, methods: new Set(["GET"]), auth: "optional" },
  {
    pattern: /^\/api\/sessions$/,
    methods: new Set(["GET", "POST"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/sessions\/[^/]+$/,
    methods: new Set(["GET", "PATCH", "DELETE"]),
    auth: "optional",
  },
  { pattern: /^\/api\/thread\/events$/, methods: new Set(["GET"]), auth: "optional" },
  {
    pattern: /^\/api\/session\/apps$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/session\/models$/,
    methods: new Set(["GET"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/session\/model$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
  {
    pattern: /^\/api\/exec\/simulate$/,
    methods: new Set(["POST"]),
    auth: "optional",
  },
];

export const { GET, POST, PUT, PATCH, DELETE } = createBackendProxy({
  allowedRoutes: ALLOWED_ROUTES,
  resolveCanonicalUserId: async () => null,
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

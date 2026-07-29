import { createBackendProxy, type AllowedRoute } from "@aomi-labs/account";
import { resolveCanonicalUserId } from "@portal/server/canonical-session";
import { widgetPreflight, widgetRoute } from "@portal/lib/widget-auth/response";
import type { NextRequest } from "next/server";

// Keep Privy delegation outside `/api/auth/*`: Better Auth owns that namespace
// through its catch-all route. The Rust endpoint remains the provider-facing
// contract; this BFF route supplies its trusted AccountBearer and thread header.
const ROUTES: AllowedRoute[] = [
  {
    pattern: /^\/api\/auth\/privy\/begin$/,
    methods: new Set(["POST"]),
  },
];

const proxy = createBackendProxy({
  allowedRoutes: ROUTES,
  resolveCanonicalUserId,
});

export const POST = widgetRoute(
  (request: NextRequest) =>
    proxy.POST(request, {
      params: Promise.resolve({ slug: ["auth", "privy", "begin"] }),
    }),
  "Privy delegation begin",
);

export const OPTIONS = widgetPreflight(["POST", "OPTIONS"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createBearerTokenRoute } from "@aomi-labs/account";
import { resolveCanonicalUserId } from "@portal/server/canonical-session";
import { widgetPreflight, widgetRoute } from "@portal/lib/widget-auth/response";
import type { NextRequest } from "next/server";

const getBearer = createBearerTokenRoute({
  resolveCanonicalUserId,
});

export const GET = widgetRoute(
  async (request: NextRequest) => getBearer(request),
  "account bearer",
);

export const OPTIONS = widgetPreflight(["GET", "OPTIONS"]);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

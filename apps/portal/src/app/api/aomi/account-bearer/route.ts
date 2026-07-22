import { createBearerTokenRoute } from "@aomi-labs/account";
import { resolvePortalCanonicalUserId } from "@portal/lib/widget-auth/principal";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";
import type { NextRequest } from "next/server";

const getBearer = createBearerTokenRoute({
  resolveCanonicalUserId: resolvePortalCanonicalUserId,
});

export async function GET(request: NextRequest): Promise<Response> {
  return applyWidgetCors(request, await getBearer(request));
}

export function OPTIONS(request: Request): Response {
  return widgetCorsPreflight(request, ["GET", "OPTIONS"]);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

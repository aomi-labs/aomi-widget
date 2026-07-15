import { revokeWidgetSession } from "@aomi-labs/account/widget-auth";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";

export async function DELETE(request: Request): Promise<Response> {
  const revoked = await revokeWidgetSession({ request });
  return applyWidgetCors(
    request,
    revoked
      ? new Response(null, { status: 204 })
      : Response.json({ error: "invalid_widget_session" }, { status: 401 }),
  );
}

export function OPTIONS(request: Parameters<typeof widgetCorsPreflight>[0]) {
  return widgetCorsPreflight(request, ["DELETE", "OPTIONS"]);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@aomi-labs/account/better-auth";
import { revokeWidgetSession } from "@aomi-labs/account/widget-auth";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";
import {
  requirePortalPrincipal,
  PortalPrincipalError,
} from "@portal/lib/widget-auth/principal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  let principal;
  try {
    principal = await requirePortalPrincipal(req);
  } catch (error) {
    const status = error instanceof PortalPrincipalError ? error.status : 500;
    const code =
      error instanceof PortalPrincipalError ? error.code : "sign_out_failed";
    return applyWidgetCors(req, Response.json({ error: code }, { status }));
  }
  if (principal.kind === "widget") {
    const revoked = await revokeWidgetSession({ request: req });
    return applyWidgetCors(
      req,
      revoked
        ? new Response(null, { status: 204 })
        : Response.json({ error: "invalid_widget_session" }, { status: 401 }),
    );
  }
  const url = new URL(req.url);
  url.pathname = "/api/auth/sign-out";
  url.search = "";
  return applyWidgetCors(
    req,
    await auth.handler(
      new Request(url, {
        method: "POST",
        headers: req.headers,
      }),
    ),
  );
}

export function OPTIONS(request: Request): Response {
  return widgetCorsPreflight(request, ["POST", "OPTIONS"]);
}

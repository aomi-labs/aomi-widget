import { auth } from "@aomi-labs/account/better-auth";
import { revokeWidgetSession } from "@aomi-labs/account/widget-auth";
import { requirePortalPrincipal } from "@portal/server/widget-auth/principal";
import { widgetPreflight, widgetRoute } from "@portal/server/widget-auth/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = widgetRoute(async (req: Request) => {
  const principal = await requirePortalPrincipal(req);
  if (principal.kind === "widget") {
    const revoked = await revokeWidgetSession({ request: req });
    return revoked
      ? new Response(null, { status: 204 })
      : Response.json({ error: "invalid_widget_session" }, { status: 401 });
  }
  const url = new URL(req.url);
  url.pathname = "/api/auth/sign-out";
  url.search = "";
  return auth.handler(
    new Request(url, {
      method: "POST",
      headers: req.headers,
    }),
  );
}, "account.sign_out");

export const OPTIONS = widgetPreflight(["POST", "OPTIONS"]);

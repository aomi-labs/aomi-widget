import {
  renameAuthIdentity,
  unlinkAuthIdentity,
} from "@aomi-labs/account/account";
import { json } from "@portal/lib/aomi-account/session";
import { accountResponseForPrincipal } from "@portal/lib/widget-auth/principal";
import { portalRoutePrincipal } from "@portal/lib/widget-auth/response";
import {
  applyWidgetCors,
  widgetCorsPreflight,
} from "@portal/lib/widget-auth/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await portalRoutePrincipal(req);
  if ("response" in auth) return auth.response;
  const current = auth.principal;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    displayLabel?: string | null;
  } | null;
  if (!body || !("displayLabel" in body)) {
    return applyWidgetCors(req, json(400, { error: "display_label_required" }));
  }
  const result = await renameAuthIdentity({
    userId: current.userId,
    identityId: id,
    displayLabel: body.displayLabel ?? null,
  });
  if (result === "not_found")
    return applyWidgetCors(req, json(404, { error: "identity_not_found" }));
  if (result === "protected")
    return applyWidgetCors(req, json(403, { error: "protected_identity" }));
  return applyWidgetCors(
    req,
    Response.json(await accountResponseForPrincipal(req, current)),
  );
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const auth = await portalRoutePrincipal(req);
  if ("response" in auth) return auth.response;
  const current = auth.principal;
  const { id } = await ctx.params;
  const result = await unlinkAuthIdentity({
    userId: current.userId,
    identityId: id,
  });
  if (result === "not_found")
    return applyWidgetCors(req, json(404, { error: "identity_not_found" }));
  if (result === "protected")
    return applyWidgetCors(req, json(403, { error: "protected_identity" }));
  if (result === "last_factor") {
    return applyWidgetCors(
      req,
      json(409, { error: "cannot_unlink_last_login_factor" }),
    );
  }
  return applyWidgetCors(req, Response.json({ status: "revoked" }));
}

export function OPTIONS(req: Request): Response {
  return widgetCorsPreflight(req, ["PATCH", "DELETE", "OPTIONS"]);
}

import { unlinkAuthIdentity } from "@aomi-labs/auth/service/account-service";
import { json, requireAomiSession } from "@portal/lib/aomi-account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const current = await requireAomiSession(req);
  if (!current) return json(401, { error: "unauthenticated" });
  const { id } = await ctx.params;
  const result = await unlinkAuthIdentity({
    userId: current.user.id,
    identityId: id,
  });
  if (result === "not_found") return json(404, { error: "identity_not_found" });
  if (result === "protected") return json(403, { error: "protected_identity" });
  if (result === "last_factor") {
    return json(409, { error: "cannot_unlink_last_login_factor" });
  }
  return Response.json({ status: "revoked" });
}

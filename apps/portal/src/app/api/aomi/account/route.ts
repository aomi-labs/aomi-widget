import {
  accountResponseFromSession,
  json,
  requireAomiSession,
} from "@portal/lib/aomi-account/session";
import { updateAccountProfile } from "@aomi-labs/auth/service/account-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  return Response.json(await accountResponseFromSession(req));
}

export async function PATCH(req: Request): Promise<Response> {
  const current = await requireAomiSession(req);
  if (!current) return json(401, { error: "unauthenticated" });
  const body = (await req.json().catch(() => null)) as {
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  if (!body) return json(400, { error: "invalid_json" });
  await updateAccountProfile({
    userId: current.user.id,
    displayName: body.displayName,
    avatarUrl: body.avatarUrl,
  });
  return Response.json(await accountResponseFromSession(req));
}

import {
  accountResponseFromSession,
  json,
  requireAomiSession,
} from "@portal/lib/aomi-account/session";
import {
  deactivateAomiAccount,
  updateAccountProfile,
} from "@aomi-labs/auth/account";
import { auth } from "@aomi-labs/auth/better-auth";

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

export async function DELETE(req: Request): Promise<Response> {
  const current = await requireAomiSession(req);
  if (!current) return json(401, { error: "unauthenticated" });

  const result = await deactivateAomiAccount({
    userId: current.user.id,
  });
  if (result.status === "not_found") {
    return json(404, { error: "account_not_found" });
  }

  const url = new URL(req.url);
  url.pathname = "/api/auth/sign-out";
  url.search = "";
  const signOutResponse = await auth.handler(
    new Request(url, {
      method: "POST",
      headers: req.headers,
    }),
  );

  return Response.json(result, {
    headers: signOutResponse.headers,
  });
}

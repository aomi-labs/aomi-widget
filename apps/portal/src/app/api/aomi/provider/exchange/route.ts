import { exchangeProviderForExistingSession } from "@aomi-labs/account/account";
import type { AomiAccountCredential } from "@aomi-labs/account";
import { getBetterAuthSession, json } from "@portal/lib/aomi-account/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const session = await getBetterAuthSession(req);
  if (!session?.user?.id) {
    return json(401, { error: "unauthenticated" });
  }
  const body = (await req
    .json()
    .catch(() => null)) as AomiAccountCredential | null;
  if (!body) return json(400, { error: "invalid_json" });
  try {
    const result = await exchangeProviderForExistingSession({
      betterAuthUserId: session.user.id,
      credential: body,
    });
    if (result.status === "conflict") {
      return json(409, {
        ...result,
        error: "already_linked_to_another_account",
      });
    }
    return Response.json(result);
  } catch (error) {
    return json(400, {
      error:
        error instanceof Error ? error.message : "provider_exchange_failed",
    });
  }
}

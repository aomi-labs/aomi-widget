import type { NextRequest } from "next/server";
import { auth } from "@aomi-labs/auth/better-auth";
import { getOrCreateAomiUserForBetterAuthSession } from "@aomi-labs/auth/account";
import { resolveOrCreateCanonicalUser } from "./account-graph";

/**
 * Resolve the canonical backend user id from the incoming BetterAuth-session-first flow.
 * Browsers present the BetterAuth cookie; headless clients present the bearer()
 * token in Authorization. The proxy then mints the short-lived AccountBearer
 * for the Rust backend from this canonical id.
 */
export async function getSessionedCanonicalId(
  request: NextRequest,
): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  const sessionUser = session?.user;
  const betterAuthUserId =
    typeof sessionUser?.id === "string" ? sessionUser.id : null;
  if (sessionUser && betterAuthUserId) {
    const aomiUser = await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId,
      email: sessionUser.email,
      emailVerified: sessionUser.emailVerified ?? undefined,
      name: sessionUser.name,
      avatarUrl: sessionUser.image,
    });
    const user = await resolveOrCreateCanonicalUser({
      provider: "better_auth",
      subject: betterAuthUserId,
      canonicalUserId: aomiUser.id,
    });
    return user.userId;
  }
  return null;
}

import { resolveOrCreateCanonicalUser } from "@aomi-labs/account";

import {
  getBetterAuthSession,
  sessionUserSeed,
} from "@portal/lib/aomi-account/session";
import { getOrCreateAomiUserForBetterAuthSession } from "@aomi-labs/auth/account";

export async function resolveBetterAuthCanonicalUserId(
  req: Request,
): Promise<string | null> {
  const session = await getBetterAuthSession(req);
  const seed = sessionUserSeed(session);
  if (!seed) return null;

  const aomiUser = await getOrCreateAomiUserForBetterAuthSession(seed);
  const backendUser = await resolveOrCreateCanonicalUser({
    provider: "better_auth",
    subject: seed.betterAuthUserId,
    canonicalUserId: aomiUser.id,
  });
  return backendUser.userId;
}

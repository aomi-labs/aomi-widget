import { requireAomiSession } from "@portal/lib/aomi-account/session";
import { resolveE2ECanonicalUserId } from "@portal/server/e2e-wallet";

/**
 * Resolve the canonical backend user id for the current BetterAuth session.
 * `getOrCreateAomiUserForBetterAuthSession` (via `requireAomiSession`) already
 * writes the canonical `users` / `auth_providers` rows the Rust backend reads,
 * so its `user.id` IS the AccountBearer `sub`. An identity already linked to
 * another account throws (`identity_already_linked_to_another_account`)
 * rather than silently rebinding.
 */
export async function resolveBetterAuthCanonicalUserId(
  req: Request,
): Promise<string | null> {
  const e2eUserId = resolveE2ECanonicalUserId(req);
  if (e2eUserId) return e2eUserId;
  const result = await requireAomiSession(req);
  return result?.user.id ?? null;
}

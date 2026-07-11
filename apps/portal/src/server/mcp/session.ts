import "server-only";

import {
  getOrCreateAomiUserForBetterAuthSession,
  syncSiweWalletsForUser,
} from "@aomi-labs/account/account";
import type { DbAomiUser } from "@aomi-labs/account";

export type McpBetterAuthUserSeed = {
  betterAuthUserId: string;
};

/**
 * MCP OAuth tokens carry the BetterAuth user id. Resolve it into Aomi's
 * canonical account graph and materialize any SIWE wallet rows into
 * `public_keys` before tool execution needs wallet policy.
 */
export async function resolveMcpCanonicalUser(
  input: McpBetterAuthUserSeed,
): Promise<DbAomiUser> {
  const user = await getOrCreateAomiUserForBetterAuthSession(input);
  await syncSiweWalletsForUser({
    aomiUserId: user.id,
    betterAuthUserId: input.betterAuthUserId,
  });
  return user;
}

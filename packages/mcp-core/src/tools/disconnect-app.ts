// =============================================================================
// disconnect_app — soft-revoke an access_approval.
// =============================================================================
//
// v1 only flips `revoked_at` on the access_approval metadata row. The secret
// material in BE's SecretVault is NOT cleared here — that needs a separate
// BE call (existing DELETE /api/secrets endpoints, post-v1).
//
// Effect today: subsequent `connect_app(name)` calls for the same user will
// see no active approval and start a fresh OAuth flow. Stale slots in the
// BE vault are harmless — they just won't be looked up by the agent (no
// active grant pointing at them).

import { z } from "zod";
import type { AuthPort } from "../ports/auth";
import type { McpCallCtx } from "../types";

export const DisconnectAppArgs = z.object({
  name: z
    .string()
    .min(1)
    .describe("Application id to disconnect, e.g. 'dummy', 'privy', 'binance'."),
});

export type DisconnectAppInput = z.infer<typeof DisconnectAppArgs>;

export type DisconnectAppResult =
  | { status: "disconnected"; approval_id: string }
  | { status: "not_connected" };

export interface DisconnectAppDeps {
  auth: AuthPort;
}

export async function runDisconnectApp(
  deps: DisconnectAppDeps,
  ctx: McpCallCtx,
  input: DisconnectAppInput,
): Promise<DisconnectAppResult> {
  const existing = await deps.auth.lookupApproval({
    userId: ctx.userId,
    application: input.name,
  });
  if (!existing) {
    return { status: "not_connected" };
  }
  await deps.auth.revokeApproval({ approvalId: existing.id });
  return { status: "disconnected", approval_id: existing.id };
}

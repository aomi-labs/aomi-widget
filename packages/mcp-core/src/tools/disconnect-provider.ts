// =============================================================================
// disconnect_provider — revoke a global wallet-provider approval.
// =============================================================================
//
// Mirror of `connect_provider`: targets the user's global identity
// (`application=NULL`) for the named provider. For app-scoped revocation
// use `disconnect_app` instead.

import { z } from "zod";
import type { AuthPort } from "../ports/auth";
import type { McpCallCtx } from "../types";

export const DisconnectProviderArgs = z.object({
  provider: z
    .string()
    .min(1)
    .describe("Wallet provider id to disconnect: 'privy' | 'para' | 'dummy' | ..."),
});

export type DisconnectProviderInput = z.infer<typeof DisconnectProviderArgs>;

export type DisconnectResult =
  | { status: "disconnected"; approval_id: string }
  | { status: "not_connected" };

export interface DisconnectProviderDeps {
  auth: AuthPort;
}

export async function runDisconnectProvider(
  deps: DisconnectProviderDeps,
  ctx: McpCallCtx,
  input: DisconnectProviderInput,
): Promise<DisconnectResult> {
  return disconnectImpl(deps.auth, ctx, {
    walletProvider: input.provider,
    application: null,
  });
}

export async function disconnectImpl(
  auth: AuthPort,
  ctx: McpCallCtx,
  args: { walletProvider: string; application: string | null },
): Promise<DisconnectResult> {
  const existing = await auth.lookupApproval({
    userId: ctx.userId,
    application: args.application,
    walletProvider: args.walletProvider,
  });
  if (!existing) return { status: "not_connected" };
  await auth.revokeApproval({ approvalId: existing.id });
  return { status: "disconnected", approval_id: existing.id };
}

// =============================================================================
// disconnect_app — revoke an app-scoped wallet-provider approval.
// =============================================================================
//
// Mirror of `connect_app`: targets `(application, wallet_provider)` for
// the current user. For unscoped (global) revocation use
// `disconnect_provider` instead.

import { z } from "zod";
import type { AuthPort } from "../ports/auth";
import type { McpCallCtx } from "../types";
import { disconnectImpl, type DisconnectResult } from "./disconnect-provider";

export const DisconnectAppArgs = z.object({
  application: z
    .string()
    .min(1)
    .describe("Aomi app id: 'byreal' | 'dydx' | ..."),
  provider: z
    .string()
    .min(1)
    .describe("Wallet provider id to disconnect: 'privy' | 'para' | 'dummy' | ..."),
});

export type DisconnectAppInput = z.infer<typeof DisconnectAppArgs>;

export interface DisconnectAppDeps {
  auth: AuthPort;
}

export async function runDisconnectApp(
  deps: DisconnectAppDeps,
  ctx: McpCallCtx,
  input: DisconnectAppInput,
): Promise<DisconnectResult> {
  return disconnectImpl(deps.auth, ctx, {
    walletProvider: input.provider,
    application: input.application,
  });
}

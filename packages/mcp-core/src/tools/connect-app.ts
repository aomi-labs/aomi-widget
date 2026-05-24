// =============================================================================
// connect_app — connect a wallet provider scoped to a specific Aomi app.
// =============================================================================
//
// "Connect Privy for Byreal" → `DbAuthIdentity` row has
// `application='byreal', wallet_provider='privy'`. Use when the user's
// identity inside an Aomi app is distinct from their other Aomi-app
// identities (e.g. they want a separate Privy account per app).
//
// For the simpler "connect Privy to my Aomi account" case (no app scope),
// use `connect_provider` instead.

import { z } from "zod";
import type { AuthPort } from "../ports/auth";
import type { McpCallCtx } from "../types";
import {
  connectImpl,
  type ConnectProviderResult,
} from "./connect-provider";

export const ConnectAppArgs = z.object({
  application: z
    .string()
    .min(1)
    .describe("Aomi app id the identity is scoped to: 'byreal' | 'dydx' | ..."),
  provider: z
    .string()
    .min(1)
    .describe("Wallet provider id: 'privy' | 'para' | 'dummy' | ..."),
  timeout_ms: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      "How long to wait for the user to complete OAuth before returning 'pending'. Default 5000 (5s). Pass 0 to return immediately.",
    ),
});

export type ConnectAppInput = z.infer<typeof ConnectAppArgs>;

export type ConnectAppResult = ConnectProviderResult;

export interface ConnectAppDeps {
  auth: AuthPort;
}

export async function runConnectApp(
  deps: ConnectAppDeps,
  ctx: McpCallCtx,
  input: ConnectAppInput,
): Promise<ConnectAppResult> {
  return connectImpl(deps.auth, ctx, {
    walletProvider: input.provider,
    application: input.application,
    timeoutMs: input.timeout_ms,
    label: `${input.application} × ${input.provider}`,
  });
}

// =============================================================================
// connect_provider — connect a wallet provider at the global Aomi level.
// =============================================================================
//
// "Connect Privy to my Aomi account" → no app scope. Resulting
// `DbAuthIdentity` row has `application=NULL`. For app-scoped identities
// (e.g. "connect Privy for Byreal"), use `connect_app` instead.
//
// Returns `connected` immediately if a global approval for this provider
// already exists. Otherwise begins an OAuth flow, optionally waits up to
// `timeout_ms` for completion, and returns either `connected` or
// `pending` (with the URL the caller must surface to the user).

import { z } from "zod";
import type { AuthPort } from "../ports/auth";
import type { McpCallCtx } from "../types";

export const ConnectProviderArgs = z.object({
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

export type ConnectProviderInput = z.infer<typeof ConnectProviderArgs>;

export type ConnectProviderResult =
  | { status: "connected"; approval_id: string; label?: string }
  | {
      status: "pending";
      auth_url: string;
      state_token: string;
      message: string;
    }
  | { status: "failed"; error: string };

export interface ConnectProviderDeps {
  auth: AuthPort;
}

export async function runConnectProvider(
  deps: ConnectProviderDeps,
  ctx: McpCallCtx,
  input: ConnectProviderInput,
): Promise<ConnectProviderResult> {
  return connectImpl(deps.auth, ctx, {
    walletProvider: input.provider,
    application: null,
    timeoutMs: input.timeout_ms,
    label: input.provider,
  });
}

// ---------------------------------------------------------------------------
// Shared core — also used by connect_app(application, provider).
// ---------------------------------------------------------------------------

export async function connectImpl(
  auth: AuthPort,
  ctx: McpCallCtx,
  args: {
    walletProvider: string;
    application: string | null;
    timeoutMs?: number;
    /** Human label for the error/log path ("privy" / "byreal × privy"). */
    label: string;
  },
): Promise<ConnectProviderResult> {
  const existing = await auth.lookupApproval({
    userId: ctx.userId,
    application: args.application,
    walletProvider: args.walletProvider,
  });
  if (existing) {
    return {
      status: "connected",
      approval_id: existing.id,
      label: existing.displayLabel,
    };
  }

  const begin = await auth.beginAuth({
    userId: ctx.userId,
    walletProvider: args.walletProvider,
    application: args.application,
  });

  const timeoutMs = args.timeoutMs ?? 5_000;
  if (timeoutMs > 0) {
    const result = await auth.awaitAuth({
      stateToken: begin.stateToken,
      timeoutMs,
    });
    if (result.status === "completed") {
      const approval = await auth.lookupApproval({
        userId: ctx.userId,
        application: args.application,
        walletProvider: args.walletProvider,
      });
      return {
        status: "connected",
        approval_id: result.approvalId,
        label: approval?.displayLabel,
      };
    }
    if (result.status === "failed") {
      return { status: "failed", error: result.error };
    }
  }

  return {
    status: "pending",
    auth_url: begin.authUrl,
    state_token: begin.stateToken,
    message: `Open this URL to authorize: ${begin.authUrl}`,
  };
}

/** Human-readable rendering for the MCP tool's text content channel. */
export function summarizeConnectResult(
  result: ConnectProviderResult,
  label: string,
): string {
  if (result.status === "connected") {
    return result.label
      ? `Connected ${label} — ${result.label}`
      : `Connected ${label}`;
  }
  if (result.status === "pending") {
    return `Approval needed. Ask the user to open this URL, then call the connect tool again to confirm:\n\n${result.auth_url}`;
  }
  return `Failed to connect ${label}: ${result.error}`;
}

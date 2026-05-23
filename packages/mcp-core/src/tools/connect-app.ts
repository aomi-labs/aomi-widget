// =============================================================================
// connect_app — MCP tool for Path 1 auth.
// =============================================================================
//
// 1. Looks up the user's access_approval for the named app. If present,
//    returns connected immediately.
// 2. Otherwise begins an auth flow, returns the URL + state_token, and
//    long-polls awaitAuth for up to `timeout_ms` (default 5s — short
//    enough not to hang MCP clients, long enough that fast users get a
//    one-shot success).
//   - On completion → connected with approval_id + label.
//   - On timeout → 'pending' with the URL so Claude can prompt the user
//     and call the tool again (or `pending_tx`) to recheck.
//
// The tool never sees credential material. Auth handles the secret-store
// round-trip inside the callback handler.

import { z } from "zod";
import type { AuthPort } from "../ports/auth";
import type { McpCallCtx } from "../types";

export const ConnectAppArgs = z.object({
  name: z
    .string()
    .min(1)
    .describe("Application id, e.g. 'dummy', 'binance', 'privy'."),
  timeout_ms: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      "How long to wait for the user to complete OAuth before returning 'pending'. Default 5000 (5s). Pass 0 to return immediately without waiting.",
    ),
});

export type ConnectAppInput = z.infer<typeof ConnectAppArgs>;

export type ConnectAppResult =
  | {
      status: "connected";
      approval_id: string;
      label?: string;
    }
  | {
      status: "pending";
      auth_url: string;
      state_token: string;
      message: string;
    }
  | {
      status: "failed";
      error: string;
    };

export interface ConnectAppDeps {
  auth: AuthPort;
}

export async function runConnectApp(
  deps: ConnectAppDeps,
  ctx: McpCallCtx,
  input: ConnectAppInput,
): Promise<ConnectAppResult> {
  const existing = await deps.auth.lookupApproval({
    userId: ctx.userId,
    application: input.name,
  });
  if (existing) {
    return {
      status: "connected",
      approval_id: existing.id,
      label: existing.displayLabel,
    };
  }

  const begin = await deps.auth.beginAuth({
    userId: ctx.userId,
    provider: input.name,
  });

  const timeoutMs = input.timeout_ms ?? 5_000;

  if (timeoutMs > 0) {
    const result = await deps.auth.awaitAuth({
      stateToken: begin.stateToken,
      timeoutMs,
    });
    if (result.status === "completed") {
      const approval = await deps.auth.lookupApproval({
        userId: ctx.userId,
        application: input.name,
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

/** Human-readable rendering for the MCP tool's text content channel. Keeps
 *  Claude's tool-result line short and informative — the structuredContent
 *  always carries the full result for programmatic consumers. */
export function summarizeConnectAppResult(
  result: ConnectAppResult,
  appName: string,
): string {
  if (result.status === "connected") {
    return result.label
      ? `Connected to ${appName} — ${result.label}`
      : `Connected to ${appName}`;
  }
  if (result.status === "pending") {
    return `Approval needed. Ask the user to open this URL, then call connect_app again to confirm:\n\n${result.auth_url}`;
  }
  return `Failed to connect ${appName}: ${result.error}`;
}

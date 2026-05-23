// =============================================================================
// aomi_connect_app — MCP tool for Path 1 auth.
// =============================================================================
//
// 1. Looks up the user's access_approval for the named app. If present,
//    returns success silently.
// 2. Otherwise begins an auth flow, returns the URL + state_token, and
//    long-polls awaitAuth for up to `timeout_ms` (default 60s).
//   - On completion → returns success with the approval id + label.
//   - On timeout → returns 'pending' with the URL so Claude can prompt the
//     user and the caller can re-invoke to extend.
//
// The tool never sees credential material. Auth handles the secret-store
// round-trip inside the callback handler.

import { z } from "zod";
import type { AuthPort } from "../ports/auth";
import type { McpCallCtx } from "../types";

export const ConnectAppArgs = z.object({
  name: z.string().min(1).describe("Application id, e.g. 'dummy', 'binance'."),
  timeout_ms: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("How long to long-poll for completion. Default 60000."),
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

  const result = await deps.auth.awaitAuth({
    stateToken: begin.stateToken,
    timeoutMs: input.timeout_ms ?? 60_000,
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

  return {
    status: "pending",
    auth_url: begin.authUrl,
    state_token: begin.stateToken,
    message: `Open this URL to authorize: ${begin.authUrl}`,
  };
}

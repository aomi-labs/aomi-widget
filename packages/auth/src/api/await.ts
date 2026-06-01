// =============================================================================
// awaitAuth — long-poll for a pending auth to complete.
// =============================================================================
//
// Polls the `pending_auths` row every `pollMs` (default 500) until either
// `completed_at` is set or `timeoutMs` elapses. Both MCP (Path 1) and the
// BE (Path 2) call this — the only difference is who's blocking.
//
// Returns one of:
//   { status: 'completed', approvalId }
//   { status: 'failed', error }
//   { status: 'pending' }              — caller can re-issue to extend
//
// HTTP wire shape (via /api/auth/await/[state]) is snake_case — see
// `routes/await.ts`. The TS-internal shape stays camelCase.

import type { Store } from "../store";
import type { AwaitResult } from "../types";

export interface AwaitAuthDeps {
  store: Store;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

export interface AwaitAuthArgs {
  stateToken: string;
  timeoutMs?: number;
  pollMs?: number;
}

export async function awaitAuth(
  deps: AwaitAuthDeps,
  args: AwaitAuthArgs,
): Promise<AwaitResult> {
  const sleep = deps.sleep ?? defaultSleep;
  const now = deps.now ?? Date.now;
  const timeoutMs = args.timeoutMs ?? 60_000;
  const pollMs = args.pollMs ?? 500;

  const deadline = now() + timeoutMs;

  while (true) {
    const row = await deps.store.getPendingAuth(args.stateToken);
    if (!row) {
      return { status: "failed", error: "pending state not found" };
    }
    if (row.error) {
      return { status: "failed", error: row.error };
    }
    if (row.completedAt && row.resultApprovalId) {
      return { status: "completed", approvalId: row.resultApprovalId };
    }

    const remaining = deadline - now();
    if (remaining <= 0) {
      return { status: "pending" };
    }
    await sleep(Math.min(pollMs, remaining));
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

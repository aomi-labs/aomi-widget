// =============================================================================
// aomi_pending_tx — list staged wallet requests for the current Aomi user.
// =============================================================================
//
// Read-only. Returns whatever the BE currently has staged on the user's
// session: EVM transactions, EIP-712 sign requests, Solana sign requests.
//
// Claude calls this between turns or after `aomi_chat` returns
// `newly_queued` ids — to surface details (amounts, descriptions) to the
// user before prompting them to sign via the future `aomi_sign_tx` tool.

import { z } from "zod";
import type { BackendPort } from "../ports/backend";
import type { McpCallCtx } from "../types";

export const PendingTxArgs = z.object({});

export type PendingTxInput = z.infer<typeof PendingTxArgs>;

export interface PendingTxDeps {
  backend: BackendPort;
}

export async function runPendingTx(
  deps: PendingTxDeps,
  ctx: McpCallCtx,
  _input: PendingTxInput,
) {
  const pending = await deps.backend.listPendingTx({ userId: ctx.userId });
  return { pending };
}

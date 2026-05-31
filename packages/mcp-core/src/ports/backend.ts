// =============================================================================
// Backend port — the slice of Aomi BE that mcp-core depends on.
// =============================================================================
//
// PR #2 wires `chat` and `listPendingTx`. `request_signature` arrives in
// PR #3 with the sign broker.
//
// All methods are user-scoped. v1 convention: `session_id == client_id ==
// user_id` (the BE's "non-sessional" mode — see ApiAuth::is_non_sessional).
// Concurrency: v1 does not lock per user; concurrent calls for the same
// user race on the shared BE session. Acceptable until UX demands serial.

import type { UserId } from "@aomi-labs/auth";

/** Subset of `PendingTx`/`PendingSolTx` exposed to Claude. Drops opaque
 *  backend-only fields (txId, eip712Id, payload). */
export interface PendingTxInfo {
  id: string;
  kind: "transaction" | "eip712_sign" | "solana_sign";
  to?: string;
  value?: string;
  data?: string;
  chain_id?: number;
  description?: string;
  cluster?: string;
}

export interface BackendChatReply {
  /** Final agent message text. Empty string if the agent only queued a
   *  wallet request with no accompanying message. */
  reply: string;
  /** Pending requests that appeared during this chat turn (diff against
   *  pre-call snapshot). Empty if nothing new was queued. */
  newly_queued: PendingTxInfo[];
}

export interface BackendPort {
  chat(args: { userId: UserId; message: string }): Promise<BackendChatReply>;

  listPendingTx(args: { userId: UserId }): Promise<PendingTxInfo[]>;
}

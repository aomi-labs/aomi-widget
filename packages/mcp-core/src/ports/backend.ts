// =============================================================================
// Backend port — the slice of Aomi BE that mcp-core depends on.
// =============================================================================
//
// v1 leaves most of this stubbed since only `aomi_connect_app` is wired.
// `aomi_chat` (PR #2) and `aomi_list_pending` (PR #3) will need real impls.

import type { UserId } from "@aomi-labs/auth";

export interface BackendChatReply {
  reply: string;
  newlyQueuedTxIds: string[];
}

export interface BackendPendingTx {
  id: string;
  kind: string;
  description?: string;
}

export interface BackendPort {
  chat(args: {
    userId: UserId;
    message: string;
  }): Promise<BackendChatReply>;

  listPending(args: { userId: UserId }): Promise<BackendPendingTx[]>;
}

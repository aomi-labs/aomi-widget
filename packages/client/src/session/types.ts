import type {
  AomiMessage,
  AomiSSEEvent,
  AomiTaskActivityEvent,
  AomiTaskCompletedEvent,
  AomiTaskStartedEvent,
} from "../types";
import type {
  AomiClientType,
  UserState as UserStateShape,
} from "../user-state";
import type {
  WalletEip712Payload,
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
  WalletTxPayload,
} from "../wallet-utils";

export type WalletRequestKind =
  | "transaction"
  | "aa_sign"
  | "eip712_sign"
  | "solana_sign"
  | "solana_sign_message"
  | "solana_send"
  | "solana_sign_and_send";

export type WalletAaSignatureRequest = {
  kind: "personal_sign";
  message: `0x${string}`;
};

export type WalletAaDisplayCall = {
  to: `0x${string}`;
  value: string;
  data?: `0x${string}`;
};

export type WalletAaFeeDisclosure = {
  asset: unknown;
  amount: string;
  recipient: `0x${string}`;
  call: WalletAaDisplayCall;
};

export type WalletAaSignPayload = {
  operationId: string;
  chainId: number;
  owner: `0x${string}`;
  executor: `0x${string}`;
  expiresAt: string;
  callsDigest: `0x${string}`;
  calls: WalletAaDisplayCall[];
  fees: WalletAaFeeDisclosure[];
  signatureRequests: WalletAaSignatureRequest[];
};

/** @deprecated Wallet callbacks are session-owned as of client 0.4.0. */
export type WalletRequestTarget = {
  /** Runtime-managed child that owns this wallet request, when delegated. */
  targetThreadId?: string;
  /** Stable child handle for UI/CLI attribution. */
  agentId?: string;
};

export type WalletRequest =
  | {
      id: string;
      kind: "transaction";
      payload: WalletTxPayload;
      timestamp: number;
    }
  | {
      id: string;
      kind: "aa_sign";
      payload: WalletAaSignPayload;
      timestamp: number;
    }
  | {
      id: string;
      kind: "eip712_sign";
      payload: WalletEip712Payload;
      timestamp: number;
    }
  | {
      id: string;
      kind: "solana_sign";
      payload: WalletSolanaSignPayload;
      timestamp: number;
    }
  | {
      id: string;
      kind: "solana_sign_message";
      payload: WalletSolanaSignMessagePayload;
      timestamp: number;
    }
  | {
      id: string;
      kind: "solana_send";
      payload: WalletSolanaSignPayload;
      timestamp: number;
    }
  | {
      id: string;
      kind: "solana_sign_and_send";
      payload: WalletSolanaSignPayload;
      timestamp: number;
    };

export type WalletRequestResult =
  | {
      kind: "transaction";
      txHash: string;
      amount?: string;
      aaRequestedMode?: "4337" | "7702" | "none";
      aaResolvedMode?: "4337" | "7702" | "none";
      aaFallbackReason?: string;
      executionKind?: string;
      batched?: boolean;
      callCount?: number;
      sponsored?: boolean;
      SmartAccount4337?: string;
      Delegation7702?: string;
      /**
       * PARTIAL batch outcome. Sequential (non-atomic) executors can land a
       * prefix of a batch and then fail: reporting that as one blanket
       * failure erases the on-chain truth — the backend re-queues ALL legs,
       * the agent re-commits, and the already-executed leg double-spends
       * (observed: a 6-leg stake→wrap→supply→borrow where the 5 ETH stake
       * landed, the borrow reverted, and the retry re-staked the 5 ETH
       * against a 4.99 ETH balance). When set, `completedTxIds` narrows the
       * success `wallet:tx_complete` to the legs that actually mined, and
       * `failedTxIds`/`failureReason` emit a second, failed
       * `wallet:tx_complete` for the rest so the backend's ledger matches
       * the chain. Omit both for the atomic all-or-nothing paths (AA).
       */
      completedTxIds?: number[];
      failedTxIds?: number[];
      failureReason?: string;
    }
  | {
      kind: "eip712_sign";
      signature: string;
    }
  | {
      kind: "solana_sign";
      /** Base64 of the full signed Solana transaction bytes. */
      signedTx: string;
    }
  | {
      kind: "solana_sign_message";
      signature: string;
    }
  | {
      kind: "solana_send";
      signature: string;
      signedTx?: string;
    }
  | {
      kind: "solana_sign_and_send";
      signature: string;
      signedTx?: string;
    };

export type SendResult = {
  messages: AomiMessage[];
  title?: string;
};

export type SessionOptions = {
  /** Session ID. Auto-generated (crypto.randomUUID) if omitted. */
  sessionId?: string;
  /** App for chat messages. Default: "default" */
  app?: string;
  /** Optional concrete application row to route chat/model calls to. */
  applicationId?: number | string | null;
  /** API key override. */
  apiKey?: string;
  /** User state to send with requests (wallet connection info, etc). */
  userState?: UserStateShape;
  /** Optional client type hint forwarded to the backend via userState.ext.client_type. */
  clientType?: AomiClientType;
  /** Stable client ID used for secret-vault association. */
  clientId?: string;
  /** Optional backend payment method override for chat turns. */
  paymentMethod?: string | null;
  /**
   * When true (default), synthesize pending transaction wallet requests from
   * `user_state.pending_txs` during state sync. Web UI should disable this and
   * rely on explicit `wallet_tx_request` events from `send_transaction_to_wallet`.
   */
  syncPendingTxRequestsFromUserState?: boolean;
  /** Polling interval in ms. Default: 500 */
  pollIntervalMs?: number;
  /** Logger for debug output. Pass `console` for verbose logging. */
  logger?: { debug: (...args: unknown[]) => void };
};

export type SessionRuntimeOptions = {
  app: string;
  applicationId?: number | string | null;
  apiKey?: string;
  clientId?: string;
  userState?: UserStateShape;
};

export type SessionEventMap = {
  wallet_tx_request: WalletRequest;
  wallet_aa_sign_request: WalletRequest;
  wallet_eip712_request: WalletRequest;
  wallet_solana_sign_request: WalletRequest;
  wallet_solana_sign_message_request: WalletRequest;
  wallet_solana_send_request: WalletRequest;
  wallet_solana_sign_and_send_request: WalletRequest;
  system_notice: { message: string };
  system_error: { message: string };
  async_callback: Record<string, unknown>;
  tool_update: AomiSSEEvent;
  tool_complete: AomiSSEEvent;
  task_started: AomiTaskStartedEvent;
  task_activity: AomiTaskActivityEvent;
  task_completed: AomiTaskCompletedEvent;
  title_changed: { title: string };
  messages: AomiMessage[];
  user_state_updated: UserStateShape;
  processing_start: undefined;
  processing_end: undefined;
  wallet_requests_changed: WalletRequest[];
  backend_idle: undefined;
  error: { error: unknown };
  "*": { type: string; payload: unknown };
};

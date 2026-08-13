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
import type { WalletSolanaSignPayload, WalletTxPayload } from "../wallet-utils";

export type WalletRequestKind =
  | "transaction"
  | "signing"
  | "solana_send"
  | "solana_sign_and_send";

export type WalletSignablePayload =
  | { kind: "evm_personal"; message: `0x${string}` }
  | {
      kind: "evm_typed_data";
      typedData: NonNullable<
        import("../wallet-utils").WalletEip712Payload["typed_data"]
      >;
    }
  | { kind: "svm_message"; messageBase64: string }
  | { kind: "svm_transaction"; transactionBase64: string };

export type WalletAaDisplayCall = {
  to: `0x${string}`;
  value: string;
  data?: `0x${string}`;
};

export type WalletAaFeeDisclosure = {
  asset: unknown;
  amount: string;
  /** EVM address or SVM base58 pubkey, per the request's `chainFamily`. */
  recipient: string;
};

export type WalletSigningPayload = {
  requestId: string;
  chainFamily: "evm" | "svm";
  executionKind: "message" | "transaction" | "erc4337";
  signer: string;
  chainId?: number;
  cluster?: string;
  description: string;
  payloads: WalletSignablePayload[];
  broadcaster?: string;
  operationId?: string;
  executor?: `0x${string}`;
  expiresAt?: string;
  callsDigest?: `0x${string}`;
  calls?: WalletAaDisplayCall[];
  fees?: WalletAaFeeDisclosure[];
  sponsorship?: "required";
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
      kind: "signing";
      payload: WalletSigningPayload;
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
      kind: "signing";
      signatures: string[];
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
  wallet_signing_request: WalletRequest;
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

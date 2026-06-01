// =============================================================================
// Session — High-level orchestrated client
// =============================================================================
//
// Wraps AomiClient with polling, event dispatch, and wallet request management.
// Ported from the React runtime (polling-controller, event-context, wallet-handler).
//
// Usage:
//   const session = new Session({ baseUrl: "https://api.aomi.dev" });
//   session.on("wallet_tx_request", async (req) => {
//     const signed = await signer.signTransaction(req.payload);
//     await session.resolve(req.id, { kind: "transaction", txHash: signed.hash });
//   });
//   const result = await session.send("swap 1 ETH for USDC");
//   session.close();

import { AomiClient } from "./client";
import type {
  AomiClientType,
  AomiClientOptions,
  AomiMessage,
  AomiChatResponse,
  AomiSSEEvent,
  AomiStateResponse,
  AomiSystemEvent,
} from "./types";
import {
  UserState,
  type UserState as UserStateShape,
  type UserStateAAMode,
} from "./types";
import { TypedEventEmitter } from "./event";
import { unwrapSystemEvent } from "./event";
import {
  aaModeFromExecutionKind,
  aaRequestedModeFromPreference,
} from "./aa/policy";
import {
  normalizeTxPayload,
  hydrateTxPayloadFromUserState,
  normalizeEip712Payload,
  normalizeSolanaWalletRequest,
  normalizeSolanaSignMessagePayload,
  normalizeSolanaSignPayload,
  type WalletTxPayload,
  type WalletEip712Payload,
  type WalletSolanaSignMessagePayload,
  type WalletSolanaSignPayload,
} from "./wallet-utils";

// =============================================================================
// Types
// =============================================================================

export type WalletRequestKind =
  | "transaction"
  | "eip712_sign"
  | "solana_sign"
  | "solana_sign_message"
  | "solana_send"
  | "solana_sign_and_send";

/**
 * Tagged union of in-flight wallet requests. The `kind` field is the
 * discriminator — narrowing on it auto-narrows `payload` to the matching
 * chain-specific shape, so consumers don't need `as` casts.
 *
 * The id namespace is shared (the backend assigns ids out of one
 * monotonic sequence), but the request shapes diverge per kind. Keeping
 * this as a real discriminated union (rather than a `kind` + flat union
 * `payload`) is the cheapest way to keep type information flowing from
 * the SDK up to consumer apps.
 */
export type WalletRequest =
  | {
      id: string;
      kind: "transaction";
      payload: WalletTxPayload;
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

/**
 * Tagged union of results passed to `Session.resolve(id, result)`. The
 * `kind` field is the discriminator — set it to match the originating
 * request's kind, and the result shape narrows to exactly the artifact
 * the backend expects:
 *   - "transaction"  → `txHash` (+ optional AA metadata)
 *   - "eip712_sign"  → `signature`
 *   - "solana_sign"  → `signedTx` (base64 of the full signed bytes)
 *
 * `Session.resolve` runtime-checks that `result.kind` matches the
 * originating `request.kind`, so a kind mismatch fails fast instead of
 * silently posting an empty artifact to the backend.
 */
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
      smartAccountAddress?: string;
      delegationAddress?: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortJson(entry));
  }
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortJson((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
}

function isSubsetMatch(expected: unknown, actual: unknown): boolean {
  if (isNil(expected) && isNil(actual)) {
    return true;
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || expected.length !== actual.length) {
      return false;
    }
    return expected.every((entry, index) =>
      isSubsetMatch(entry, actual[index]),
    );
  }

  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
      return false;
    }

    return Object.entries(expected as Record<string, unknown>).every(
      ([key, value]) =>
        isSubsetMatch(value, (actual as Record<string, unknown>)[key]),
    );
  }

  return expected === actual;
}

function txIdsFromPayload(payload: WalletTxPayload): number[] {
  if (Array.isArray(payload.txIds) && payload.txIds.length > 0) {
    return [...payload.txIds];
  }
  if (typeof payload.txId === "number") {
    return [payload.txId];
  }
  return [];
}

function inferSolanaRequestKind(
  payload: Record<string, unknown>,
): Extract<
  WalletRequestKind,
  | "solana_sign"
  | "solana_sign_message"
  | "solana_send"
  | "solana_sign_and_send"
> {
  const rawKind =
    typeof payload.kind === "string"
      ? payload.kind
      : typeof payload.request_kind === "string"
        ? payload.request_kind
        : typeof payload.requestKind === "string"
          ? payload.requestKind
          : undefined;

  switch (rawKind) {
    case "solana_sign_message":
    case "message_sign":
      return "solana_sign_message";
    case "solana_send":
    case "send_transaction":
      return "solana_send";
    case "solana_sign_and_send":
    case "sign_and_send_transaction":
      return "solana_sign_and_send";
    default:
      return "solana_sign";
  }
}

export { aaModeFromExecutionKind } from "./aa/policy";

export type SessionOptions = {
  /** Session ID. Auto-generated (crypto.randomUUID) if omitted. */
  sessionId?: string;
  /** App for chat messages. Default: "default" */
  app?: string;
  /** User public key (wallet address). */
  publicKey?: string;
  /** API key override. */
  apiKey?: string;
  /** User state to send with requests (wallet connection info, etc). */
  userState?: UserStateShape;
  /** Optional client type hint forwarded to the backend via userState.ext.client_type. */
  clientType?: AomiClientType;
  /** Stable client ID used for secret-vault association. */
  clientId?: string;
  /**
   * When true (default), synthesize pending transaction wallet requests from
   * `user_state.pending.evm_txs` during state sync. Web UI should disable this and
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
  publicKey?: string;
  apiKey?: string;
  clientId?: string;
  userState?: UserStateShape;
};

/** Events emitted by Session. */
export type SessionEventMap = {
  /** A transaction signing request arrived from the backend. */
  wallet_tx_request: WalletRequest;
  /** An EIP-712 signing request arrived from the backend. */
  wallet_eip712_request: WalletRequest;
  /**
   * A Solana signing request arrived from the backend. Singular by design:
   * one request per call (no batching). The wallet adapter signs and
   * returns a base64-encoded full signed transaction via
   * `Session.resolve(id, { signedTx })`.
   */
  wallet_solana_sign_request: WalletRequest;
  wallet_solana_sign_message_request: WalletRequest;
  wallet_solana_send_request: WalletRequest;
  wallet_solana_sign_and_send_request: WalletRequest;
  /** A system notice from the backend. */
  system_notice: { message: string };
  /** A system error from the backend. */
  system_error: { message: string };
  /** An async callback event. */
  async_callback: Record<string, unknown>;
  /** SSE: tool execution in progress. */
  tool_update: AomiSSEEvent;
  /** SSE: tool execution completed. */
  tool_complete: AomiSSEEvent;
  /** Session title changed. */
  title_changed: { title: string };
  /** Messages updated (new messages from poll or send response). */
  messages: AomiMessage[];
  /** AI started processing. */
  processing_start: undefined;
  /** AI finished processing. */
  processing_end: undefined;
  /** Authoritative pending wallet request list changed. */
  wallet_requests_changed: WalletRequest[];
  /**
   * Backend transitioned from processing to idle (is_processing went false).
   * Unlike `processing_end`, this fires even when there are unresolved local
   * wallet requests.  CLI consumers use it to know that all system events
   * (including wallet requests) have been delivered for the current turn.
   */
  backend_idle: undefined;
  /** An error occurred during polling or SSE. */
  error: { error: unknown };
  /** Wildcard: receives all events as { type, payload }. */
  "*": { type: string; payload: unknown };
};

// =============================================================================
// Session Class
// =============================================================================

export class ClientSession extends TypedEventEmitter<SessionEventMap> {
  /** The underlying low-level client. */
  readonly client: AomiClient;
  /** The session (thread) ID. */
  readonly sessionId: string;

  private app: string;
  private publicKey?: string;
  private apiKey?: string;
  private userState?: UserStateShape;
  private clientId: string;
  private syncPendingTxRequestsFromUserState: boolean;
  private pollIntervalMs: number;
  private logger?: { debug: (...args: unknown[]) => void };

  // Internal state
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeSSE: (() => void) | null = null;
  private sseActive = false;
  private _isProcessing = false;
  private _backendWasProcessing = false;
  private walletRequests: WalletRequest[] = [];
  private walletRequestNextId = 1;
  /**
   * Permanent per-session tombstone set of request ids the user has already
   * resolved/rejected locally. After a sign/submit, the backend may keep
   * echoing the originating request for a few polls — either as a `pending.*`
   * bucket entry or as a re-delivered `system_events` InlineCall — until it
   * processes the completion. Every re-add path (`syncWalletRequests`, the
   * preservation block, and `enqueueWalletRequest`) consults this set and skips
   * tombstoned ids. Without it the request keeps `walletRequests` non-empty and
   * the poll loop never terminates (`!is_processing && walletRequests.length
   * === 0` can never hold). Never GC'd: backend pending ids are monotonic per
   * session, so a resolved id can never legitimately reappear.
   */
  private resolvedWalletRequestIds = new Set<string>();
  private _messages: AomiMessage[] = [];
  private _title?: string;
  private closed = false;

  // For send() blocking behavior
  private pendingResolve: ((result: SendResult) => void) | null = null;

  constructor(
    clientOrOptions: AomiClient | AomiClientOptions,
    sessionOptions?: SessionOptions,
  ) {
    super();

    this.client =
      clientOrOptions instanceof AomiClient
        ? clientOrOptions
        : new AomiClient(clientOrOptions);

    this.sessionId = sessionOptions?.sessionId ?? crypto.randomUUID();
    this.app = sessionOptions?.app ?? "default";
    this.publicKey = sessionOptions?.publicKey;
    this.apiKey = sessionOptions?.apiKey;
    const initialUserState = UserState.reconcile(undefined, sessionOptions?.userState);
    this.userState = sessionOptions?.clientType
      ? UserState.withExt(initialUserState ?? {}, "client_type", sessionOptions.clientType)
      : initialUserState;
    this.clientId = sessionOptions?.clientId ?? crypto.randomUUID();
    this.syncPendingTxRequestsFromUserState =
      sessionOptions?.syncPendingTxRequestsFromUserState ?? true;
    this.pollIntervalMs = sessionOptions?.pollIntervalMs ?? 500;
    this.logger = sessionOptions?.logger;

  }

  // ===========================================================================
  // Public API — Chat
  // ===========================================================================

  /**
   * Send a message and wait for the AI to finish processing.
   *
   * The returned promise resolves when `is_processing` becomes `false` AND
   * there are no pending wallet requests. If a wallet request arrives
   * mid-processing, polling continues but the promise pauses until the
   * request is resolved or rejected via `resolve()` / `reject()`.
   */
  async send(message: string): Promise<SendResult> {
    this.assertOpen();
    this.logger?.debug("[session] send start", {
      sessionId: this.sessionId,
      app: this.app,
      message,
    });

    let response: AomiChatResponse;
    try {
      response = await this.client.sendMessage(this.sessionId, message, {
        app: this.app,
        publicKey: this.publicKey,
        apiKey: this.apiKey,
        userState: this.userState,
        clientId: this.clientId,
      });
    } catch (error) {
      this.logger?.debug("[session] send failed", {
        sessionId: this.sessionId,
        error,
      });
      throw error;
    }

    this.logger?.debug("[session] send response", {
      sessionId: this.sessionId,
      isProcessing: response.is_processing,
      systemEventCount: response.system_events?.length ?? 0,
      messageCount: response.messages?.length ?? 0,
    });

    this.assertUserStateAligned(response.user_state);
    this.applyState(response);

    if (!response.is_processing && this.walletRequests.length === 0) {
      return { messages: this._messages, title: this._title };
    }

    this._isProcessing = true;
    this.emit("processing_start", undefined);

    return new Promise<SendResult>((resolve) => {
      this.pendingResolve = resolve;
      this.startPolling();
    });
  }

  /**
   * Send a message without waiting for completion.
   * Polling starts in the background; listen to events for updates.
   */
  async sendAsync(message: string): Promise<AomiChatResponse> {
    this.assertOpen();
    this.logger?.debug("[session] sendAsync start", {
      sessionId: this.sessionId,
      app: this.app,
      message,
    });

    let response: AomiChatResponse;
    try {
      response = await this.client.sendMessage(this.sessionId, message, {
        app: this.app,
        publicKey: this.publicKey,
        apiKey: this.apiKey,
        userState: this.userState,
        clientId: this.clientId,
      });
    } catch (error) {
      this.logger?.debug("[session] sendAsync failed", {
        sessionId: this.sessionId,
        error,
      });
      throw error;
    }

    this.logger?.debug("[session] sendAsync response", {
      sessionId: this.sessionId,
      isProcessing: response.is_processing,
      systemEventCount: response.system_events?.length ?? 0,
      messageCount: response.messages?.length ?? 0,
    });

    this.assertUserStateAligned(response.user_state);
    this.applyState(response);

    if (response.is_processing) {
      this._isProcessing = true;
      this.emit("processing_start", undefined);
      this.startPolling();
    }

    return response;
  }

  // ===========================================================================
  // Public API — Wallet Request Resolution
  // ===========================================================================

  /**
   * Resolve a pending wallet request (transaction, EIP-712, or Solana
   * sign). The `result.kind` discriminator must match the originating
   * request's kind — sending a `transaction` result for an `eip712_sign`
   * request would post the wrong wire event with empty fields, so we
   * fail fast at runtime instead.
   */
  async resolve(requestId: string, result: WalletRequestResult): Promise<void> {
    const req = this.walletRequests.find((request) => request.id === requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    if (result.kind !== req.kind) {
      throw new Error(
        `WalletRequestResult.kind mismatch for "${requestId}": request is "${req.kind}" but result is "${result.kind}".`,
      );
    }
    this.resolvedWalletRequestIds.add(requestId);
    this.removeWalletRequest(requestId);

    if (req.kind === "transaction" && result.kind === "transaction") {
      const pendingTxIds = txIdsFromPayload(req.payload);
      const requestedMode =
        result.aaRequestedMode ??
        aaRequestedModeFromPreference(req.payload.aaPreference);
      const resolvedMode =
        result.aaResolvedMode ??
        aaModeFromExecutionKind(result.executionKind) ??
        requestedMode;
      this.resolveUserState({
        ...(this.userState ?? {}),
        evm: {
          ...(this.userState?.evm ?? {}),
          aa: {
            ...(this.userState?.evm?.aa ?? {}),
            mode: resolvedMode === "none" ? null : resolvedMode,
            smart_account:
              resolvedMode === "4337" ? result.smartAccountAddress ?? null : null,
          },
        },
      });
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: result.txHash,
        status: "success",
        amount: result.amount,
        pending_tx_ids: pendingTxIds,
        aa_requested_mode: requestedMode,
        aa_resolved_mode: resolvedMode,
        aa_fallback_reason: result.aaFallbackReason,
        execution_kind: result.executionKind,
        batched: result.batched ?? pendingTxIds.length > 1,
        call_count: result.callCount ?? pendingTxIds.length,
        sponsored: result.sponsored,
        smart_account_address: result.smartAccountAddress,
        delegation_address: result.delegationAddress,
      });
    } else if (req.kind === "eip712_sign" && result.kind === "eip712_sign") {
      await this.sendSystemEvent("wallet_eip712_response", {
        status: "success",
        signature: result.signature,
        description: req.payload.description,
        ...(req.payload.eip712Id !== undefined
          ? { pending_eip712_id: req.payload.eip712Id }
          : {}),
      });
    } else if (req.kind === "solana_sign" && result.kind === "solana_sign") {
      await this.sendSystemEvent("wallet::solana_sign_complete", {
        status: "signed",
        signed_tx: result.signedTx,
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (
      req.kind === "solana_sign_message" &&
      result.kind === "solana_sign_message"
    ) {
      await this.sendSystemEvent("wallet::solana_sign_message_complete", {
        status: "signed",
        signature: result.signature,
        ...(req.payload.message !== undefined
          ? { message: req.payload.message }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (req.kind === "solana_send" && result.kind === "solana_send") {
      await this.sendSystemEvent("wallet::solana_send_complete", {
        status: "submitted",
        signature: result.signature,
        signed_tx: result.signedTx,
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (
      req.kind === "solana_sign_and_send" &&
      result.kind === "solana_sign_and_send"
    ) {
      await this.sendSystemEvent("wallet::solana_sign_and_send_complete", {
        status: "submitted",
        signature: result.signature,
        signed_tx: result.signedTx,
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    }

    // Resume polling if still processing
    if (this._isProcessing) {
      this.startPolling();
    }
  }

  /**
   * Reject a pending wallet request.
   * Sends an error to the backend and resumes polling.
   */
  async reject(requestId: string, reason?: string): Promise<void> {
    const req = this.removeWalletRequest(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }
    this.resolvedWalletRequestIds.add(requestId);

    if (req.kind === "transaction") {
      const pendingTxIds = txIdsFromPayload(req.payload);
      const requestedMode = aaRequestedModeFromPreference(req.payload.aaPreference);
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: "",
        status: "failed",
        error: reason ?? "Request rejected",
        pending_tx_ids: pendingTxIds,
        aa_requested_mode: requestedMode,
        aa_resolved_mode: requestedMode,
        aa_fallback_reason: undefined,
        execution_kind: undefined,
        batched: pendingTxIds.length > 1,
        call_count: pendingTxIds.length,
        sponsored: undefined,
        smart_account_address: undefined,
        delegation_address: undefined,
      });
    } else if (req.kind === "eip712_sign") {
      await this.sendSystemEvent("wallet_eip712_response", {
        status: "failed",
        error: reason ?? "Request rejected",
        description: req.payload.description,
        ...(req.payload.eip712Id !== undefined
          ? { pending_eip712_id: req.payload.eip712Id }
          : {}),
      });
    } else if (req.kind === "solana_sign") {
      await this.sendSystemEvent("wallet::solana_sign_complete", {
        status: "rejected",
        error: reason ?? "Request rejected",
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (req.kind === "solana_sign_message") {
      await this.sendSystemEvent("wallet::solana_sign_message_complete", {
        status: "rejected",
        error: reason ?? "Request rejected",
        ...(req.payload.message !== undefined
          ? { message: req.payload.message }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else if (req.kind === "solana_send") {
      await this.sendSystemEvent("wallet::solana_send_complete", {
        status: "rejected",
        error: reason ?? "Request rejected",
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    } else {
      await this.sendSystemEvent("wallet::solana_sign_and_send_complete", {
        status: "rejected",
        error: reason ?? "Request rejected",
        ...(req.payload.unsignedTx !== undefined
          ? { unsigned_tx: req.payload.unsignedTx }
          : {}),
        description: req.payload.description,
        ...(req.payload.pendingSolanaId !== undefined
          ? { pending_solana_id: req.payload.pendingSolanaId }
          : {}),
      });
    }

    if (this._isProcessing) {
      this.startPolling();
    }
  }

  // ===========================================================================
  // Public API — Control
  // ===========================================================================

  /**
   * Cancel the AI's current response.
   */
  async interrupt(): Promise<void> {
    this.stopPolling();
    const response = await this.client.interrupt(this.sessionId);
    this.applyState(response);
    this._isProcessing = false;
    this.emit("processing_end", undefined);
    this.resolvePending();
  }

  /**
   * Close the session. Stops polling, unsubscribes SSE, removes all listeners.
   * The session cannot be used after closing.
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.stopPolling();
    this.stopSSESubscription("close");
    this.resolvePending();
    this.removeAllListeners();
  }

  // ===========================================================================
  // Public API — Accessors
  // ===========================================================================

  /** Current messages in the session. */
  getMessages(): AomiMessage[] {
    return this._messages;
  }

  /** Current session title. */
  getTitle(): string | undefined {
    return this._title;
  }

  /** Latest authoritative backend user_state snapshot seen by this session. */
  getUserState(): UserStateShape | undefined {
    return this.userState ? { ...this.userState } : undefined;
  }

  /** Pending wallet requests waiting for resolve/reject. */
  getPendingRequests(): WalletRequest[] {
    return [...this.walletRequests];
  }

  /** Whether the AI is currently processing. */
  getIsProcessing(): boolean {
    return this._isProcessing;
  }

  getIsSSEActive(): boolean {
    return this.sseActive;
  }

  setSSEActive(active: boolean): void {
    if (this.closed || this.sseActive === active) {
      return;
    }

    this.sseActive = active;
    if (active) {
      this.unsubscribeSSE = this.client.subscribeSSE(
        this.sessionId,
        (event) => this.handleSSEEvent(event),
        (error) => this.emit("error", { error }),
      );
      return;
    }

    this.stopSSESubscription("deactivate");
  }

  syncRuntimeOptions(options: SessionRuntimeOptions): void {
    this.app = options.app;
    this.publicKey = options.publicKey;
    this.apiKey = options.apiKey;
    this.clientId = options.clientId ?? this.clientId;

    if (options.userState) {
      this.resolveUserState(options.userState);
    }
  }

  private commitUserState(userState: UserStateShape | undefined): void {
    this.userState = userState;

    const address =
      UserState.address(this.userState) ??
      UserState.solanaAddress(this.userState);
    const isConnected = UserState.isConnected(this.userState);
    if (
      address &&
      isConnected !== false
    ) {
      this.publicKey = address;
    } else {
      this.publicKey = undefined;
    }

    this.syncWalletRequests();
  }

  resolveUserState(userState: UserStateShape): void {
    this.commitUserState(UserState.reconcile(this.userState, userState));
  }

  setClientType(clientType: AomiClientType): void {
    this.resolveUserState(UserState.withExt(this.userState ?? {}, "client_type", clientType));
  }

  addExtValue(key: string, value: unknown): void {
    const current = this.userState ?? {};
    const currentExt = isRecord(current["ext"]) ? current["ext"] : {};
    this.resolveUserState({
      ...current,
      ext: {
        ...currentExt,
        [key]: value,
      },
    });
  }

  removeExtValue(key: string): void {
    if (!this.userState) return;
    const currentExt = this.userState["ext"];
    if (!isRecord(currentExt)) return;

    const nextExt = { ...currentExt };
    delete nextExt[key];

    const nextState = { ...this.userState };
    if (Object.keys(nextExt).length === 0) {
      delete nextState["ext"];
    } else {
      nextState["ext"] = nextExt;
    }
    this.commitUserState(UserState.normalize(nextState));
  }

  resolveWallet(
    address: string,
    chainId?: number,
    aa?: {
      aaMode?: UserStateAAMode | null;
      smartAccount?: string | null;
    },
  ): void {
    this.resolveUserState({
      connection: {
        is_connected: true,
        primary_family: "evm",
      },
      evm: {
        address,
        chain_id: chainId ?? 1,
        aa: {
          mode: aa?.aaMode ?? null,
          smart_account: aa?.smartAccount ?? null,
        },
      },
    });
  }

  async syncUserState(): Promise<AomiStateResponse> {
    this.assertOpen();

    const state = await this.client.fetchState(this.sessionId, this.userState, this.clientId);
    this.assertUserStateAligned(state.user_state);
    this.applyState(state);
    return state;
  }

  // ===========================================================================
  // Public API — Polling Control
  // ===========================================================================

  /** Whether the session is currently polling for state updates. */
  getIsPolling(): boolean {
    return this.pollTimer !== null;
  }

  /**
   * Fetch the current state from the backend (one-shot).
   * Automatically starts polling if the backend is processing.
   */
  async fetchCurrentState(): Promise<void> {
    this.assertOpen();

    const state = await this.client.fetchState(
      this.sessionId,
      this.userState,
      this.clientId,
    );

    this.assertUserStateAligned(state.user_state);
    this.applyState(state);

    if (state.is_processing && !this.pollTimer) {
      this._isProcessing = true;
      this.emit("processing_start", undefined);
      this.startPolling();
    } else if (!state.is_processing) {
      this._isProcessing = false;
    }
  }

  /**
   * Start polling for state updates. Idempotent — no-op if already polling.
   * Useful for resuming polling after resolving a wallet request.
   */
  startPolling(): void {
    if (this.pollTimer || this.closed) return;

    this._backendWasProcessing = true;
    this.logger?.debug("[session] polling started", this.sessionId);
    this.pollTimer = setInterval(() => {
      void this.pollTick();
    }, this.pollIntervalMs);
  }

  /** Stop polling for state updates. Idempotent — no-op if not polling. */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
      this.logger?.debug("[session] polling stopped", this.sessionId);
    }
  }

  private async pollTick(): Promise<void> {
    if (!this.pollTimer) return;

    try {
      const state = await this.client.fetchState(
        this.sessionId,
        this.userState,
        this.clientId,
      );

      // Guard: polling may have been stopped while awaiting fetch
      if (!this.pollTimer) return;

      this.assertUserStateAligned(state.user_state);
      this.applyState(state);

      // Detect backend processing → idle transition.
      // Fires even when local wallet requests are pending, so CLI consumers
      // know all system events for this turn have been delivered.
      if (this._backendWasProcessing && !state.is_processing) {
        this.emit("backend_idle", undefined);
      }
      this._backendWasProcessing = !!state.is_processing;

      if (!state.is_processing && this.walletRequests.length === 0) {
        this.stopPolling();
        this._isProcessing = false;
        this.emit("processing_end", undefined);
        this.resolvePending();
      }
    } catch (error) {
      this.logger?.debug("[session] poll error", error);
      this.emit("error", { error });
    }
  }

  // ===========================================================================
  // Internal — State Application
  // ===========================================================================

  private applyState(
    state: Pick<
      AomiStateResponse,
      "messages" | "system_events" | "title" | "is_processing" | "user_state"
    >,
  ): void {
    if (state.user_state) {
      this.resolveUserState(state.user_state);
    }

    if (state.messages) {
      this._messages = state.messages;
      this.emit("messages", this._messages);
    }

    if (state.title) {
      this._title = state.title;
    }

    if (state.system_events?.length) {
      this.dispatchSystemEvents(state.system_events);
    }
  }

  private dispatchSystemEvents(events: AomiSystemEvent[]): void {
    for (const event of events) {
      const unwrapped = unwrapSystemEvent(event);
      if (!unwrapped) continue;

      if (unwrapped.type === "wallet_tx_request") {
        const solanaRequest = normalizeSolanaWalletRequest(
          unwrapped.payload ?? {},
        );
        if (solanaRequest) {
          this.logger?.debug("[session] wallet_tx_request solana raw payload", unwrapped.payload);
          if (solanaRequest.kind === "solana_send") {
            const req = this.enqueueWalletRequest(
              "solana_send",
              solanaRequest.payload,
            );
            this.emit("wallet_solana_send_request", req);
          } else if (solanaRequest.kind === "solana_sign_and_send") {
            const req = this.enqueueWalletRequest(
              "solana_sign_and_send",
              solanaRequest.payload,
            );
            this.emit("wallet_solana_sign_and_send_request", req);
          } else if (solanaRequest.kind === "solana_sign_message") {
            const req = this.enqueueWalletRequest(
              "solana_sign_message",
              solanaRequest.payload,
            );
            this.emit("wallet_solana_sign_message_request", req);
          } else {
            const req = this.enqueueWalletRequest(
              "solana_sign",
              solanaRequest.payload,
            );
            this.emit("wallet_solana_sign_request", req);
          }
          continue;
        }

        const normalizedPayload = normalizeTxPayload(unwrapped.payload);
        const payload = normalizedPayload
          ? hydrateTxPayloadFromUserState(normalizedPayload, this.userState)
          : null;
        if (payload) {
          const req = this.enqueueWalletRequest("transaction", payload);
          this.emit("wallet_tx_request", req);
        }
      } else if (unwrapped.type === "wallet_eip712_request") {
        const payload = normalizeEip712Payload(unwrapped.payload ?? {});
        const req = this.enqueueWalletRequest("eip712_sign", payload);
        this.emit("wallet_eip712_request", req);
      } else if (unwrapped.type === "wallet::solana_sign_request") {
        this.logger?.debug("[session] solana_sign_request raw payload", unwrapped.payload);
        const solanaRequest = normalizeSolanaWalletRequest(unwrapped.payload ?? {});
        if (solanaRequest) {
          if (solanaRequest.kind === "solana_sign_message") {
            const req = this.enqueueWalletRequest(
              "solana_sign_message",
              solanaRequest.payload,
            );
            this.emit("wallet_solana_sign_message_request", req);
          } else if (solanaRequest.kind === "solana_send") {
            const req = this.enqueueWalletRequest(
              "solana_send",
              solanaRequest.payload,
            );
            this.emit("wallet_solana_send_request", req);
          } else if (solanaRequest.kind === "solana_sign_and_send") {
            const req = this.enqueueWalletRequest(
              "solana_sign_and_send",
              solanaRequest.payload,
            );
            this.emit("wallet_solana_sign_and_send_request", req);
          } else {
            const req = this.enqueueWalletRequest(
              "solana_sign",
              solanaRequest.payload,
            );
            this.emit("wallet_solana_sign_request", req);
          }
          continue;
        }

        const payload = normalizeSolanaSignPayload(unwrapped.payload ?? {});
        const req = this.enqueueWalletRequest("solana_sign", payload);
        this.emit("wallet_solana_sign_request", req);
      } else if (unwrapped.type === "wallet::solana_sign_message_request") {
        const payload = normalizeSolanaSignMessagePayload(
          unwrapped.payload ?? {},
        );
        const req = this.enqueueWalletRequest("solana_sign_message", payload);
        this.emit("wallet_solana_sign_message_request", req);
      } else if (unwrapped.type === "wallet::solana_send_request") {
        const payload = normalizeSolanaSignPayload(unwrapped.payload ?? {});
        const req = this.enqueueWalletRequest("solana_send", payload);
        this.emit("wallet_solana_send_request", req);
      } else if (unwrapped.type === "wallet::solana_sign_and_send_request") {
        const payload = normalizeSolanaSignPayload(unwrapped.payload ?? {});
        const req = this.enqueueWalletRequest("solana_sign_and_send", payload);
        this.emit("wallet_solana_sign_and_send_request", req);
      } else if (
        unwrapped.type === "system_notice" ||
        unwrapped.type === "system_error" ||
        unwrapped.type === "async_callback"
      ) {
        // These match known event map keys — emit directly
        this.emit(
          unwrapped.type as keyof SessionEventMap,
          unwrapped.payload as never,
        );
      } else {
        this.emit(
          unwrapped.type as keyof SessionEventMap,
          unwrapped.payload as never,
        );
      }
    }
  }

  // ===========================================================================
  // Internal — SSE Handling
  // ===========================================================================

  private handleSSEEvent(event: AomiSSEEvent): void {
    if (event.type === "title_changed" && event.new_title) {
      this._title = event.new_title;
      this.emit("title_changed", { title: event.new_title });
    } else if (event.type === "tool_update") {
      this.emit("tool_update", event);
    } else if (event.type === "tool_complete") {
      this.emit("tool_complete", event);
    }
  }

  private stopSSESubscription(reason: string): void {
    this.unsubscribeSSE?.();
    this.unsubscribeSSE = null;
    this.logger?.debug("[session] sse stopped", {
      sessionId: this.sessionId,
      reason,
    });
  }

  // ===========================================================================
  // Internal — Wallet Request Queue
  // ===========================================================================

  private enqueueWalletRequest(
    kind: "transaction",
    payload: WalletTxPayload,
  ): WalletRequest;
  private enqueueWalletRequest(
    kind: "eip712_sign",
    payload: WalletEip712Payload,
  ): WalletRequest;
  private enqueueWalletRequest(
    kind: "solana_sign",
    payload: WalletSolanaSignPayload,
  ): WalletRequest;
  private enqueueWalletRequest(
    kind: "solana_sign_message",
    payload: WalletSolanaSignMessagePayload,
  ): WalletRequest;
  private enqueueWalletRequest(
    kind: "solana_send" | "solana_sign_and_send",
    payload: WalletSolanaSignPayload,
  ): WalletRequest;
  private enqueueWalletRequest(
    kind: WalletRequestKind,
    payload:
      | WalletTxPayload
      | WalletEip712Payload
      | WalletSolanaSignPayload
      | WalletSolanaSignMessagePayload,
  ): WalletRequest {
    const id = this.getWalletRequestId(kind, payload);
    const existing = this.walletRequests.find((request) => request.id === id);
    const timestamp = existing?.timestamp ?? Date.now();
    // Build the discriminated record by kind. The overload signatures
    // above guarantee the call sites pass the right payload shape; here
    // we just need to assemble the union member.
    let req: WalletRequest;
    if (kind === "transaction") {
      req = {
        id,
        kind,
        payload: payload as WalletTxPayload,
        timestamp,
      };
    } else if (kind === "eip712_sign") {
      req = {
        id,
        kind,
        payload: payload as WalletEip712Payload,
        timestamp,
      };
    } else if (kind === "solana_sign") {
      req = {
        id,
        kind,
        payload: payload as WalletSolanaSignPayload,
        timestamp,
      };
    } else if (kind === "solana_sign_message") {
      req = {
        id,
        kind,
        payload: payload as WalletSolanaSignMessagePayload,
        timestamp,
      };
    } else {
      req = {
        id,
        kind,
        payload: payload as WalletSolanaSignPayload,
        timestamp,
      };
    }

    // If the user already resolved/rejected this id, the backend may still be
    // re-delivering the originating system event (InlineCall) on subsequent
    // polls until it processes the completion. Don't resurrect it onto the
    // queue — return the assembled record so callers stay happy, but leave
    // `walletRequests` untouched and skip the change emit. Without this, a
    // re-delivered sign request keeps `walletRequests` non-empty and polling
    // never terminates even after `is_processing` flips false.
    if (this.resolvedWalletRequestIds.has(id) && !existing) {
      return req;
    }

    this.walletRequests = existing
      ? this.walletRequests.map((request) => (request.id === id ? req : request))
      : [...this.walletRequests, req];

    if (req.kind === "transaction") {
      const nextTxIds = txIdsFromPayload(req.payload);
      if (nextTxIds.length > 0) {
        const nextTxIdSet = new Set(nextTxIds);
        this.walletRequests = this.walletRequests.filter((request) => {
          if (request.id === id || request.kind !== "transaction") {
            return true;
          }
          const requestTxIds = txIdsFromPayload(request.payload);
          if (requestTxIds.length === 0) {
            return true;
          }
          return !requestTxIds.every((txId) => nextTxIdSet.has(txId));
        });
      }
    }

    this.emit("wallet_requests_changed", this.getPendingRequests());
    return req;
  }

  private removeWalletRequest(id: string): WalletRequest | null {
    const idx = this.walletRequests.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    const [request] = this.walletRequests.splice(idx, 1);
    this.emit("wallet_requests_changed", this.getPendingRequests());
    return request;
  }

  // ===========================================================================
  // Internal — Helpers
  // ===========================================================================

  private async sendSystemEvent(
    type: string,
    payload: unknown,
  ): Promise<void> {
    const message = JSON.stringify({ type, payload });
    // Forward the session's active app so the backend dispatches the
    // callback into the right plugin (e.g. byreal's submit_swap
    // continuation). Without this the backend resets to "default" and
    // app-specific continuations (like byreal's broadcast step) never
    // fire — the tx gets signed but never reaches RPC.
    await this.client.sendSystemMessage(this.sessionId, message, {
      app: this.app,
    });
  }

  private resolvePending(): void {
    if (this.pendingResolve) {
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      resolve({ messages: this._messages, title: this._title });
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new Error("Session is closed");
    }
  }

  private assertUserStateAligned(actualUserState?: UserStateShape | null): void {
    const expectedUserState = UserState.normalize(this.userState);
    const normalizedActualUserState = UserState.reconcile(
      expectedUserState,
      actualUserState,
    );

    if (!expectedUserState || !normalizedActualUserState) {
      return;
    }

    if (!isSubsetMatch(expectedUserState, normalizedActualUserState)) {
      const expected = JSON.stringify(sortJson(expectedUserState));
      const actual = JSON.stringify(sortJson(normalizedActualUserState));
      console.warn(
        `[session] Backend user_state mismatch (non-fatal). expected subset=${expected} actual=${actual}`,
      );
    }
  }

  private getWalletRequestId(
    kind: WalletRequestKind,
    payload:
      | WalletTxPayload
      | WalletEip712Payload
      | WalletSolanaSignPayload
      | WalletSolanaSignMessagePayload,
  ): string {
    if (kind === "transaction") {
      const txPayload = payload as WalletTxPayload;
      if (typeof txPayload.requestId === "string" && txPayload.requestId.length > 0) {
        return `txreq-${txPayload.requestId}`;
      }
      const txIds = txIdsFromPayload(txPayload);
      if (txIds.length > 0) {
        return `tx-${txIds.join("-")}`;
      }
    } else if (kind === "eip712_sign") {
      const { eip712Id } = payload as WalletEip712Payload;
      if (typeof eip712Id === "number") {
        return `eip712-${eip712Id}`;
      }
    } else {
      const { pendingSolanaId } = payload as WalletSolanaSignPayload;
      if (typeof pendingSolanaId === "number") {
        return `${kind}-${pendingSolanaId}`;
      }
    }

    return `wreq-${this.walletRequestNextId++}`;
  }

  private syncWalletRequests(): void {
    const nextRequests: WalletRequest[] = [];
    const pendingTxs = isRecord(this.userState?.pending?.evm_txs)
      ? this.userState?.pending?.evm_txs
      : undefined;
    const pendingEip712s = isRecord(this.userState?.pending?.evm_sigs)
      ? this.userState?.pending?.evm_sigs
      : undefined;
    const pendingSolanaTxs = isRecord(this.userState?.pending?.solana_txs)
      ? this.userState?.pending?.solana_txs
      : isRecord((this.userState?.pending as Record<string, unknown> | undefined)?.svm_ixs)
        ? (this.userState?.pending as Record<string, unknown>).svm_ixs
        : undefined;
    const pendingSolanaSigs = isRecord(this.userState?.pending?.solana_sigs)
      ? this.userState?.pending?.solana_sigs
      : isRecord((this.userState?.pending as Record<string, unknown> | undefined)?.svm_sigs)
        ? (this.userState?.pending as Record<string, unknown>).svm_sigs
        : undefined;
    if (pendingSolanaSigs && Object.keys(pendingSolanaSigs).length > 0) {
      this.logger?.debug?.("[session] syncWalletRequests pendingSolanaSigs", {
        sessionId: this.sessionId,
        pendingIds: Object.keys(pendingSolanaSigs),
        pendingCount: Object.keys(pendingSolanaSigs).length,
        pendingKeys: Object.keys(this.userState?.pending ?? {}),
      });
    }

    const pendingTxEntries = Object.entries(pendingTxs ?? {})
      .filter(([id]) => Number.isInteger(Number(id)))
      .sort((left, right) => Number(left[0]) - Number(right[0]));
    const pendingTxIdSet = new Set(pendingTxEntries.map(([id]) => Number(id)));
    const coveredPendingTxIds = new Set<number>();

    const existingTxRequests = this.walletRequests
      .filter(
        (request): request is Extract<WalletRequest, { kind: "transaction" }> =>
          request.kind === "transaction",
      )
      .map((request) => ({
        request,
        txIds: txIdsFromPayload(request.payload),
      }))
      .filter(
        ({ txIds }) =>
          txIds.length > 0 && txIds.every((txId) => pendingTxIdSet.has(txId)),
      )
      .sort((left, right) => {
        if (left.txIds.length !== right.txIds.length) {
          return right.txIds.length - left.txIds.length;
        }
        return left.request.timestamp - right.request.timestamp;
      });

    for (const { request, txIds } of existingTxRequests) {
      if (txIds.some((txId) => coveredPendingTxIds.has(txId))) {
        continue;
      }
      const payload = hydrateTxPayloadFromUserState(
        request.payload,
        { pending: { evm_txs: pendingTxs ?? {} } },
      );
      const requestId = this.getWalletRequestId("transaction", payload);
      nextRequests.push({
        id: requestId,
        kind: "transaction",
        payload,
        timestamp: request.timestamp,
      });
      txIds.forEach((txId) => coveredPendingTxIds.add(txId));
    }

    if (this.syncPendingTxRequestsFromUserState) {
      for (const [id, raw] of pendingTxEntries) {
        const txId = Number(id);
        if (coveredPendingTxIds.has(txId)) {
          continue;
        }
        const payload = hydrateTxPayloadFromUserState(
          {
            txId,
            txIds: [txId],
            aaPreference: "auto",
          },
          {
            pending: {
              evm_txs: {
                [id]: isRecord(raw) ? raw : {},
              },
            },
          },
        );

        const requestId = this.getWalletRequestId("transaction", payload);
        nextRequests.push({
          id: requestId,
          kind: "transaction",
          payload,
          timestamp:
            this.walletRequests.find((request) => request.id === requestId)?.timestamp ??
            Date.now(),
        });
      }
    }

    for (const [id, raw] of Object.entries(pendingEip712s ?? {}).sort(
      (left, right) => Number(left[0]) - Number(right[0]),
    )) {
      const payload = normalizeEip712Payload({
        ...(isRecord(raw) ? raw : {}),
        pending_eip712_id: Number(id),
      });
      const requestId = this.getWalletRequestId("eip712_sign", payload);
      nextRequests.push({
        id: requestId,
        kind: "eip712_sign",
        payload,
        timestamp:
          this.walletRequests.find((request) => request.id === requestId)?.timestamp ??
          Date.now(),
      });
    }

    for (const [id, raw] of Object.entries(pendingSolanaTxs ?? {}).sort(
      (left, right) => Number(left[0]) - Number(right[0]),
    )) {
      const entry = isRecord(raw) ? raw : {};
      const normalized = normalizeSolanaWalletRequest({
        ...entry,
        chain_kind: "svm",
        pending_solana_id: Number(id),
      });
      if (!normalized) {
        continue;
      }
      const requestId = this.getWalletRequestId(
        normalized.kind,
        normalized.payload,
      );
      if (this.resolvedWalletRequestIds.has(requestId)) {
        // User already signed/rejected; backend just hasn't processed the
        // completion event yet. Don't resurrect the request.
        continue;
      }
      nextRequests.push({
        id: requestId,
        kind: normalized.kind,
        payload: normalized.payload,
        timestamp:
          this.walletRequests.find((request) => request.id === requestId)?.timestamp ??
          Date.now(),
      });
    }

    for (const [id, raw] of Object.entries(pendingSolanaSigs ?? {}).sort(
      (left, right) => Number(left[0]) - Number(right[0]),
    )) {
      const entry = isRecord(raw) ? raw : {};
      const normalized = normalizeSolanaWalletRequest({
        ...entry,
        chain_kind: "svm",
        pending_solana_id: Number(id),
      });
      if (!normalized) {
        continue;
      }
      const requestId = this.getWalletRequestId(
        normalized.kind,
        normalized.payload,
      );
      if (this.resolvedWalletRequestIds.has(requestId)) {
        continue;
      }
      nextRequests.push({
        id: requestId,
        kind: normalized.kind,
        payload: normalized.payload,
        timestamp:
          this.walletRequests.find((request) => request.id === requestId)?.timestamp ??
          Date.now(),
      });
      this.logger?.debug?.("[session] syncWalletRequests queued solana sig", {
        sessionId: this.sessionId,
        requestId,
        solanaKind: normalized.kind,
        pendingId: Number(id),
        hasMessage:
          normalized.kind === "solana_sign_message"
            ? Boolean(
                (
                  normalized.payload as WalletSolanaSignMessagePayload | null
                )?.message,
              )
            : false,
      });
    }

    // Preserve SSE-sourced Solana requests that are already in the queue but
    // aren't reflected in the current user_state pending fields.  The backend
    // often fires the SSE event before the next polled state snapshot includes
    // the request; without this, syncWalletRequests evicts the request while
    // processRequest is still awaiting the wallet signature.
    //
    // Skip ids the user already resolved — those are pre-completion zombies the
    // poll is still echoing, and preserving them would leave `walletRequests`
    // non-empty forever and never let polling stop.
    const nextIdSet = new Set(nextRequests.map((r) => r.id));
    for (const existing of this.walletRequests) {
      if (
        existing.kind !== "transaction" &&
        existing.kind !== "eip712_sign" &&
        !nextIdSet.has(existing.id) &&
        !this.resolvedWalletRequestIds.has(existing.id)
      ) {
        nextRequests.push(existing);
      }
    }

    // NOTE: `resolvedWalletRequestIds` is intentionally a permanent per-session
    // tombstone set — we do NOT garbage-collect it. Backend pending ids are
    // monotonic per session (the `next_*_ids` counters never reuse a discarded
    // id), so a resolved id can never legitimately come back. GC'ing it on the
    // first poll where the pending bucket is absent (which, for apps like byreal
    // that drive sign requests purely via system events, is *every* poll)
    // reopened the loop: the preservation block above would stop recognising the
    // zombie and re-add it indefinitely, so polling never terminated.

    if (
      nextRequests.length === this.walletRequests.length &&
      nextRequests.every((request, index) => {
        const current = this.walletRequests[index];
        return (
          current?.id === request.id &&
          current.kind === request.kind &&
          JSON.stringify(current.payload) === JSON.stringify(request.payload)
        );
      })
    ) {
      return;
    }

    this.walletRequests = nextRequests;
    this.emit("wallet_requests_changed", this.getPendingRequests());
  }
}

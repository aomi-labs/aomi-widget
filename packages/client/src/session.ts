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
//     await session.resolve(req.id, { txHash: signed.hash });
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
import { UserState, type UserState as UserStateShape } from "./types";
import { TypedEventEmitter } from "./event";
import { unwrapSystemEvent } from "./event";
import {
  normalizeTxPayload,
  normalizeEip712Payload,
  type WalletTxPayload,
  type WalletEip712Payload,
} from "./wallet-utils";

// =============================================================================
// Types
// =============================================================================

export type WalletRequestKind = "transaction" | "eip712_sign";

export type WalletRequest = {
  id: string;
  kind: WalletRequestKind;
  payload: WalletTxPayload | WalletEip712Payload;
  timestamp: number;
};

export type WalletRequestResult = {
  txHash?: string;
  signature?: string;
  amount?: string;
  error?: string;
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
  /** Polling interval in ms. Default: 500 */
  pollIntervalMs?: number;
  /** Logger for debug output. Pass `console` for verbose logging. */
  logger?: { debug: (...args: unknown[]) => void };
};

/** Events emitted by Session. */
export type SessionEventMap = {
  /** A transaction signing request arrived from the backend. */
  wallet_tx_request: WalletRequest;
  /** An EIP-712 signing request arrived from the backend. */
  wallet_eip712_request: WalletRequest;
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
  private pollIntervalMs: number;
  private logger?: { debug: (...args: unknown[]) => void };

  // Internal state
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeSSE: (() => void) | null = null;
  private _isProcessing = false;
  private _backendWasProcessing = false;
  private walletRequests: WalletRequest[] = [];
  private walletRequestNextId = 1;
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
    const initialUserState = UserState.normalize(sessionOptions?.userState);
    this.userState = sessionOptions?.clientType
      ? UserState.withExt(initialUserState ?? {}, "client_type", sessionOptions.clientType)
      : initialUserState;
    this.clientId = sessionOptions?.clientId ?? crypto.randomUUID();
    this.pollIntervalMs = sessionOptions?.pollIntervalMs ?? 500;
    this.logger = sessionOptions?.logger;

    // Start SSE subscription
    this.unsubscribeSSE = this.client.subscribeSSE(
      this.sessionId,
      (event) => this.handleSSEEvent(event),
      (error) => this.emit("error", { error }),
    );
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

    const response = await this.client.sendMessage(this.sessionId, message, {
      app: this.app,
      publicKey: this.publicKey,
      apiKey: this.apiKey,
      userState: this.userState,
      clientId: this.clientId,
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

    const response = await this.client.sendMessage(this.sessionId, message, {
      app: this.app,
      publicKey: this.publicKey,
      apiKey: this.apiKey,
      userState: this.userState,
      clientId: this.clientId,
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
   * Resolve a pending wallet request (transaction or EIP-712 signing).
   * Sends the result to the backend and resumes polling.
   */
  async resolve(requestId: string, result: WalletRequestResult): Promise<void> {
    const req = this.removeWalletRequest(requestId);
    if (!req) {
      throw new Error(`No pending wallet request with id "${requestId}"`);
    }

    if (req.kind === "transaction") {
      const txPayload = req.payload as WalletTxPayload;
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: result.txHash ?? "",
        status: "success",
        amount: result.amount,
        ...(txPayload.txId !== undefined
          ? { pending_tx_id: txPayload.txId }
          : {}),
      });
    } else {
      const eip712Payload = req.payload as WalletEip712Payload;
      await this.sendSystemEvent("wallet_eip712_response", {
        status: "success",
        signature: result.signature,
        description: eip712Payload.description,
        ...(eip712Payload.eip712Id !== undefined
          ? { pending_eip712_id: eip712Payload.eip712Id }
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

    if (req.kind === "transaction") {
      const txPayload = req.payload as WalletTxPayload;
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: "",
        status: "failed",
        error: reason ?? "Request rejected",
        ...(txPayload.txId !== undefined
          ? { pending_tx_id: txPayload.txId }
          : {}),
      });
    } else {
      const eip712Payload = req.payload as WalletEip712Payload;
      await this.sendSystemEvent("wallet_eip712_response", {
        status: "failed",
        error: reason ?? "Request rejected",
        description: eip712Payload.description,
        ...(eip712Payload.eip712Id !== undefined
          ? { pending_eip712_id: eip712Payload.eip712Id }
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
    this.unsubscribeSSE?.();
    this.unsubscribeSSE = null;
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

  resolveUserState(userState: UserStateShape): void {
    this.userState = UserState.normalize(userState);

    const address = UserState.address(this.userState);
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
    this.resolveUserState(nextState);
  }

  resolveWallet(address: string, chainId?: number): void {
    this.resolveUserState({
      address,
      chain_id: chainId ?? 1,
      is_connected: true,
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
        const payload = normalizeTxPayload(unwrapped.payload);
        if (payload) {
          const req = this.enqueueWalletRequest("transaction", payload);
          this.emit("wallet_tx_request", req);
        }
      } else if (unwrapped.type === "wallet_eip712_request") {
        const payload = normalizeEip712Payload(unwrapped.payload ?? {});
        const req = this.enqueueWalletRequest("eip712_sign", payload);
        this.emit("wallet_eip712_request", req);
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

  // ===========================================================================
  // Internal — Wallet Request Queue
  // ===========================================================================

  private enqueueWalletRequest(
    kind: WalletRequestKind,
    payload: WalletTxPayload | WalletEip712Payload,
  ): WalletRequest {
    const id = this.getWalletRequestId(kind, payload);
    const existing = this.walletRequests.find((request) => request.id === id);
    const req: WalletRequest = {
      id,
      kind,
      payload,
      timestamp: existing?.timestamp ?? Date.now(),
    };
    this.walletRequests = existing
      ? this.walletRequests.map((request) => (request.id === id ? req : request))
      : [...this.walletRequests, req];
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
    await this.client.sendSystemMessage(this.sessionId, message);
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
    const normalizedActualUserState = UserState.normalize(actualUserState);

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
    payload: WalletTxPayload | WalletEip712Payload,
  ): string {
    if (kind === "transaction") {
      const txId = (payload as WalletTxPayload).txId;
      if (typeof txId === "number") {
        return `tx-${txId}`;
      }
    } else {
      const eip712Id = (payload as WalletEip712Payload).eip712Id;
      if (typeof eip712Id === "number") {
        return `eip712-${eip712Id}`;
      }
    }

    return `wreq-${this.walletRequestNextId++}`;
  }

  private syncWalletRequests(): void {
    const nextRequests: WalletRequest[] = [];
    const pendingTxs = isRecord(this.userState?.pending_txs)
      ? this.userState?.pending_txs
      : undefined;
    const pendingEip712s = isRecord(this.userState?.pending_eip712s)
      ? this.userState?.pending_eip712s
      : undefined;

    for (const [id, raw] of Object.entries(pendingTxs ?? {}).sort((left, right) =>
      Number(left[0]) - Number(right[0]),
    )) {
      const payload = normalizeTxPayload({
        ...(isRecord(raw) ? raw : {}),
        pending_tx_id: Number(id),
      });
      if (!payload) {
        continue;
      }

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

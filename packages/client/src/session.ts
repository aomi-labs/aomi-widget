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
  AomiClientOptions,
  AomiMessage,
  AomiChatResponse,
  AomiSSEEvent,
  AomiStateResponse,
  AomiSystemEvent,
  UserState,
} from "./types";
import { TypedEventEmitter } from "./event-emitter";
import { unwrapSystemEvent } from "./event-unwrap";
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
};

export type SendResult = {
  messages: AomiMessage[];
  title?: string;
};

export type SessionOptions = {
  /** Session ID. Auto-generated (crypto.randomUUID) if omitted. */
  sessionId?: string;
  /** Namespace for chat messages. Default: "default" */
  namespace?: string;
  /** User public key (wallet address). */
  publicKey?: string;
  /** API key override. */
  apiKey?: string;
  /** User state to send with requests (wallet connection info, etc). */
  userState?: UserState;
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
  /** An error occurred during polling or SSE. */
  error: { error: unknown };
  /** Wildcard: receives all events as { type, payload }. */
  "*": { type: string; payload: unknown };
};

// =============================================================================
// Session Class
// =============================================================================

export class Session extends TypedEventEmitter<SessionEventMap> {
  /** The underlying low-level client. */
  readonly client: AomiClient;
  /** The session (thread) ID. */
  readonly sessionId: string;

  private namespace: string;
  private publicKey?: string;
  private apiKey?: string;
  private userState?: UserState;
  private pollIntervalMs: number;
  private logger?: { debug: (...args: unknown[]) => void };

  // Internal state
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeSSE: (() => void) | null = null;
  private _isProcessing = false;
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
    this.namespace = sessionOptions?.namespace ?? "default";
    this.publicKey = sessionOptions?.publicKey;
    this.apiKey = sessionOptions?.apiKey;
    this.userState = sessionOptions?.userState;
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
      namespace: this.namespace,
      publicKey: this.publicKey,
      apiKey: this.apiKey,
      userState: this.userState,
    });

    this.applyState(response);

    if (!response.is_processing) {
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
      namespace: this.namespace,
      publicKey: this.publicKey,
      apiKey: this.apiKey,
      userState: this.userState,
    });

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
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: result.txHash ?? "",
        status: "success",
        amount: result.amount,
      });
    } else {
      const eip712Payload = req.payload as WalletEip712Payload;
      await this.sendSystemEvent("wallet_eip712_response", {
        status: "success",
        signature: result.signature,
        description: eip712Payload.description,
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
      await this.sendSystemEvent("wallet:tx_complete", {
        txHash: "",
        status: "failed",
      });
    } else {
      const eip712Payload = req.payload as WalletEip712Payload;
      await this.sendSystemEvent("wallet_eip712_response", {
        status: "failed",
        error: reason ?? "Request rejected",
        description: eip712Payload.description,
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

  /** Pending wallet requests waiting for resolve/reject. */
  getPendingRequests(): WalletRequest[] {
    return [...this.walletRequests];
  }

  /** Whether the AI is currently processing. */
  getIsProcessing(): boolean {
    return this._isProcessing;
  }

  // ===========================================================================
  // Internal — Polling (ported from PollingController)
  // ===========================================================================

  private startPolling(): void {
    if (this.pollTimer || this.closed) return;

    this.logger?.debug("[session] polling started", this.sessionId);
    this.pollTimer = setInterval(() => {
      void this.pollTick();
    }, this.pollIntervalMs);
  }

  private stopPolling(): void {
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
      );

      // Guard: polling may have been stopped while awaiting fetch
      if (!this.pollTimer) return;

      this.applyState(state);

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
      "messages" | "system_events" | "title" | "is_processing"
    >,
  ): void {
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
    const req: WalletRequest = {
      id: `wreq-${this.walletRequestNextId++}`,
      kind,
      payload,
      timestamp: Date.now(),
    };
    this.walletRequests.push(req);
    return req;
  }

  private removeWalletRequest(id: string): WalletRequest | null {
    const idx = this.walletRequests.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    return this.walletRequests.splice(idx, 1)[0];
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
}

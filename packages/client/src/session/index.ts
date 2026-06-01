import { AomiClient } from "../client";
import type {
  AomiClientOptions,
  AomiMessage,
  AomiChatResponse,
  AomiStateResponse,
} from "../types";
import {
  UserState,
  type AomiClientType,
  type UserState as UserStateShape,
  type UserStateAAMode,
} from "../user-state";
import { TypedEventEmitter } from "../event";
import type {
  SendResult,
  SessionEventMap,
  SessionOptions,
  SessionRuntimeOptions,
  WalletRequest,
  WalletRequestResult,
} from "./types";
import { stableUserStateString } from "./json";
import { applySessionState, handleSessionSSEEvent } from "./events";
import {
  addExtValue as addUserStateExtValue,
  removeExtValue as removeUserStateExtValue,
  resolveWalletState,
  warnIfUserStateMisaligned,
} from "./state";
import { SessionWalletController } from "./wallet";

export { aaModeFromExecutionKind } from "../aa/policy";
export type {
  SendResult,
  SessionEventMap,
  SessionOptions,
  SessionRuntimeOptions,
  WalletRequest,
  WalletRequestKind,
  WalletRequestResult,
} from "./types";

export class ClientSession extends TypedEventEmitter<SessionEventMap> {
  readonly client: AomiClient;
  readonly sessionId: string;

  private app: string;
  private publicKey?: string;
  private apiKey?: string;
  private userState?: UserStateShape;
  private clientId: string;
  private syncPendingTxRequestsFromUserState: boolean;
  private pollIntervalMs: number;
  private logger?: { debug: (...args: unknown[]) => void };

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private unsubscribeSSE: (() => void) | null = null;
  private isSSEActive = false;
  private _isProcessing = false;
  private _backendWasProcessing = false;
  private walletController!: SessionWalletController;
  private _messages: AomiMessage[] = [];
  private _title?: string;
  private closed = false;

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
    this.walletController = new SessionWalletController({
      getUserState: () => this.userState,
      resolveUserState: (userState) => this.resolveUserState(userState),
      sendSystemEvent: (type, payload) => this.sendSystemEvent(type, payload),
      onChange: (requests) => this.emit("wallet_requests_changed", requests),
      syncPendingTxRequestsFromUserState: this.syncPendingTxRequestsFromUserState,
    });

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

    if (!response.is_processing && this.walletController.length === 0) {
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
   * Resolve a pending wallet request (transaction, EIP-712, or Solana
   * sign). The `result.kind` discriminator must match the originating
   * request's kind — sending a `transaction` result for an `eip712_sign`
   * request would post the wrong wire event with empty fields, so we
   * fail fast at runtime instead.
   */
  async resolve(requestId: string, result: WalletRequestResult): Promise<void> {
    await this.walletController.resolve(requestId, result);
    if (this._isProcessing) {
      this.startPolling();
    }
  }

  /**
   * Reject a pending wallet request.
   * Sends an error to the backend and resumes polling.
   */
  async reject(requestId: string, reason?: string): Promise<void> {
    await this.walletController.reject(requestId, reason);
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
    this.isSSEActive = false;
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
    return this.walletController.list();
  }

  /** Whether the AI is currently processing. */
  getIsProcessing(): boolean {
    return this._isProcessing;
  }

  getIsSSEActive(): boolean {
    return this.isSSEActive;
  }

  setSSEActive(active: boolean): void {
    this.assertOpen();
    if (active === this.isSSEActive) {
      return;
    }
    this.isSSEActive = active;
    if (active) {
      this.unsubscribeSSE = this.client.subscribeSSE(
        this.sessionId,
        (event) => this.handleSSEEvent(event),
        (error) => this.emit("error", { error }),
      );
      return;
    }
    this.unsubscribeSSE?.();
    this.unsubscribeSSE = null;
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

  resolveUserState(
    userState: UserStateShape,
    opts?: { skipEmit?: boolean },
  ): void {
    const previousSerialized = stableUserStateString(this.userState);
    this.userState = UserState.reconcile(this.userState, userState);
    const nextSerialized = stableUserStateString(this.userState);

    // Identity keys off preferred_public_key (EVM address or-else SVM pubkey)
    // so SVM-only sessions still resolve a stable id.
    const publicKey = UserState.preferredPublicKey(this.userState);
    const isConnected = UserState.isConnected(this.userState);
    if (
      publicKey &&
      isConnected !== false
    ) {
      this.publicKey = publicKey;
    } else {
      this.publicKey = undefined;
    }

    this.walletController.sync();

    if (!opts?.skipEmit && this.userState && previousSerialized !== nextSerialized) {
      this.emit("user_state_updated", this.userState);
    }
  }

  setClientType(clientType: AomiClientType): void {
    this.resolveUserState(UserState.withExt(this.userState ?? {}, "client_type", clientType));
  }

  addExtValue(key: string, value: unknown): void {
    this.resolveUserState(addUserStateExtValue(this.userState, key, value));
  }

  removeExtValue(key: string): void {
    const next = removeUserStateExtValue(this.userState, key);
    if (next) {
      this.resolveUserState(next);
    }
  }

  resolveWallet(
    address: string,
    chainId?: number,
    aa?: {
      aaMode?: UserStateAAMode | null;
      smartAccount?: string | null;
      smartAccount4337?: string | null;
      delegation7702?: string | null;
    },
  ): void {
    this.resolveUserState(resolveWalletState(this.userState, address, chainId, aa));
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

      if (!state.is_processing && this.walletController.length === 0) {
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
    applySessionState(state, {
      userState: () => this.userState,
      resolveUserState: (userState) => this.resolveUserState(userState),
      setMessages: (messages) => {
        this._messages = messages;
      },
      setTitle: (title) => {
        this._title = title;
      },
      walletController: this.walletController,
      emit: (type, payload) => this.emit(type, payload),
    });
  }

  // ===========================================================================
  // Internal — SSE Handling
  // ===========================================================================

  private handleSSEEvent(event: Parameters<typeof handleSessionSSEEvent>[0]): void {
    handleSessionSSEEvent(event, {
      setTitle: (title) => {
        this._title = title;
      },
      emit: (type, payload) => this.emit(type, payload),
    });
  }

  // ===========================================================================
  // Internal — Helpers
  // ===========================================================================

  private async sendSystemEvent(
    type: string,
    payload: unknown,
  ): Promise<void> {
    const message = JSON.stringify({ type, payload });
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
    warnIfUserStateMisaligned(this.userState, actualUserState);
  }

}

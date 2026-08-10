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
  WalletRequestTarget,
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
  WalletAaSignPayload,
  WalletAaSignatureRequest,
  WalletRequestKind,
  WalletRequestTarget,
  WalletRequestResult,
} from "./types";

/**
 * Floor between poll starts triggered by SSE activity or send completion.
 * Keeps event-driven reconciliation prompt while bounding the request rate:
 * without it, a tool-heavy turn's SSE events would drive back-to-back
 * /api/thread/state fetches limited only by network latency.
 */
const MIN_IMMEDIATE_POLL_GAP_MS = 250;

export class ClientSession extends TypedEventEmitter<SessionEventMap> {
  readonly client: AomiClient;
  readonly sessionId: string;

  private app: string;
  private applicationId?: number | string | null;
  private apiKey?: string;
  private userState?: UserStateShape;
  private clientId: string;
  private paymentMethod?: string | null;
  private syncPendingTxRequestsFromUserState: boolean;
  private pollIntervalMs: number;
  private logger?: { debug: (...args: unknown[]) => void };

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingActive = false;
  private pollInFlight = false;
  private pollAgainImmediately = false;
  private pollFailureCount = 0;
  private lastPollStartedAt = 0;
  private unsubscribeSSE: (() => void) | null = null;
  private isSSEActive = false;
  private _isProcessing = false;
  private _backendWasProcessing = false;
  private walletController!: SessionWalletController;
  private _messages: AomiMessage[] = [];
  private _title?: string;
  private closed = false;

  private pendingResolve: ((result: SendResult) => void) | null = null;
  private pendingTurnIds = new Set<string>();
  private awaitingChatTurnIds = new Set<string>();
  private provisionalTurnText = new Map<string, string>();

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
    this.applicationId = sessionOptions?.applicationId;
    this.apiKey = sessionOptions?.apiKey;
    this.paymentMethod = sessionOptions?.paymentMethod;
    const initialUserState = UserState.reconcile(
      undefined,
      sessionOptions?.userState,
    );
    this.userState = sessionOptions?.clientType
      ? UserState.withExt(
          initialUserState ?? {},
          "client_type",
          sessionOptions.clientType,
        )
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
      syncPendingTxRequestsFromUserState:
        this.syncPendingTxRequestsFromUserState,
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

    const response = await this.submitChat(message);

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

    const response = await this.submitChat(message);

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
    this.resumeAfterWalletResponse();
  }

  /**
   * Reject a pending wallet request.
   * Sends an error to the backend and resumes polling.
   */
  async reject(requestId: string, reason?: string): Promise<void> {
    await this.walletController.reject(requestId, reason);
    this.resumeAfterWalletResponse();
  }

  // ===========================================================================
  // Public API — Control
  // ===========================================================================

  /**
   * Cancel the AI's current response.
   */
  async interrupt(): Promise<void> {
    this.stopPolling();
    const response = await this.client.interrupt(this.sessionId, {
      app: this.app,
      applicationId: this.applicationId,
    });
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
    this.pendingTurnIds.clear();
    this.awaitingChatTurnIds.clear();
    this.provisionalTurnText.clear();
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
      this.startSSE();
      return;
    }
    this.unsubscribeSSE?.();
    this.unsubscribeSSE = null;
  }

  syncRuntimeOptions(options: SessionRuntimeOptions): void {
    const previousApplicationId = this.applicationId?.toString();
    this.app = options.app;
    this.applicationId = options.applicationId;
    this.apiKey = options.apiKey;
    this.clientId = options.clientId ?? this.clientId;

    if (options.userState) {
      this.resolveUserState(options.userState);
    }

    if (
      this.isSSEActive &&
      previousApplicationId !== this.applicationId?.toString()
    ) {
      this.unsubscribeSSE?.();
      this.startSSE();
    }
  }

  private startSSE(): void {
    this.unsubscribeSSE = this.client.subscribeSSE(
      this.sessionId,
      (event) => this.handleSSEEvent(event),
      (error) => this.emit("error", { error }),
      { applicationId: this.applicationId },
    );
  }

  resolveUserState(
    userState: UserStateShape,
    opts?: { skipEmit?: boolean },
  ): void {
    const previousSerialized = stableUserStateString(this.userState);
    this.userState = UserState.reconcile(this.userState, userState);
    const nextSerialized = stableUserStateString(this.userState);

    this.walletController.sync();

    if (
      !opts?.skipEmit &&
      this.userState &&
      previousSerialized !== nextSerialized
    ) {
      this.emit("user_state_updated", this.userState);
    }
  }

  setClientType(clientType: AomiClientType): void {
    this.resolveUserState(
      UserState.withExt(this.userState ?? {}, "client_type", clientType),
    );
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
    this.resolveUserState(
      resolveWalletState(this.userState, address, chainId, aa),
    );
  }

  async syncUserState(): Promise<AomiStateResponse> {
    this.assertOpen();

    const state = await this.client.fetchState(
      this.sessionId,
      this.userState,
      this.clientId,
      { app: this.app, applicationId: this.applicationId },
    );
    this.assertUserStateAligned(state.user_state);
    this.applyState(state);
    return state;
  }

  // ===========================================================================
  // Public API — Polling Control
  // ===========================================================================

  /** Whether the session is currently polling for state updates. */
  getIsPolling(): boolean {
    return this.pollingActive;
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
      { app: this.app, applicationId: this.applicationId },
    );

    this.assertUserStateAligned(state.user_state);
    this.applyState(state);

    if (state.is_processing && !this.pollingActive) {
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
    if (this.pollingActive || this.closed) return;

    this.pollingActive = true;
    this._backendWasProcessing = true;
    this.logger?.debug("[session] polling started", this.sessionId);
    if (typeof document !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }
    this.schedulePoll(this.currentPollInterval());
  }

  /** Stop polling for state updates. Idempotent — no-op if not polling. */
  stopPolling(): void {
    this.pollingActive = false;
    this.pollAgainImmediately = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }
    this.logger?.debug("[session] polling stopped", this.sessionId);
  }

  private async pollTick(): Promise<void> {
    if (!this.pollingActive || this.pollInFlight) return;
    this.pollTimer = null;
    this.pollInFlight = true;
    this.lastPollStartedAt = Date.now();

    try {
      const state = await this.client.fetchState(
        this.sessionId,
        this.userState,
        this.clientId,
        { app: this.app, applicationId: this.applicationId },
      );

      // Guard: polling may have been stopped while awaiting fetch
      if (!this.pollingActive) return;

      this.pollFailureCount = 0;
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
      this.pollFailureCount += 1;
      this.logger?.debug("[session] poll error", error);
      this.emit("error", { error });
    } finally {
      this.pollInFlight = false;
      if (this.pollingActive) {
        const delay = this.pollAgainImmediately
          ? this.immediatePollDelay()
          : Math.min(
              this.currentPollInterval() * 2 ** this.pollFailureCount,
              5_000,
            );
        this.pollAgainImmediately = false;
        this.schedulePoll(delay);
      }
    }
  }

  private currentPollInterval(): number {
    return typeof document !== "undefined" && document.hidden
      ? 2_000
      : this.pollIntervalMs;
  }

  private schedulePoll(delayMs: number): void {
    if (!this.pollingActive || this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => {
      void this.pollTick();
    }, delayMs);
  }

  /** Delay for an "immediate" poll, clamped to the minimum inter-poll gap. */
  private immediatePollDelay(): number {
    return Math.max(
      0,
      MIN_IMMEDIATE_POLL_GAP_MS - (Date.now() - this.lastPollStartedAt),
    );
  }

  private requestImmediatePoll(): void {
    if (this.closed) return;
    if (!this.pollingActive) this.startPolling();
    if (this.pollInFlight) {
      this.pollAgainImmediately = true;
      return;
    }
    this.schedulePoll(this.immediatePollDelay());
  }

  private handleVisibilityChange = (): void => {
    if (typeof document !== "undefined" && !document.hidden) {
      this.requestImmediatePoll();
    }
  };

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
      getMessages: () => this.getMessages(),
      setTitle: (title) => {
        this._title = title;
      },
      walletController: this.walletController,
      emit: (type, payload) => this.emit(type, payload),
    });
    if (state.is_processing) {
      this.applyProvisionalFirstText();
    } else if (state.is_processing === false) {
      this.pendingTurnIds.clear();
      this.provisionalTurnText.clear();
    }
  }

  // ===========================================================================
  // Internal — SSE Handling
  // ===========================================================================

  private handleSSEEvent(
    event: Parameters<typeof handleSessionSSEEvent>[0],
  ): void {
    if (event.thread_id && event.thread_id !== this.sessionId) return;
    if (
      event.type === "assistant_text_started" &&
      typeof event.turn_id === "string" &&
      typeof event.text === "string"
    ) {
      if (!this.pendingTurnIds.has(event.turn_id)) return;
      this.provisionalTurnText.set(event.turn_id, event.text);
      this.applyProvisionalFirstText();
      if (!this.awaitingChatTurnIds.has(event.turn_id)) {
        this.requestImmediatePoll();
      }
      return;
    }

    handleSessionSSEEvent(event, {
      userState: () => this.userState,
      resolveUserState: (userState) => this.resolveUserState(userState),
      setMessages: (messages) => {
        this._messages = messages;
      },
      getMessages: () => this.getMessages(),
      setTitle: (title) => {
        this._title = title;
      },
      walletController: this.walletController,
      emit: (type, payload) => this.emit(type, payload),
    });
    if (event.type === "tool_update" || event.type === "tool_complete") {
      this.requestImmediatePoll();
    }
  }

  // ===========================================================================
  // Internal — Helpers
  // ===========================================================================

  private async sendSystemEvent(type: string, payload: unknown): Promise<void> {
    const message = JSON.stringify({ type, payload });
    await this.client.sendSystemMessage(this.sessionId, message, {
      app: this.app,
      applicationId: this.applicationId,
    });
  }

  /** Shared completion path for send()/sendAsync() after the chat POST. */
  private async submitChat(message: string): Promise<AomiChatResponse> {
    const { response, requestedTurnId } = await this.postChatMessage(message);

    this.assertUserStateAligned(response.user_state);
    this.applyState(response);
    this.awaitingChatTurnIds.delete(requestedTurnId);
    if (this.provisionalTurnText.size > 0) {
      this.requestImmediatePoll();
    }

    return response;
  }

  private async postChatMessage(message: string): Promise<{
    response: AomiChatResponse;
    requestedTurnId: string;
  }> {
    const requestedTurnId = crypto.randomUUID();
    this.pendingTurnIds.add(requestedTurnId);
    this.awaitingChatTurnIds.add(requestedTurnId);
    try {
      const response = await this.client.sendMessage(this.sessionId, message, {
        app: this.app,
        applicationId: this.applicationId,
        apiKey: this.apiKey,
        userState: this.userState,
        clientId: this.clientId,
        paymentMethod: this.paymentMethod,
        turnId: requestedTurnId,
      });
      if (response.turn_id && response.turn_id !== requestedTurnId) {
        this.pendingTurnIds.delete(requestedTurnId);
        this.pendingTurnIds.add(response.turn_id);
      } else if (!response.turn_id) {
        // Old backend: no first-text event will be correlated, so polling is
        // the complete compatibility path.
        this.pendingTurnIds.delete(requestedTurnId);
      }
      return { response, requestedTurnId };
    } catch (error) {
      this.awaitingChatTurnIds.delete(requestedTurnId);
      this.pendingTurnIds.delete(requestedTurnId);
      this.provisionalTurnText.delete(requestedTurnId);
      throw error;
    }
  }

  private applyProvisionalFirstText(): void {
    const entries = Array.from(this.provisionalTurnText.entries());
    let entry: [string, string] | undefined;
    for (let index = entries.length - 1; index >= 0; index -= 1) {
      if (this.pendingTurnIds.has(entries[index][0])) {
        entry = entries[index];
        break;
      }
    }
    if (!entry) return;
    const [, text] = entry;
    const messages = [...this._messages];
    let streamingIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (
        messages[index].sender === "agent" &&
        messages[index].is_streaming === true
      ) {
        streamingIndex = index;
        break;
      }
    }
    if (streamingIndex >= 0) {
      if (messages[streamingIndex].content?.trim()) return;
      messages[streamingIndex] = {
        ...messages[streamingIndex],
        content: text,
      };
    } else {
      messages.push({ sender: "agent", content: text, is_streaming: true });
    }
    this._messages = messages;
    this.emit("messages", messages);
  }

  private resumeAfterWalletResponse(): void {
    if (!this._isProcessing) {
      this._isProcessing = true;
      this.emit("processing_start", undefined);
    }
    this.startPolling();
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

  private assertUserStateAligned(
    actualUserState?: UserStateShape | null,
  ): void {
    warnIfUserStateMisaligned(this.userState, actualUserState);
  }
}

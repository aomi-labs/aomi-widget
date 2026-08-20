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
  type OwnedUserState,
  type UserState as UserStateShape,
} from "../user-state";
import { TypedEventEmitter } from "../event";
import type {
  SendResult,
  SessionEventMap,
  SessionOptions,
  SessionRuntimeOptions,
  WalletSigningPayload,
  WalletRequest,
  WalletSolanaLegResult,
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
import type {
  AgentAction,
  AgentActionResult,
  AgentDelta,
  AgentMessage,
  EvmExternalTransactionAction,
  SigningRequestAction,
  SvmExternalTransactionAction,
} from "../agent/types";

export { aaModeFromExecutionKind } from "../aa/policy";
export type {
  SendResult,
  SessionEventMap,
  SessionOptions,
  SessionRuntimeOptions,
  WalletRequest,
  WalletSignablePayload,
  WalletSigningPayload,
  WalletRequestKind,
  WalletRequestTarget,
  WalletRequestResult,
  WalletSolanaLegResult,
} from "./types";

const SIGNING_RECOVERY_MIN_INTERVAL_MS = 5_000;

export class ClientSession extends TypedEventEmitter<SessionEventMap> {
  readonly client: AomiClient;
  readonly sessionId: string;

  private app: string;
  private model?: string | null;
  private applicationId?: number | string | null;
  private apiKey?: string;
  private userState?: UserStateShape;
  private clientId: string;
  private paymentMethod?: string | null;
  private syncPendingTxRequestsFromUserState: boolean;
  private pollIntervalMs: number;
  private logger?: { debug: (...args: unknown[]) => void };
  private readonly transport: "agent" | "legacy";
  private agentCursor?: string;
  private agentActions = new Map<string, AgentAction>();

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingActive = false;
  private pollInFlight = false;
  private pollFailureCount = 0;
  private unsubscribeSSE: (() => void) | null = null;
  private isSSEActive = false;
  private _isProcessing = false;
  private _backendWasProcessing = false;
  private walletController!: SessionWalletController;
  private recoveringSigningRequestIds = new Set<string>();
  private signingRecoveryInFlight: Promise<void> | null = null;
  private signingRecoveryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastSigningRecoveryAt = 0;
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
    this.model = sessionOptions?.model;
    this.applicationId = sessionOptions?.applicationId;
    this.apiKey = sessionOptions?.apiKey;
    this.paymentMethod = sessionOptions?.paymentMethod;
    this.transport = sessionOptions?.transport ?? "agent";
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
      completeSigningRequest: (requestId, body) =>
        this.completeSigningRequest(requestId, body),
      onChange: (requests) => this.emit("wallet_requests_changed", requests),
      syncPendingTxRequestsFromUserState:
        this.syncPendingTxRequestsFromUserState,
      resolveAgentAction:
        this.transport === "agent"
          ? (request, result) => this.resolveAgentAction(request, result)
          : undefined,
      rejectAgentAction:
        this.transport === "agent"
          ? (request, reason) => this.rejectAgentAction(request, reason)
          : undefined,
    });
    // Durable backend-owned signing handoffs must resume even when loading the
    // application runtime or thread history is slow/unavailable.
    if (this.transport === "legacy") {
      queueMicrotask(() => this.scheduleSigningRequestRecovery(true));
    }
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
   * Resolve a pending wallet request. The `result.kind` discriminator must
   * match the originating request's kind — sending a `transaction` result for a `signing`
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

  /**
   * Drop a pending wallet request locally without completing it. Hosts should
   * normally use `resolve` or `reject`; this is reserved for externally
   * acknowledged lifecycle cleanup.
   */
  dismiss(requestId: string): void {
    this.walletController.dismiss(requestId);
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
    if (this.transport === "agent") {
      this.applyAgentDelta(await this.client.agent.interrupt(this.sessionId));
    } else {
      const response = await this.client.interrupt(this.sessionId, {
        app: this.app,
        applicationId: this.applicationId,
      });
      this.applyState(response);
    }
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
    if (this.signingRecoveryTimer) {
      clearTimeout(this.signingRecoveryTimer);
      this.signingRecoveryTimer = null;
    }
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
      this.startSSE();
      return;
    }
    this.unsubscribeSSE?.();
    this.unsubscribeSSE = null;
  }

  syncRuntimeOptions(options: SessionRuntimeOptions): void {
    const previousApplicationId = this.applicationId?.toString();
    this.app = options.app;
    this.model = options.model;
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
    if (this.transport === "agent") {
      if (this._isProcessing) this.startPolling();
      return;
    }
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

  resolveWallet(address: string, chainId?: number): void {
    this.resolveUserState(resolveWalletState(this.userState, address, chainId));
  }

  /**
   * The subset of the stored state the client may send to the backend. Drops
   * backend-authority `pending` (in-flight requests the client only receives).
   */
  private outboundUserState(): OwnedUserState | undefined {
    return UserState.toOwned(this.userState);
  }

  async syncUserState(): Promise<AomiStateResponse> {
    this.assertOpen();

    if (this.transport === "agent") {
      const delta = await this.client.agent.check(this.sessionId, {
        cursor: this.agentCursor,
      });
      this.applyAgentDelta(delta);
      return this.agentState(delta);
    }

    const state = await this.client.fetchState(
      this.sessionId,
      this.outboundUserState(),
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

    if (this.transport === "agent") {
      const delta = await this.client.agent.check(this.sessionId, {
        cursor: this.agentCursor,
      });
      this.applyAgentDelta(delta);
      const active = this.agentActive(delta);
      if (active && !this.pollingActive) {
        this._isProcessing = true;
        this.emit("processing_start", undefined);
        this.startPolling();
      } else if (!active) {
        this._isProcessing = false;
      }
      return;
    }

    const state = await this.client.fetchState(
      this.sessionId,
      this.outboundUserState(),
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

    try {
      if (this.transport === "agent") {
        const delta = await this.client.agent.check(this.sessionId, {
          cursor: this.agentCursor,
          waitMs: 25_000,
        });
        if (!this.pollingActive) return;
        this.pollFailureCount = 0;
        this.applyAgentDelta(delta);
        const active = this.agentActive(delta);
        if (this._backendWasProcessing && !active) {
          this.emit("backend_idle", undefined);
        }
        this._backendWasProcessing = active;
        if (!active && this.walletController.length === 0) {
          this.stopPolling();
          this._isProcessing = false;
          this.emit("processing_end", undefined);
          this.resolvePending();
        }
        return;
      }
      const state = await this.client.fetchState(
        this.sessionId,
        this.outboundUserState(),
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
        this.schedulePoll(
          Math.min(
            this.currentPollInterval() * 2 ** this.pollFailureCount,
            5_000,
          ),
        );
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

  private handleVisibilityChange = (): void => {
    if (
      typeof document !== "undefined" &&
      !document.hidden &&
      !this.pollInFlight
    ) {
      this.schedulePoll(0);
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
    this.scheduleSigningRequestRecovery();
  }

  /**
   * Coalesce recovery behind one request and a bounded cadence. State polling
   * may run twice per second; durable handoff recovery does not need to.
   */
  private scheduleSigningRequestRecovery(immediate = false): void {
    if (
      this.transport === "agent" ||
      this.closed ||
      this.signingRecoveryInFlight
    )
      return;

    const elapsed = Date.now() - this.lastSigningRecoveryAt;
    const delay = immediate
      ? 0
      : Math.max(0, SIGNING_RECOVERY_MIN_INTERVAL_MS - elapsed);
    if (delay === 0) {
      void this.recoverSigningRequests();
      return;
    }
    if (this.signingRecoveryTimer) return;

    this.signingRecoveryTimer = setTimeout(() => {
      this.signingRecoveryTimer = null;
      if (!this.closed) void this.recoverSigningRequests();
    }, delay);
  }

  /**
   * A signing event is transient, but its backend-owned operation is durable.
   * Recover an attended handoff from the operation view when a tab reload or
   * reconnect happens after the original event was delivered.
   */
  private async recoverSigningRequests(): Promise<void> {
    if (this.signingRecoveryInFlight) {
      await this.signingRecoveryInFlight;
      return;
    }

    const recovery = this.fetchSigningRequests();
    this.signingRecoveryInFlight = recovery;
    try {
      await recovery;
    } finally {
      this.lastSigningRecoveryAt = Date.now();
      this.signingRecoveryInFlight = null;
    }
  }

  private async fetchSigningRequests(): Promise<void> {
    let response: { requests?: unknown[] };
    try {
      response = await this.client.request<{ requests?: unknown[] }>(
        "GET",
        "/api/widget/v1/signing-requests",
        { sessionId: this.sessionId },
      );
    } catch (error) {
      this.logger?.debug("[session] signing request recovery failed", error);
      return;
    }
    for (const request of response.requests ?? []) {
      const requestId =
        typeof request === "object" &&
        request !== null &&
        typeof (request as { requestId?: unknown }).requestId === "string"
          ? (request as { requestId: string }).requestId
          : undefined;
      if (!requestId) continue;
      if (
        this.walletController.find(requestId) ||
        this.recoveringSigningRequestIds.has(requestId)
      ) {
        continue;
      }

      this.recoveringSigningRequestIds.add(requestId);
      try {
        this.handleSSEEvent({
          type: "wallet_signing_request",
          payload: request,
        });
      } finally {
        this.recoveringSigningRequestIds.delete(requestId);
      }
    }
  }

  // ===========================================================================
  // Internal — SSE Handling
  // ===========================================================================

  private handleSSEEvent(
    event: Parameters<typeof handleSessionSSEEvent>[0],
  ): void {
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

  private async completeSigningRequest(
    requestId: string,
    body:
      | { status: "signed"; signatures: string[] }
      | { status: "rejected"; reason?: string },
  ): Promise<void> {
    await this.client.request(
      "POST",
      `/api/widget/v1/signing-requests/${encodeURIComponent(requestId)}`,
      {
        sessionId: this.sessionId,
        body,
      },
    );
  }

  /** Shared completion path for send()/sendAsync() after the chat POST. */
  private async submitChat(message: string): Promise<AomiChatResponse> {
    if (this.transport === "agent") {
      const applicationId = Number(this.applicationId);
      const delta = await this.client.agent.start({
        sessionId: this.sessionId,
        message,
        ...(Number.isSafeInteger(applicationId) && applicationId > 0
          ? { applicationId }
          : { app: this.app }),
        ...(this.model ? { model: this.model } : {}),
        wallets: this.agentWallets(),
      });
      this.applyAgentDelta(delta);
      return this.agentState(delta);
    }
    const response = await this.client.sendMessage(this.sessionId, message, {
      app: this.app,
      applicationId: this.applicationId,
      apiKey: this.apiKey,
      userState: this.outboundUserState(),
      clientId: this.clientId,
      paymentMethod: this.paymentMethod,
    });

    this.assertUserStateAligned(response.user_state);
    this.applyState(response);
    return response;
  }

  private agentActive(delta: AgentDelta): boolean {
    return delta.status === "processing" || delta.status === "awaiting_user";
  }

  private agentState(delta: AgentDelta): AomiChatResponse {
    return {
      messages: this._messages,
      title: this._title,
      is_processing: this.agentActive(delta),
    };
  }

  private agentWallets() {
    const normalized = UserState.normalize(this.userState);
    const chainId = Number(normalized?.evm?.chain_id);
    return {
      ...(normalized?.evm?.address
        ? {
            evm: {
              address: normalized.evm.address,
              ...(Number.isSafeInteger(chainId) && chainId > 0
                ? { chainId }
                : {}),
            },
          }
        : {}),
      ...(normalized?.svm?.address
        ? {
            svm: {
              address: normalized.svm.address,
              ...(normalized.svm.cluster
                ? { cluster: normalized.svm.cluster }
                : {}),
            },
          }
        : {}),
    };
  }

  private applyAgentDelta(delta: AgentDelta): void {
    if (delta.sessionId !== this.sessionId) {
      throw new TypeError("Agent response session does not match the request");
    }
    this.agentCursor = delta.cursor;
    let messagesChanged = false;
    for (const incoming of delta.messages) {
      const message = this.agentMessage(incoming);
      const index = message.id
        ? this._messages.findIndex((current) => current.id === message.id)
        : -1;
      if (index >= 0) this._messages[index] = message;
      else this._messages.push(message);
      messagesChanged = true;
    }
    if (messagesChanged) this.emit("messages", [...this._messages]);
    if (delta.title && delta.title !== this._title) {
      this._title = delta.title;
      this.emit("title_changed", { title: delta.title });
    }
    this.applyAgentActivity(delta.activity);
    this.syncAgentActions(delta.actions);
  }

  private agentMessage(message: AgentMessage): AomiMessage {
    return {
      id: message.id,
      sender: message.role,
      content: message.content,
      timestamp: message.createdAt,
      is_streaming: message.streaming,
    };
  }

  private applyAgentActivity(activity: Array<Record<string, unknown>>): void {
    for (const event of activity) {
      const type = typeof event.type === "string" ? event.type : undefined;
      if (
        type === "tool_update" ||
        type === "tool_complete" ||
        type === "task_started" ||
        type === "task_activity" ||
        type === "task_completed"
      ) {
        this.emit(type, event as never);
      }
    }
  }

  private syncAgentActions(actions: AgentAction[]): void {
    const visible = new Set<string>();
    for (const action of actions) {
      this.agentActions.set(action.id, action);
      if (action.status !== "pending") continue;
      visible.add(action.id);
      this.enqueueAgentAction(action);
    }
    for (const request of this.walletController.list()) {
      const actionId = this.actionIdForRequest(request.id);
      if (this.agentActions.has(actionId) && !visible.has(actionId)) {
        this.walletController.dismiss(request.id);
      }
    }
  }

  private enqueueAgentAction(action: AgentAction): void {
    if (
      action.type === "external_transaction" &&
      action.chainFamily === "evm"
    ) {
      const typed = action as EvmExternalTransactionAction;
      this.walletController.enqueue("transaction", {
        requestId: typed.id,
        chainId: typed.chainId,
        aaPreference: "none",
        calls: typed.transactions.map((transaction, index) => ({
          txId: index + 1,
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
          chainId: typed.chainId,
          from: transaction.from,
          gas: transaction.gas ?? undefined,
          description: transaction.description,
        })),
        txIds: typed.transactions.map((_, index) => index + 1),
      });
      return;
    }
    if (action.type === "external_transaction") {
      const typed = action as SvmExternalTransactionAction;
      const transaction = typed.transactions[0];
      if (transaction) {
        this.walletController.enqueue("solana_sign_and_send", {
          requestId: typed.id,
          unsignedTx: transaction.unsignedTransactionBase64,
          description: typed.description,
          cluster: typed.cluster,
          transactions: typed.transactions.map((item) => ({
            id: item.id,
            unsignedTx: item.unsignedTransactionBase64,
            description: item.description,
          })),
        });
      }
      return;
    }
    const typed = action as SigningRequestAction;
    this.walletController.enqueue("signing", {
      requestId: typed.id,
      chainFamily: typed.chainFamily,
      executionKind:
        typed.executionKind === "account_abstraction" ||
        typed.executionKind === "hosted"
          ? "erc4337"
          : typed.executionKind,
      signer: typed.signer,
      chainId: typed.chainId ?? undefined,
      cluster: typed.cluster ?? undefined,
      description: typed.description,
      payloads: typed.payloads.map((payload) => {
        if (payload.kind === "evm_personal") {
          return { kind: payload.kind, message: payload.message };
        }
        if (payload.kind === "evm_typed_data") {
          return { kind: payload.kind, typedData: payload.typedData };
        }
        if (payload.kind === "svm_message") {
          return { kind: payload.kind, messageBase64: payload.messageBase64 };
        }
        return {
          kind: payload.kind,
          transactionBase64: payload.transactionBase64,
        };
      }) as WalletSigningPayload["payloads"],
      broadcaster: typed.broadcaster,
      operationId: typed.operationId ?? undefined,
      executor: typed.executor as `0x${string}` | undefined,
      expiresAt: typed.expiresAt ?? undefined,
      callsDigest: typed.callsDigest as `0x${string}` | undefined,
      calls: typed.calls as never,
      fees: typed.fees as never,
      sponsorship: typed.sponsorship ?? undefined,
    });
  }

  private async resolveAgentAction(
    request: WalletRequest,
    result: WalletRequestResult,
  ): Promise<void> {
    const action = this.agentActions.get(this.actionIdForRequest(request.id));
    if (!action)
      throw new Error(`No Agent action for wallet request "${request.id}"`);
    let actionResult: AgentActionResult;
    if (action.type === "signing_request" && result.kind === "signing") {
      actionResult = {
        status: "signed",
        revision: action.revision,
        outputs: action.payloads.map((payload, index) => ({
          id: payload.id,
          ...(payload.kind === "svm_transaction"
            ? { signedTransactionBase64: result.signatures[index] }
            : { signature: result.signatures[index] }),
        })),
      };
    } else if (
      action.type === "external_transaction" &&
      action.chainFamily === "evm" &&
      result.kind === "transaction"
    ) {
      const completed = new Set(
        result.completedTxIds ??
          action.transactions.map((_, index) => index + 1),
      );
      const failed = new Set(result.failedTxIds ?? []);
      actionResult = {
        status: "submitted",
        revision: action.revision,
        legs: action.transactions.map((transaction, index) => ({
          id: transaction.id,
          status: completed.has(index + 1)
            ? "submitted"
            : failed.has(index + 1)
              ? "failed"
              : "skipped",
          ...(completed.has(index + 1)
            ? { transactionId: result.txHashes?.[index] ?? result.txHash }
            : {}),
          ...(failed.has(index + 1)
            ? { reason: result.failureReason ?? "Transaction failed" }
            : {}),
        })),
      };
    } else if (
      action.type === "external_transaction" &&
      action.chainFamily === "svm" &&
      (result.kind === "solana_send" || result.kind === "solana_sign_and_send")
    ) {
      const byId = new Map(
        (result.legs ?? []).map((leg) => [leg.id, leg] as const),
      );
      if (action.transactions.length > 1 && byId.size === 0) {
        throw new Error(
          `SVM Agent batch "${action.id}" requires per-leg wallet results`,
        );
      }
      actionResult = {
        status: "submitted",
        revision: action.revision,
        legs: action.transactions.map((transaction, index) => {
          const leg: WalletSolanaLegResult | undefined =
            byId.get(transaction.id) ??
            (index === 0 && action.transactions.length === 1
              ? {
                  id: transaction.id,
                  status: "submitted",
                  signature: result.signature,
                  signedTx: result.signedTx,
                }
              : undefined);
          return {
            id: transaction.id,
            status: leg?.status ?? "skipped",
            ...(leg?.signature ? { transactionId: leg.signature } : {}),
            ...(leg?.signedTx
              ? { signedTransactionBase64: leg.signedTx }
              : {}),
            ...(leg?.reason ? { reason: leg.reason } : {}),
          };
        }),
      };
    } else {
      throw new Error(`Agent action/result kind mismatch for "${request.id}"`);
    }
    await this.client.agent.resolveAction(
      this.sessionId,
      action.id,
      actionResult,
    );
  }

  private async rejectAgentAction(
    request: WalletRequest,
    reason?: string,
  ): Promise<void> {
    const action = this.agentActions.get(this.actionIdForRequest(request.id));
    if (!action)
      throw new Error(`No Agent action for wallet request "${request.id}"`);
    await this.client.agent.resolveAction(this.sessionId, action.id, {
      status: "rejected",
      revision: action.revision,
      reason: reason ?? "Request rejected",
    });
  }

  private actionIdForRequest(requestId: string): string {
    return requestId.startsWith("txreq-") ? requestId.slice(6) : requestId;
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

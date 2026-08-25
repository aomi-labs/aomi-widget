import { AomiClient } from "../client";
import type { AomiClientOptions, AomiMessage } from "../types";
import {
  UserState,
  type AomiClientType,
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
import {
  addExtValue as addUserStateExtValue,
  removeExtValue as removeUserStateExtValue,
  resolveWalletState,
} from "./state";
import { SessionWalletController } from "./wallet";
import type {
  AgentAction,
  AgentActionResult,
  AgentDelta,
  AgentMessage,
  AgentStatus,
  EvmExternalTransactionAction,
  SigningRequestAction,
  SvmExternalTransactionAction,
} from "../agent/types";
import { AgentApiError } from "../agent/transport";

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

export class ClientSession extends TypedEventEmitter<SessionEventMap> {
  readonly client: AomiClient;
  readonly sessionId: string;

  private app: string;
  private model?: string | null;
  private applicationId?: number | string | null;
  private userState?: UserStateShape;
  private clientId: string;
  private pollIntervalMs: number;
  private logger?: { debug: (...args: unknown[]) => void };
  private agentCursor?: string;
  private agentStatus?: AgentStatus;
  private agentActions = new Map<string, AgentAction>();
  private agentStartOperation?: { message: string; idempotencyKey: string };

  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingActive = false;
  private pollInFlight = false;
  private pollFailureCount = 0;
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
    this.model = sessionOptions?.model;
    this.applicationId = sessionOptions?.applicationId;
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
    this.pollIntervalMs = sessionOptions?.pollIntervalMs ?? 500;
    this.logger = sessionOptions?.logger;
    this.walletController = new SessionWalletController({
      onChange: (requests) => this.emit("wallet_requests_changed", requests),
      resolveAction: (request, result) =>
        this.resolveAgentAction(request, result),
      rejectAction: (request, reason) =>
        this.rejectAgentAction(request, reason),
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

    if (!this.agentActive(response) && this.walletController.length === 0) {
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
  async sendAsync(message: string): Promise<AgentDelta> {
    this.assertOpen();

    const response = await this.submitChat(message);

    if (this.agentActive(response)) {
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
    this.applyAgentDelta(await this.client.agent.interrupt(this.sessionId));
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

  /** Last status observed from the canonical Agent transport. */
  getAgentStatus(): AgentStatus | undefined {
    return this.agentStatus;
  }

  syncRuntimeOptions(options: SessionRuntimeOptions): void {
    this.app = options.app;
    this.model = options.model;
    this.applicationId = options.applicationId;
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

  async syncUserState(): Promise<AgentDelta> {
    this.assertOpen();
    const delta = await this.client.agent.check(this.sessionId, {
      cursor: this.agentCursor,
    });
    this.applyAgentDelta(delta);
    return delta;
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

  /** Shared completion path for send()/sendAsync() after the chat POST. */
  private async submitChat(message: string): Promise<AgentDelta> {
    const applicationId = Number(this.applicationId);
    const operation =
      this.agentStartOperation?.message === message
        ? this.agentStartOperation
        : {
            message,
            idempotencyKey: `idem_${crypto.randomUUID().replaceAll("-", "")}`,
          };
    this.agentStartOperation = operation;
    let delta: AgentDelta;
    try {
      delta = await this.client.agent.start(
        {
          sessionId: this.sessionId,
          clientId: this.clientId,
          message,
          ...(Number.isSafeInteger(applicationId) && applicationId > 0
            ? { applicationId }
            : { app: this.app }),
          ...(this.model ? { model: this.model } : {}),
          wallets: this.agentWallets(),
        },
        { idempotencyKey: operation.idempotencyKey },
      );
    } catch (error) {
      if (error instanceof AgentApiError && !error.retryable) {
        this.agentStartOperation = undefined;
      }
      throw error;
    }
    this.agentStartOperation = undefined;
    this.applyAgentDelta(delta);
    return delta;
  }

  private agentActive(delta: AgentDelta): boolean {
    return delta.status === "processing" || delta.status === "awaiting_user";
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
    this.agentStatus = delta.status;
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
      tool_result: message.toolResult ?? null,
      ...(message.toolName ? { tool_name: message.toolName } : {}),
      ...(message.toolArguments !== undefined
        ? { tool_arguments: message.toolArguments }
        : {}),
    };
  }

  private applyAgentActivity(activity: Array<Record<string, unknown>>): void {
    for (const event of activity) {
      const type = typeof event.type === "string" ? event.type : undefined;
      if (
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
            ...(leg?.signedTx ? { signedTransactionBase64: leg.signedTx } : {}),
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
}

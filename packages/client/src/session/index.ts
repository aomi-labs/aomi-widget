import type {
  Event,
  EventPage,
  StartTurnIntent,
  TurnState,
} from "../agent/types";
import { ActionHandler } from "../actions";
import { AgentApiError } from "../agent/transport";
import { AomiClient } from "../client";
import { TypedEventEmitter } from "../event";
import type { AomiClientOptions, AomiMessage } from "../types";
import {
  UserState,
  type AomiClientType,
  type UserState as UserStateShape,
} from "../user-state";
import { stableUserStateString } from "./json";
import {
  addExtValue as addUserStateExtValue,
  removeExtValue as removeUserStateExtValue,
  resolveWalletState,
} from "./state";
import type {
  SendResult,
  SessionEventMap,
  SessionOptions,
  SessionRuntimeOptions,
} from "./types";

export { aaModeFromExecutionKind } from "../aa/policy";
export type {
  Event,
  EventPage,
  SendResult,
  SessionEventMap,
  SessionOptions,
  SessionRuntimeOptions,
  TurnState,
} from "./types";

const TERMINAL_TURN_STATES = new Set<TurnState>([
  "complete",
  "interrupted",
  "failed",
]);

/** One Agent session reduced from its single ordered Event stream. */
export class ClientSession extends TypedEventEmitter<SessionEventMap> {
  readonly client: AomiClient;
  readonly sessionId: string;
  readonly actions: ActionHandler;

  private app: string;
  private model?: string | null;
  private applicationId?: number | string | null;
  private userState?: UserStateShape;
  private clientId: string;
  private pollIntervalMs: number;
  private logger?: { debug: (...args: unknown[]) => void };
  private cursor?: string;
  private turnId?: string;
  private turnState?: TurnState;
  private startOperation?: { message: string; idempotencyKey: string };
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private pollingActive = false;
  private pollInFlight = false;
  private pollFailureCount = 0;
  private _isProcessing = false;
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
    const initial = UserState.reconcile(undefined, sessionOptions?.userState);
    this.userState = sessionOptions?.clientType
      ? UserState.withExt(
          initial ?? {},
          "client_type",
          sessionOptions.clientType,
        )
      : initial;
    this.clientId = sessionOptions?.clientId ?? crypto.randomUUID();
    this.pollIntervalMs = sessionOptions?.pollIntervalMs ?? 500;
    this.logger = sessionOptions?.logger;
    this.actions = new ActionHandler(
      sessionOptions?.actions ?? {},
      (action, result) =>
        this.client.agent.respondToAction(
          this.sessionId,
          action.id,
          action.revision,
          result,
        ),
    );
    this.actions.on("resolved", () => {
      this.beginProcessing();
      this.startPolling();
    });
  }

  async send(message: string): Promise<SendResult> {
    const page = await this.submit(message);
    if (this.isTerminal()) return this.result();
    this.beginProcessing();
    if (this.turnState !== "awaiting_action" || page.has_more)
      this.startPolling();
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  async sendAsync(message: string): Promise<EventPage> {
    const page = await this.submit(message);
    if (!this.isTerminal()) {
      this.beginProcessing();
      if (this.turnState !== "awaiting_action" || page.has_more)
        this.startPolling();
    }
    return page;
  }

  async interrupt(): Promise<void> {
    if (!this.turnId) throw new Error("No active turn to interrupt");
    this.stopPolling();
    this.applyEventPage(
      await this.client.agent.interrupt(this.sessionId, this.turnId),
    );
    this.finishProcessing();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.stopPolling();
    this.resolvePending();
    this.actions.close();
    this.removeAllListeners();
  }

  getMessages(): AomiMessage[] {
    return [...this._messages];
  }

  getTitle(): string | undefined {
    return this._title;
  }

  getUserState(): UserStateShape | undefined {
    return this.userState ? { ...this.userState } : undefined;
  }

  getTurnState(): TurnState | undefined {
    return this.turnState;
  }

  getTurnId(): string | undefined {
    return this.turnId;
  }

  getIsProcessing(): boolean {
    return this._isProcessing;
  }

  getIsPolling(): boolean {
    return this.pollingActive;
  }

  syncRuntimeOptions(options: SessionRuntimeOptions): void {
    this.app = options.app;
    this.model = options.model;
    this.applicationId = options.applicationId;
    this.clientId = options.clientId ?? this.clientId;
    if (options.userState) this.resolveUserState(options.userState);
    if (options.actions) this.actions.setCapabilities(options.actions);
  }

  resolveUserState(
    userState: UserStateShape,
    opts?: { skipEmit?: boolean },
  ): void {
    const previous = stableUserStateString(this.userState);
    this.userState = UserState.reconcile(this.userState, userState);
    if (
      !opts?.skipEmit &&
      this.userState &&
      previous !== stableUserStateString(this.userState)
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
    if (next) this.resolveUserState(next);
  }

  resolveWallet(address: string, chainId?: number): void {
    this.resolveUserState(resolveWalletState(this.userState, address, chainId));
  }

  async sync(): Promise<EventPage> {
    this.assertOpen();
    return this.fetchPage();
  }

  async fetchCurrentState(): Promise<void> {
    const page = await this.sync();
    if (!this.isTerminal() && this.turnState !== "awaiting_action") {
      this.beginProcessing();
      this.startPolling();
    } else if (this.isTerminal()) {
      this.finishProcessing();
    }
    if (page.has_more) this.startPolling();
  }

  startPolling(): void {
    if (this.pollingActive || this.closed) return;
    this.pollingActive = true;
    this.logger?.debug("[session] polling started", this.sessionId);
    if (typeof document !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }
    this.schedulePoll(0);
  }

  stopPolling(): void {
    this.pollingActive = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = null;
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange,
      );
    }
    this.logger?.debug("[session] polling stopped", this.sessionId);
  }

  private async submit(message: string): Promise<EventPage> {
    this.assertOpen();
    const text = message.trim();
    if (!text) throw new TypeError("message is required");
    const applicationId = Number(this.applicationId);
    const operation =
      this.startOperation?.message === text
        ? this.startOperation
        : {
            message: text,
            idempotencyKey: `idem_${crypto.randomUUID().replaceAll("-", "")}`,
          };
    this.startOperation = operation;
    try {
      const page = await this.client.agent.start(
        {
          sessionId: this.sessionId,
          clientId: this.clientId,
          message: text,
          ...(Number.isSafeInteger(applicationId) && applicationId > 0
            ? { applicationId }
            : { app: this.app }),
          ...(this.model ? { model: this.model } : {}),
          ...(this.userState
            ? {
                userState: UserState.toOwned(
                  this.userState,
                ) as StartTurnIntent["userState"],
              }
            : {}),
        },
        { idempotencyKey: operation.idempotencyKey },
      );
      this.startOperation = undefined;
      this.applyEventPage(page);
      return page;
    } catch (error) {
      if (error instanceof AgentApiError && !error.retryable) {
        this.startOperation = undefined;
      }
      throw error;
    }
  }

  private async fetchPage(waitMs = 0): Promise<EventPage> {
    try {
      const page = await this.client.agent.poll(this.sessionId, {
        cursor: this.cursor,
        waitMs,
      });
      this.applyEventPage(page);
      return page;
    } catch (error) {
      if (
        !(error instanceof AgentApiError) ||
        error.code !== "cursor_mismatch"
      ) {
        throw error;
      }
      this.cursor = undefined;
      const page = await this.client.agent.poll(this.sessionId);
      this.applyEventPage(page);
      return page;
    }
  }

  private applyEventPage(page: EventPage): void {
    if (page.session_id !== this.sessionId) {
      throw new TypeError("Agent response session does not match the request");
    }
    let messagesChanged = false;
    for (const event of page.events) {
      let emitEvent = true;
      switch (event.type) {
        case "message":
          this.applyMessage(event);
          messagesChanged = true;
          break;
        case "turn_state_changed":
          this.turnId = event.turn_id ?? this.turnId;
          this.turnState = event.state;
          break;
        case "title_changed":
          if (event.title !== undefined) this._title = event.title;
          break;
        case "action":
          this.turnId = event.turn_id ?? this.turnId;
          emitEvent = this.actions.ingest(event);
          break;
      }
      if (emitEvent) {
        this.emit("event", event);
        this.emit(event.type as keyof SessionEventMap, event as never);
      }
    }
    this.cursor = page.cursor;
    if (messagesChanged) this.emit("messages", [...this._messages]);
  }

  private applyMessage(event: Extract<Event, { type: "message" }>): void {
    const id = event.message_key ?? event.event_id;
    const message: AomiMessage = {
      id,
      message_key: event.message_key ?? undefined,
      sender: event.sender,
      content: event.content,
      timestamp: eventTimestamp(event.occurred_at),
      is_streaming: event.is_streaming ?? false,
    };
    const index = this._messages.findIndex((current) => current.id === id);
    if (index >= 0) this._messages[index] = message;
    else this._messages.push(message);
  }

  private async pollTick(): Promise<void> {
    if (!this.pollingActive || this.pollInFlight) return;
    this.pollTimer = null;
    this.pollInFlight = true;
    try {
      const page = await this.fetchPage(25_000);
      this.pollFailureCount = 0;
      if (this.isTerminal()) {
        this.emit("backend_idle", undefined);
        this.finishProcessing();
      } else if (this.turnState === "awaiting_action" && !page.has_more) {
        this.stopPolling();
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

  private beginProcessing(): void {
    if (this._isProcessing) return;
    this._isProcessing = true;
    this.emit("processing_start", undefined);
  }

  private finishProcessing(): void {
    this.stopPolling();
    if (this._isProcessing) this.emit("processing_end", undefined);
    this._isProcessing = false;
    this.resolvePending();
  }

  private isTerminal(): boolean {
    return (
      this.turnState !== undefined && TERMINAL_TURN_STATES.has(this.turnState)
    );
  }

  private result(): SendResult {
    return { messages: [...this._messages], title: this._title };
  }

  private resolvePending(): void {
    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    resolve?.(this.result());
  }

  private currentPollInterval(): number {
    return typeof document !== "undefined" && document.hidden
      ? 2_000
      : this.pollIntervalMs;
  }

  private schedulePoll(delayMs: number): void {
    if (!this.pollingActive || this.closed) return;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    this.pollTimer = setTimeout(() => void this.pollTick(), delayMs);
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

  private assertOpen(): void {
    if (this.closed) throw new Error("Session is closed");
  }
}

function eventTimestamp(value: number): string {
  return new Date(
    value < 1_000_000_000_000 ? value * 1_000 : value,
  ).toISOString();
}

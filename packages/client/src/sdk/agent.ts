import type { Action, ActionResult } from "../agent/types";
import type { AomiClient } from "../client";
import { TypedEventEmitter } from "../event";
import { ClientSession } from "../session";
import type { SendResult, SessionOptions } from "../session/types";
import { UserState, type UserState as UserStateShape } from "../user-state";
import { WalletController } from "../wallet/controller";

export interface AgentRunOptions
  extends Omit<SessionOptions, "userState" | "sessionId"> {
  sessionId?: string;
  userState?: UserStateShape;
  /** Set false to expose Actions without executing the configured wallet. */
  autoWallet?: boolean;
}

export interface AgentRunResult extends SendResult {
  sessionId: string;
  actions: Action[];
}

export interface AgentRunEventMap extends Record<string, unknown> {
  action: Action;
  completed: AgentRunResult;
  error: { error: unknown };
}

/** One stateful Agent turn. It is both event-driven and Promise-like. */
export class AgentRun
  extends TypedEventEmitter<AgentRunEventMap>
  implements PromiseLike<AgentRunResult>
{
  readonly session: ClientSession;
  private readonly completion: Promise<AgentRunResult>;
  private readonly actions = new Map<string, Action>();
  private readonly processingActions = new Set<string>();

  constructor(
    client: AomiClient,
    prompt: string,
    private readonly wallet: WalletController,
    options: AgentRunOptions = {},
  ) {
    super();
    const walletState = wallet.userState() as UserStateShape | undefined;
    const userState = options.userState
      ? UserState.reconcile(walletState, options.userState)
      : walletState;
    this.session = new ClientSession(client, { ...options, userState });
    this.session.on("action", (action) => this.receiveAction(action, options));
    this.session.on("error", ({ error }) => this.emit("error", { error }));
    this.completion = Promise.resolve()
      .then(() => this.session.send(prompt))
      .then((result) => {
        const completed = {
          ...result,
          sessionId: this.session.sessionId,
          actions: [...this.actions.values()],
        };
        this.emit("completed", completed);
        this.session.close();
        return completed;
      })
      .catch((error: unknown) => {
        this.emit("error", { error });
        this.session.close();
        throw error;
      });
    void this.completion.catch(() => undefined);
  }

  result(): Promise<AgentRunResult> {
    return this.completion;
  }

  then<TResult1 = AgentRunResult, TResult2 = never>(
    onfulfilled?:
      | ((value: AgentRunResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.completion.then(onfulfilled, onrejected);
  }

  interrupt(): Promise<void> {
    return this.session.interrupt();
  }

  respond(actionId: string, result: ActionResult): Promise<Action> {
    return this.session.respondToAction(actionId, result);
  }

  reject(actionId: string, reason?: string): Promise<Action> {
    return this.session.rejectAction(actionId, reason);
  }

  private receiveAction(action: Action, options: AgentRunOptions): void {
    const previous = this.actions.get(action.id);
    if (previous && previous.revision > action.revision) return;
    this.actions.set(action.id, action);
    this.emit("action", action);
    if (
      action.state !== "pending" ||
      options.autoWallet === false ||
      this.processingActions.has(action.id) ||
      !this.wallet.canHandle(action)
    ) {
      return;
    }
    this.processingActions.add(action.id);
    void this.wallet
      .execute(action)
      .then((result) => this.session.respondToAction(action.id, result))
      .catch((error: unknown) => this.emit("error", { error }))
      .finally(() => this.processingActions.delete(action.id));
  }
}

export class AomiAgent {
  constructor(
    readonly raw: AomiClient["agent"],
    private readonly client: AomiClient,
    private readonly wallet: WalletController,
  ) {}

  run(prompt: string, options?: AgentRunOptions): AgentRun {
    const normalized = prompt.trim();
    if (!normalized) throw new TypeError("prompt is required");
    return new AgentRun(this.client, normalized, this.wallet, options);
  }
}

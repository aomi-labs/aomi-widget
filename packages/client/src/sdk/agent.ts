import type { Action, ActionResult } from "../agent/types";
import type { ActionCapabilities } from "../actions";
import type { AomiClient } from "../client";
import { TypedEventEmitter } from "../event";
import { ClientSession } from "../session";
import type { SendResult, SessionOptions } from "../session/types";
import { UserState, type UserState as UserStateShape } from "../user-state";

export interface AgentRunOptions extends Omit<
  SessionOptions,
  "userState" | "sessionId"
> {
  sessionId?: string;
  userState?: UserStateShape;
}

export interface AgentRunResult extends SendResult {
  sessionId: string;
  actions: readonly Action[];
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
  constructor(
    client: AomiClient,
    prompt: string,
    actions: ActionCapabilities,
    options: AgentRunOptions = {},
  ) {
    super();
    const userState = UserState.reconcile(undefined, options.userState);
    this.session = new ClientSession(client, {
      ...options,
      actions,
      userState,
    });
    this.session.on("action", (action) => this.emit("action", action));
    this.session.actions.on("resolved", (action) =>
      this.emit("action", action),
    );
    this.session.on("error", ({ error }) => this.emit("error", { error }));
    this.completion = Promise.resolve()
      .then(() => this.session.send(prompt))
      .then((result) => {
        const completed = {
          ...result,
          sessionId: this.session.sessionId,
          actions: this.session.actions.all(),
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
    return this.session.actions.submitResult(actionId, result);
  }

  reject(actionId: string, reason?: string): Promise<Action> {
    return this.session.actions.reject(actionId, reason);
  }
}

export class AomiAgent {
  constructor(
    readonly raw: AomiClient["agent"],
    private readonly client: AomiClient,
    private readonly actions: ActionCapabilities = {},
  ) {}

  run(prompt: string, options?: AgentRunOptions): AgentRun {
    const normalized = prompt.trim();
    if (!normalized) throw new TypeError("prompt is required");
    return new AgentRun(
      this.client,
      normalized,
      options?.actions ?? this.actions,
      options,
    );
  }
}

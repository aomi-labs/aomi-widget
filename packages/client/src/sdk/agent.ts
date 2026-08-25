import type { AgentAction } from "../agent/types";
import type { AomiClient } from "../client";
import { TypedEventEmitter } from "../event";
import { ClientSession } from "../session";
import type {
  SendResult,
  SessionOptions,
  WalletRequest,
  WalletRequestResult,
} from "../session/types";
import type { AomiAction, PipelineSimulation } from "../pipeline/types";
import { UserState, type UserState as UserStateShape } from "../user-state";
import { WalletController } from "../wallet/controller";

export interface AgentRunOptions extends Omit<
  SessionOptions,
  "userState" | "sessionId"
> {
  sessionId?: string;
  userState?: UserStateShape;
  /** Set false to surface wallet requests without executing the adapter. */
  autoWallet?: boolean;
}

export interface AgentRunResult extends SendResult {
  sessionId: string;
  actions: AomiAction[];
}

export interface AgentRunEventMap extends Record<string, unknown> {
  action: AomiAction;
  simulation: PipelineSimulation;
  wallet_request: WalletRequest;
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
  private readonly actions = new Map<string, AomiAction>();
  private readonly processingRequests = new Set<string>();

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
    this.session = new ClientSession(client, {
      ...options,
      userState,
    });
    this.session.on("agent_action", (action) => this.receiveAction(action));
    this.session.on("wallet_requests_changed", (requests) => {
      for (const request of requests)
        this.receiveWalletRequest(request, options);
    });
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
    // Event-only consumers are valid; observing internally prevents a rejected
    // run from becoming an unhandled promise while preserving result() rejection.
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

  resolve(requestId: string, result: WalletRequestResult): Promise<void> {
    return this.session.resolve(requestId, result);
  }

  reject(requestId: string, reason?: string): Promise<void> {
    return this.session.reject(requestId, reason);
  }

  private receiveAction(action: AgentAction): void {
    const presented = presentAction(action);
    this.actions.set(presented.id, presented);
    this.emit("action", presented);
    const simulation = actionSimulation(action);
    if (simulation) this.emit("simulation", simulation);
  }

  private receiveWalletRequest(
    request: WalletRequest,
    options: AgentRunOptions,
  ): void {
    if (this.processingRequests.has(request.id)) return;
    this.emit("wallet_request", request);
    if (options.autoWallet === false || !this.wallet.canHandle(request)) return;
    this.processingRequests.add(request.id);
    void this.wallet
      .execute(request)
      .then((result) => this.session.resolve(request.id, result))
      .catch((error: unknown) => this.emit("error", { error }))
      .finally(() => this.processingRequests.delete(request.id));
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

function presentAction(action: AgentAction): AomiAction {
  if (action.type === "external_transaction" && action.chainFamily === "evm") {
    return {
      id: action.id,
      chainFamily: "evm",
      kind: "calls",
      status: action.status,
      chainId: action.chainId,
      description: action.description,
      calls: action.transactions.map((transaction) => ({
        to: transaction.to as `0x${string}`,
        data: transaction.data as `0x${string}`,
        value: transaction.value,
        from: transaction.from as `0x${string}`,
        gas: transaction.gas ?? undefined,
        description: transaction.description,
      })),
    };
  }
  if (action.type === "external_transaction") {
    const transaction = action.transactions[0];
    return {
      id: action.id,
      chainFamily: "svm",
      kind: "transaction",
      status: action.status,
      cluster: action.cluster,
      description: action.description,
      transaction: {
        transaction: transaction?.unsignedTransactionBase64 ?? "",
        encoding: "base64",
        cluster: action.cluster,
        feePayer: action.signer,
      },
    };
  }
  return {
    id: action.id,
    chainFamily: action.chainFamily,
    kind: "signing",
    status: action.status,
    description: action.description,
    signer: action.signer,
    chainId: action.chainId ?? undefined,
    cluster: action.cluster ?? undefined,
  };
}

function actionSimulation(action: AgentAction): PipelineSimulation | undefined {
  if (action.type !== "external_transaction" || action.chainFamily !== "evm") {
    return undefined;
  }
  const simulations = action.transactions.flatMap((transaction) =>
    transaction.simulation ? [transaction.simulation] : [],
  );
  if (simulations.length === 0) return undefined;
  const warnings = simulations.flatMap((simulation) =>
    simulation.error ? [simulation.error] : [],
  );
  return {
    status: simulations.every((simulation) => simulation.success)
      ? "passed"
      : "failed",
    balanceChanges: [],
    fees: [],
    warnings,
    gas: {
      estimates: simulations.map((simulation) => simulation.gasUsed),
    },
  };
}

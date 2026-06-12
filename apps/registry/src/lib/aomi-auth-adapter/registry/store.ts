import { walletDebug } from "../wallet-debug";
import { planCommands } from "./commands";
import { loadPersisted, savePersisted } from "./persistence";
import { createInitialState, reduce } from "./reducer";
import type {
  RegistryCommand,
  RegistryEvent,
  WalletRegistryState,
} from "./types";
import { AUTH_FLOW_RECONNECT_SETTLE_MS, SETTLE_QUIET_MS } from "./types";

export type CommandExecutors = {
  wagmiReconnect(): Promise<void>;
  wagmiConnect(stableId: string): Promise<void>;
  wagmiDisconnect(uid: string): Promise<void>;
  paraLogout(): Promise<void>;
};

export class WalletRegistryStore {
  private state: WalletRegistryState;
  private readonly subscribers = new Set<() => void>();
  private readonly executors: CommandExecutors;
  private readonly storageKey: string;

  constructor(opts: {
    executors: CommandExecutors;
    storageKey: string;
    initialNow: number;
  }) {
    this.executors = opts.executors;
    this.storageKey = opts.storageKey;
    this.state = reduce(createInitialState(), {
      type: "boot/init",
      persisted: loadPersisted(opts.storageKey, { migrateDestructively: true }),
      now: opts.initialNow,
    });
  }

  getSnapshot(): WalletRegistryState {
    return this.state;
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  dispatch(event: RegistryEvent): void {
    const prev = this.state;
    const next = reduce(prev, event);
    if (next === prev) return;

    this.state = next;
    for (const subscriber of this.subscribers) subscriber();

    const commands = planCommands(prev, next, event);
    for (const command of commands) {
      this.executeCommand(command);
    }
  }

  private executeCommand(command: RegistryCommand): void {
    switch (command.kind) {
      case "persist":
        savePersisted(this.state, this.storageKey);
        break;
      case "debug":
        walletDebug(command.event, command.data);
        break;
      case "wagmi/reconnect":
        this.runAsync(command.kind, async () => {
          try {
            await this.executors.wagmiReconnect();
          } finally {
            this.scheduleSettledPass();
          }
        });
        break;
      case "wagmi/connect":
        this.runAsync(command.kind, () =>
          this.executors.wagmiConnect(command.stableId),
        );
        break;
      case "wagmi/disconnect":
        this.runAsync(command.kind, () =>
          this.executors.wagmiDisconnect(command.uid),
        );
        break;
      case "para/logout":
        this.runAsync(command.kind, () => this.executors.paraLogout());
        break;
      default:
        break;
    }
  }

  private runAsync(kind: RegistryCommand["kind"], fn: () => Promise<void>): void {
    void fn().catch((error: unknown) => {
      walletDebug("registry:command-error", {
        kind,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  private reconnectSettleDelayMs(): number {
    const authFlowSuppressed =
      this.state.heal.suppressedUntil !== null &&
      Date.now() < this.state.heal.suppressedUntil &&
      (this.state.heal.suppressionReason === "para-social-login" ||
        this.state.heal.suppressionReason === "para-auth-modal" ||
        this.state.heal.suppressionReason === "para-evm-connect-fallback" ||
        this.state.heal.suppressionReason === "para-account-modal");
    return authFlowSuppressed
      ? AUTH_FLOW_RECONNECT_SETTLE_MS
      : SETTLE_QUIET_MS;
  }

  private scheduleSettledPass(): void {
    const run = () => {
      this.dispatch({ type: "wagmi/settled", now: Date.now() });
    };
    if (typeof window === "undefined") {
      queueMicrotask(run);
      return;
    }
    window.setTimeout(run, this.reconnectSettleDelayMs());
  }
}

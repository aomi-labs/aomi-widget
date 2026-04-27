import type { WalletEip712Payload, WalletTxPayload } from "../../wallet-utils";
import { CliSession } from "../cli-session";
import {
  DIM,
  RESET,
  YELLOW,
  getMessageToolResults,
  getToolNameFromEvent,
  getToolResultFromEvent,
  isAlwaysVisibleTool,
  printNewAgentMessages,
  printToolComplete,
  printToolResultLine,
  printToolUpdate,
  toToolResultKey,
} from "../output";
import {
  applyRequestedModelIfPresent,
  ingestSecretsForSession,
} from "../context";
import { fatal } from "../errors";
import type { CliConfig } from "../types";
import { buildCliUserState } from "../user-state";

type WalletSnapshot = {
  publicKey?: string;
  chainId?: number;
};

function normalizeAddress(address: string | undefined): string | undefined {
  return address?.toLowerCase();
}

function extractMentionedTxIds(content: string | undefined): string[] {
  if (!content) return [];
  const matches = content.match(/\btx-\d+\b/gi) ?? [];
  return Array.from(new Set(matches.map((id) => id.toLowerCase()))).sort();
}

export function shouldBroadcastWalletStateChange(
  config: CliConfig,
  previous: WalletSnapshot | null,
  next: WalletSnapshot,
): boolean {
  if (!config.privateKey || !next.publicKey) {
    return false;
  }

  return (
    normalizeAddress(previous?.publicKey) !== normalizeAddress(next.publicKey) ||
    previous?.chainId !== next.chainId
  );
}

export async function syncWalletStateForChat(
  config: CliConfig,
  previous: WalletSnapshot | null,
  next: WalletSnapshot,
  cli: CliSession,
  session: {
    resolveUserState: (userState: ReturnType<typeof buildCliUserState>) => void;
    syncUserState: () => Promise<unknown>;
    client: { sendSystemMessage: (sessionId: string, message: string) => Promise<unknown> };
  },
): Promise<void> {
  if (!shouldBroadcastWalletStateChange(config, previous, next) || !next.publicKey) {
    return;
  }

  session.resolveUserState(buildCliUserState(next.publicKey, next.chainId));
  await session.syncUserState();

  const payload: Record<string, unknown> = {
    address: next.publicKey,
    isConnected: true,
  };
  if (next.chainId !== undefined) {
    payload.chainId = next.chainId;
  }

  await session.client.sendSystemMessage(
    cli.sessionId,
    JSON.stringify({
      type: "wallet:state_changed",
      payload,
    }),
  );
}

export async function chatCommand(config: CliConfig, message: string, verbose: boolean): Promise<void> {
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }

  const previousCli = config.freshSession ? null : CliSession.load();
  const previousWallet = previousCli
    ? {
        publicKey: previousCli.publicKey,
        chainId: previousCli.chainId,
      }
    : null;
  const cli = CliSession.loadOrCreate(config);
  const session = cli.createClientSession();

  try {
    await ingestSecretsForSession(config, cli, session.client);
    await applyRequestedModelIfPresent(config, cli, session);
    await syncWalletStateForChat(
      config,
      previousWallet,
      {
        publicKey: cli.publicKey,
        chainId: cli.chainId,
      },
      cli,
      session,
    );

    const previousPendingIds = new Set(cli.pendingTxs.map((tx) => tx.id));
    let printedAgentCount = 0;
    const seenToolResults = new Set<string>();

    session.on("tool_complete", (event) => {
      const name = getToolNameFromEvent(event);
      const result = getToolResultFromEvent(event);
      const key = toToolResultKey(name, result);
      seenToolResults.add(key);

      if (verbose || isAlwaysVisibleTool(name)) {
        printToolComplete(event);
      }
    });

    session.on("tool_update", (event) => {
      if (verbose) {
        printToolUpdate(event);
      }
    });

    if (verbose) {
      session.on("processing_start", () => {
        console.log(`${DIM}⏳ Processing…${RESET}`);
      });
      session.on("system_notice", ({ message: msg }) => {
        console.log(`${YELLOW}📢 ${msg}${RESET}`);
      });
      session.on("system_error", ({ message: msg }) => {
        console.log(`\x1b[31m❌ ${msg}${RESET}`);
      });
    }

    await session.sendAsync(message);

    const allMessages = session.getMessages();
    let seedIdx = allMessages.length;
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i].sender === "user") {
        seedIdx = i;
        break;
      }
    }

    printedAgentCount = allMessages.slice(0, seedIdx).filter(
      (entry) => entry.sender === "agent" || entry.sender === "assistant",
    ).length;

    if (verbose) {
      printedAgentCount = printNewAgentMessages(
        allMessages,
        printedAgentCount,
      );
      session.on("messages", (messages) => {
        printedAgentCount = printNewAgentMessages(messages, printedAgentCount);
      });
    }

    if (session.getIsProcessing()) {
      await new Promise<void>((resolve) => {
        // Wait for the backend to finish its turn so ALL system events
        // (including every wallet request) have been delivered.
        // `backend_idle` fires when is_processing goes false, even if
        // there are unresolved local wallet requests.
        // `processing_end` fires when both backend is idle AND there
        // are no local wallet requests (e.g. pure-text response).
        session.on("backend_idle", () => resolve());
        session.on("processing_end", () => resolve());
      });
    }

    const messageToolResults = getMessageToolResults(
      session.getMessages(),
      seedIdx + 1,
    );

    if (verbose) {
      for (const tool of messageToolResults) {
        const key = toToolResultKey(tool.name, tool.result);
        if (seenToolResults.has(key)) {
          continue;
        }
        printToolResultLine(tool.name, tool.result);
      }
    } else {
      for (const tool of messageToolResults) {
        const key = toToolResultKey(tool.name, tool.result);
        if (seenToolResults.has(key)) {
          continue;
        }
        if (isAlwaysVisibleTool(tool.name)) {
          printToolResultLine(tool.name, tool.result);
        }
      }
    }

    if (verbose) {
      printedAgentCount = printNewAgentMessages(
        session.getMessages(),
        printedAgentCount,
      );
      console.log(`${DIM}✅ Done${RESET}`);
    }

    const authoritativePendingTxs = cli.syncPendingFromUserState(
      session.getUserState(),
    );
    const newPendingTxs = authoritativePendingTxs.filter(
      (tx) => !previousPendingIds.has(tx.id),
    );

    for (const pending of newPendingTxs) {
      console.log(`⚡ Wallet request queued: ${pending.id}`);
      if (pending.kind === "transaction") {
        const payload = pending.payload as WalletTxPayload;
        console.log(`   to:    ${payload.to}`);
        if (payload.value) console.log(`   value: ${payload.value}`);
        if (payload.chainId) console.log(`   chain: ${payload.chainId}`);
      } else {
        const payload = pending.payload as WalletEip712Payload;
        if (payload.description) {
          console.log(`   desc:  ${payload.description}`);
        }
      }
    }

    if (!verbose) {
      const agentMessages = session.getMessages().filter(
        (entry) => entry.sender === "agent" || entry.sender === "assistant",
      );
      const last = agentMessages[agentMessages.length - 1];

      if (last?.content) {
        console.log(last.content);
      } else if (newPendingTxs.length === 0) {
        console.log("(no response)");
      }

      if (newPendingTxs.length === 0) {
        const mentionedTxIds = extractMentionedTxIds(last?.content);
        if (mentionedTxIds.length > 0) {
          console.log(
            `\n${YELLOW}⚠️ Assistant referenced ${mentionedTxIds.join(", ")}, but backend returned no pending wallet requests.${RESET}`,
          );
          console.log("   These IDs are not signable from this session.");
        }
      }
    }

    if (newPendingTxs.length > 0) {
      console.log(
        "\nRun `aomi tx list` to see pending transactions, `aomi tx sign <id>` to sign.",
      );
    }
  } finally {
    session.close();
  }
}

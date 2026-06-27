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
import type { UserStateAAMode } from "../../user-state";
import { parseSolanaKeypairSecret } from "../solana-signer";

type WalletSnapshot = {
  publicKey?: string;
  chainId?: number;
  aaMode?: UserStateAAMode | null;
  smartAccount?: string | null;
  svmAddress?: string;
};

function normalizeAddress(address: string | undefined): string | undefined {
  return address?.toLowerCase();
}

function extractMentionedTxIds(content: string | undefined): string[] {
  if (!content) return [];
  const matches = content.match(/\btx-\d+\b/gi) ?? [];
  return Array.from(new Set(matches.map((id) => id.toLowerCase()))).sort();
}

/**
 * Derive the Solana public key from a keypair secret string if provided.
 * Returns undefined on any parse failure (non-fatal — just omits svm.address).
 */
function deriveSvmAddress(
  solanaPrivateKey: string | undefined,
): string | undefined {
  if (!solanaPrivateKey) return undefined;
  try {
    return parseSolanaKeypairSecret(solanaPrivateKey).publicKey.toBase58();
  } catch {
    return undefined;
  }
}

export function shouldBroadcastWalletStateChange(
  config: CliConfig,
  previous: WalletSnapshot | null,
  next: WalletSnapshot,
): boolean {
  // SVM: always sync when a Solana address is present (previous is forced to
  // undefined so this always fires for Solana-keyed sessions).
  if (next.svmAddress) {
    return previous?.svmAddress !== next.svmAddress;
  }

  // EVM: sync when publicKey and chainId are known. Don't require privateKey —
  // wallet state needs to be broadcast even for read-only sessions so the
  // backend's tools (commit_message etc.) can see the connected wallet.
  // The privateKey is only needed at sign time (via `aomi tx sign`).
  if (!next.publicKey || next.chainId === undefined) {
    return false;
  }

  return (
    normalizeAddress(previous?.publicKey) !==
      normalizeAddress(next.publicKey) ||
    previous?.chainId !== next.chainId ||
    previous?.aaMode !== next.aaMode ||
    normalizeAddress(previous?.smartAccount ?? undefined) !==
      normalizeAddress(next.smartAccount ?? undefined)
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
    client: {
      sendSystemMessage: (
        sessionId: string,
        message: string,
        options?: { app?: string },
      ) => Promise<unknown>;
    };
  },
): Promise<void> {
  if (
    !shouldBroadcastWalletStateChange(config, previous, next) ||
    !next.publicKey
  ) {
    return;
  }

  // Build the canonical nested UserState payload — this is the structure the
  // Rust backend's UserStateWire deserializer understands.  The flat format
  // ({ address, isConnected, chainId }) is NOT parsed by the backend and
  // would silently overwrite the correctly-set user state with an empty one.
  const userState = buildCliUserState(next.publicKey, next.chainId, {
    app: config.app,
    aaMode: next.aaMode ?? null,
    smartAccount: next.smartAccount ?? null,
    svmAddress: next.svmAddress,
    svmCluster: config.svmCluster,
  });

  session.resolveUserState(userState);
  await session.syncUserState();

  await session.client.sendSystemMessage(
    cli.sessionId,
    JSON.stringify({
      type: "wallet:state_changed",
      payload: userState,
    }),
    { app: config.app },
  );
}

export async function chatCommand(
  config: CliConfig,
  message: string,
  verbose: boolean,
  options?: { authorizedWalletRef?: string },
): Promise<void> {
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }

  const previousCli = config.freshSession ? null : CliSession.load();
  const previousWallet = previousCli
    ? {
        publicKey: previousCli.publicKey,
        chainId: previousCli.chainId,
        aaMode: previousCli.toState().aaMode ?? null,
        smartAccount: previousCli.toState().smartAccount ?? null,
        svmAddress: undefined, // force re-sync of SVM state on every chat
      }
    : null;
  const cli = CliSession.loadOrCreate(config);
  const session = cli.createClientSession(config);
  const authorizedWalletRef =
    options?.authorizedWalletRef?.trim() || cli.operatingWalletRef();

  // Resolve Solana address after session is created/loaded so we pick up the
  // key persisted by `wallet set --solana` even for `--new-session` flows
  // (the key is seeded from the previous session into the new one in create()).
  const resolvedSolanaKey = cli.resolvedSvmPrivateKey(config.solanaPrivateKey);
  const svmAddress = deriveSvmAddress(resolvedSolanaKey) ?? cli.svmPublicKey;

  try {
    await ingestSecretsForSession(config, cli, session.client);
    await applyRequestedModelIfPresent(config, cli, session);
    await syncWalletStateForChat(
      config,
      previousWallet,
      {
        publicKey: cli.publicKey,
        chainId: cli.chainId,
        aaMode: cli.toState().aaMode ?? null,
        smartAccount: cli.toState().smartAccount ?? null,
        svmAddress,
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

    await session.sendAsync(message, { authorizedWalletRef });

    const allMessages = session.getMessages();
    let seedIdx = allMessages.length;
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i].sender === "user") {
        seedIdx = i;
        break;
      }
    }

    printedAgentCount = allMessages
      .slice(0, seedIdx)
      .filter(
        (entry) => entry.sender === "agent" || entry.sender === "assistant",
      ).length;

    if (verbose) {
      printedAgentCount = printNewAgentMessages(allMessages, printedAgentCount);
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

    const syncedPending = cli.syncPendingFromUserState(session.getUserState());
    const newPendingTxs = [
      ...syncedPending.pendingTxs,
      ...syncedPending.pendingSolTxs,
    ].filter((tx) => !previousPendingIds.has(tx.id));

    for (const pending of newPendingTxs) {
      console.log(`⚡ Wallet request queued: ${pending.id}`);
      if ("kind" in pending && pending.kind === "transaction") {
        const payload = pending.payload as WalletTxPayload;
        console.log(`   to:    ${payload.to}`);
        if (payload.value) console.log(`   value: ${payload.value}`);
        if (payload.chainId) console.log(`   chain: ${payload.chainId}`);
      } else if ("kind" in pending && pending.kind === "eip712_sign") {
        const payload = pending.payload as WalletEip712Payload;
        if (payload.description) {
          console.log(`   desc:  ${payload.description}`);
        }
        if (payload.non_typed_data) {
          console.log("   type:  erc191");
        }
      }
    }

    if (!verbose) {
      const agentMessages = session
        .getMessages()
        .filter(
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

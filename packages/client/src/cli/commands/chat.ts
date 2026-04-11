import type { WalletRequest } from "../../session";
import type { WalletEip712Payload, WalletTxPayload } from "../../wallet-utils";
import { addPendingTx } from "../state";
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
  getOrCreateSession,
  ingestSecretsIfPresent,
} from "../context";
import { fatal } from "../errors";
import { walletRequestToPendingTx } from "../transactions";
import type { CliConfig } from "../types";
import { buildCliUserState } from "../user-state";

export async function chatCommand(config: CliConfig, message: string, verbose: boolean): Promise<void> {
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }

  const { session, state } = getOrCreateSession(config, {
    fresh: config.freshSession,
  });

  try {
    await ingestSecretsIfPresent(config, state, session.client);
    await applyRequestedModelIfPresent(config, session, state);

    session.resolveUserState(buildCliUserState(state.publicKey, state.chainId));

    const capturedRequests: WalletRequest[] = [];
    let printedAgentCount = 0;
    const seenToolResults = new Set<string>();

    session.on("wallet_tx_request", (request) => capturedRequests.push(request));
    session.on("wallet_eip712_request", (request) =>
      capturedRequests.push(request),
    );

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

    for (const request of capturedRequests) {
      const pending = addPendingTx(state, walletRequestToPendingTx(request));
      if (!pending) {
        console.log("⚠️  Duplicate wallet request skipped");
        continue;
      }
      console.log(`⚡ Wallet request queued: ${pending.id}`);
      if (request.kind === "transaction") {
        const payload = request.payload as WalletTxPayload;
        console.log(`   to:    ${payload.to}`);
        if (payload.value) console.log(`   value: ${payload.value}`);
        if (payload.chainId) console.log(`   chain: ${payload.chainId}`);
      } else {
        const payload = request.payload as WalletEip712Payload;
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
      } else if (capturedRequests.length === 0) {
        console.log("(no response)");
      }
    }

    if (capturedRequests.length > 0) {
      console.log(
        "\nRun `aomi tx` to see pending transactions, `aomi sign <id>` to sign.",
      );
    }
  } finally {
    session.close();
  }
}

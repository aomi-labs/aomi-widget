import type { WalletRequest } from "../../session";
import type { WalletEip712Payload, WalletTxPayload } from "../../wallet-utils";
import { addPendingTx } from "../state";
import {
  CYAN,
  DIM,
  GREEN,
  RESET,
  YELLOW,
  printNewAgentMessages,
  printToolComplete,
  printToolUpdate,
} from "../output";
import {
  applyRequestedModelIfPresent,
  getOrCreateSession,
} from "../context";
import { fatal } from "../errors";
import { walletRequestToPendingTx } from "../transactions";
import type { CliRuntime } from "../types";

export async function chatCommand(runtime: CliRuntime): Promise<void> {
  const message = runtime.parsed.positional.join(" ");
  if (!message) {
    fatal("Usage: aomi chat <message>");
  }

  const verbose =
    runtime.parsed.flags["verbose"] === "true" ||
    runtime.parsed.flags["v"] === "true";

  const { session, state } = getOrCreateSession(runtime);

  try {
    await applyRequestedModelIfPresent(runtime, session, state);

    if (state.publicKey) {
      await session.client.sendSystemMessage(
        session.sessionId,
        JSON.stringify({
          type: "wallet:state_changed",
          payload: {
            address: state.publicKey,
            chainId: 1,
            isConnected: true,
          },
        }),
      );
    }

    const capturedRequests: WalletRequest[] = [];
    let printedAgentCount = 0;

    session.on("wallet_tx_request", (request) => capturedRequests.push(request));
    session.on("wallet_eip712_request", (request) =>
      capturedRequests.push(request),
    );

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
      if (session.getIsProcessing()) {
        console.log(`${DIM}⏳ Processing…${RESET}`);
      }
      printedAgentCount = printNewAgentMessages(
        allMessages,
        printedAgentCount,
      );

      session.on("tool_update", (event) => printToolUpdate(event));
      session.on("tool_complete", (event) => printToolComplete(event));
      session.on("messages", (messages) => {
        printedAgentCount = printNewAgentMessages(messages, printedAgentCount);
      });
      session.on("system_notice", ({ message: msg }) => {
        console.log(`${YELLOW}📢 ${msg}${RESET}`);
      });
      session.on("system_error", ({ message: msg }) => {
        console.log(`\x1b[31m❌ ${msg}${RESET}`);
      });
    }

    if (session.getIsProcessing()) {
      await new Promise<void>((resolve) => {
        const checkWallet = () => {
          if (capturedRequests.length > 0) resolve();
        };
        session.on("wallet_tx_request", checkWallet);
        session.on("wallet_eip712_request", checkWallet);
        session.on("processing_end", () => resolve());
      });
    }

    if (verbose) {
      printNewAgentMessages(session.getMessages(), printedAgentCount);
      console.log(`${DIM}✅ Done${RESET}`);
    }

    for (const request of capturedRequests) {
      const pending = addPendingTx(state, walletRequestToPendingTx(request));
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

import { getOrCreateSession } from "../context";
import type { AomiMessage } from "../../types";
import {
  CYAN,
  DIM,
  GREEN,
  RESET,
  YELLOW,
  formatLogContent,
  formatToolResultPreview,
  printDataFileLocation,
} from "../output";
import { clearState, readState } from "../state";
import {
  estimateTokenCount,
  printKeyValueTable,
  printTransactionTable,
} from "../tables";
import type { CliConfig } from "../types";

export async function logCommand(config: CliConfig): Promise<void> {
  if (!readState()) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }

  const { session, state } = getOrCreateSession(config);

  try {
    const apiState = await session.client.fetchState(state.sessionId, undefined, state.clientId);
    const messages = apiState.messages ?? [];
    const pendingTxs = state.pendingTxs ?? [];
    const signedTxs = state.signedTxs ?? [];
    const toolCalls = messages.filter((msg) => Boolean(msg.tool_result)).length;
    const tokenCountEstimate = estimateTokenCount(messages);
    const topic = apiState.title ?? "Untitled Session";

    if (messages.length === 0) {
      console.log("No messages in this session.");
      printDataFileLocation();
      return;
    }

    console.log(`------ Session id: ${state.sessionId} ------`);
    printKeyValueTable([
      ["topic", topic],
      ["msg count", String(messages.length)],
      ["token count", `${tokenCountEstimate} (estimated)`],
      ["tool calls", String(toolCalls)],
      [
        "transactions",
        `${pendingTxs.length + signedTxs.length} (${pendingTxs.length} pending, ${signedTxs.length} signed)`,
      ],
    ]);

    console.log("Transactions metadata (JSON):");
    printTransactionTable(pendingTxs, signedTxs);

    console.log("-------------------- Messages --------------------");
    for (const msg of messages) {
      const content = formatLogContent(msg.content);
      let time = "";
      if (msg.timestamp) {
        const raw = msg.timestamp;
        const numeric = /^\d+$/.test(raw) ? parseInt(raw, 10) : NaN;
        const date = !Number.isNaN(numeric)
          ? new Date(numeric < 1e12 ? numeric * 1000 : numeric)
          : new Date(raw);
        time = Number.isNaN(date.getTime())
          ? ""
          : `${DIM}${date.toLocaleTimeString()}${RESET} `;
      }

      const sender = msg.sender ?? "unknown";
      if (sender === "user") {
        if (content) {
          console.log(`${time}${CYAN}👤 You:${RESET} ${content}`);
        }
      } else if (sender === "agent" || sender === "assistant") {
        if (msg.tool_result) {
          const [toolName, result] = msg.tool_result;
          console.log(
            `${time}${GREEN}🔧 [${toolName}]${RESET} ${formatToolResultPreview(result)}`,
          );
        }
        if (content) {
          console.log(`${time}${CYAN}🤖 Agent:${RESET} ${content}`);
        }
      } else if (sender === "system") {
        if (
          content &&
          !content.startsWith("Response of system endpoint:")
        ) {
          console.log(`${time}${YELLOW}⚙️  System:${RESET} ${content}`);
        }
      } else {
        if (content) {
          console.log(`${time}${DIM}[${sender}]${RESET} ${content}`);
        }
      }
    }

    console.log(`\n${DIM}— ${messages.length} messages —${RESET}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export function closeCommand(config: CliConfig): void {
  if (readState()) {
    const { session } = getOrCreateSession(config);
    session.close();
  }
  clearState();
  console.log("Session closed");
}

import { getOrCreateSession } from "../context";
import { CYAN, DIM, GREEN, RESET, YELLOW, printDataFileLocation } from "../output";
import { clearState, readState } from "../state";
import type { CliRuntime } from "../types";

export async function logCommand(runtime: CliRuntime): Promise<void> {
  if (!readState()) {
    console.log("No active session");
    printDataFileLocation();
    return;
  }

  const { session, state } = getOrCreateSession(runtime);

  try {
    const apiState = await session.client.fetchState(state.sessionId);
    const messages = apiState.messages ?? [];

    if (messages.length === 0) {
      console.log("No messages in this session.");
      printDataFileLocation();
      return;
    }

    for (const msg of messages) {
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
        console.log(`${time}${CYAN}👤 You:${RESET} ${msg.content ?? ""}`);
      } else if (sender === "agent" || sender === "assistant") {
        if (msg.tool_result) {
          const [toolName, result] = msg.tool_result;
          console.log(
            `${time}${GREEN}🔧 [${toolName}]${RESET} ${result.slice(0, 200)}${result.length > 200 ? "…" : ""}`,
          );
        }
        if (msg.content) {
          console.log(`${time}${CYAN}🤖 Agent:${RESET} ${msg.content}`);
        }
      } else if (sender === "system") {
        console.log(`${time}${YELLOW}⚙️  System:${RESET} ${msg.content ?? ""}`);
      } else {
        console.log(`${time}${DIM}[${sender}]${RESET} ${msg.content ?? ""}`);
      }
    }

    console.log(`\n${DIM}— ${messages.length} messages —${RESET}`);
    printDataFileLocation();
  } finally {
    session.close();
  }
}

export function closeCommand(runtime: CliRuntime): void {
  if (readState()) {
    const { session } = getOrCreateSession(runtime);
    session.close();
  }
  clearState();
  console.log("Session closed");
}

import type { AomiMessage, AomiSSEEvent } from "../types";
import { STATE_FILE } from "./state";

export const DIM = "\x1b[2m";
export const CYAN = "\x1b[36m";
export const YELLOW = "\x1b[33m";
export const GREEN = "\x1b[32m";
export const RESET = "\x1b[0m";

export function printDataFileLocation(): void {
  console.log(`Data stored at ${STATE_FILE} 📝`);
}

export function printToolUpdate(event: AomiSSEEvent): void {
  const name =
    (event.tool_name as string | undefined) ??
    (event.name as string | undefined) ??
    "unknown";
  const status = (event.status as string | undefined) ?? "running";
  console.log(`${DIM}🔧 [tool] ${name}: ${status}${RESET}`);
}

export function printToolComplete(event: AomiSSEEvent): void {
  const name =
    (event.tool_name as string | undefined) ??
    (event.name as string | undefined) ??
    "unknown";
  const result =
    (event.result as string | undefined) ??
    (event.output as string | undefined);
  const line = result
    ? `${GREEN}✔ [tool] ${name} → ${result.slice(0, 120)}${result.length > 120 ? "…" : ""}${RESET}`
    : `${GREEN}✔ [tool] ${name} done${RESET}`;
  console.log(line);
}

export function printNewAgentMessages(
  messages: AomiMessage[],
  lastPrintedCount: number,
): number {
  const agentMessages = messages.filter(
    (message) => message.sender === "agent" || message.sender === "assistant",
  );

  let handled = lastPrintedCount;
  for (let i = lastPrintedCount; i < agentMessages.length; i++) {
    const message = agentMessages[i];
    if (message.is_streaming) {
      break;
    }
    if (message.content) {
      console.log(`${CYAN}🤖 ${message.content}${RESET}`);
    }
    handled = i + 1;
  }

  return handled;
}

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
  const name = getToolNameFromEvent(event);
  const status = (event.status as string | undefined) ?? "running";
  console.log(`${DIM}🔧 [tool] ${name}: ${status}${RESET}`);
}

export function printToolComplete(event: AomiSSEEvent): void {
  const name = getToolNameFromEvent(event);
  const result = getToolResultFromEvent(event);
  const line = formatToolResultLine(name, result);
  console.log(line);
}

export function printToolResultLine(name: string, result?: string): void {
  console.log(formatToolResultLine(name, result));
}

export function getToolNameFromEvent(event: AomiSSEEvent): string {
  return (
    (event.tool_name as string | undefined) ??
    (event.name as string | undefined) ??
    "unknown"
  );
}

export function getToolResultFromEvent(event: AomiSSEEvent): string | undefined {
  return (
    (event.result as string | undefined) ??
    (event.output as string | undefined)
  );
}

export function toToolResultKey(name: string, result?: string): string {
  return `${name}\n${result ?? ""}`;
}

export function getMessageToolResults(
  messages: AomiMessage[],
  startAt = 0,
): Array<{ name: string; result: string }> {
  const results: Array<{ name: string; result: string }> = [];
  for (let i = startAt; i < messages.length; i++) {
    const toolResult = messages[i].tool_result;
    if (!toolResult) {
      continue;
    }
    const [name, result] = toolResult;
    if (!name || typeof result !== "string") {
      continue;
    }
    results.push({ name, result });
  }
  return results;
}

export function isAlwaysVisibleTool(name: string): boolean {
  const normalized = name.toLowerCase();
  if (
    normalized.includes("encode_and_simulate") ||
    normalized.includes("encode-and-simulate") ||
    normalized.includes("encode_and_view") ||
    normalized.includes("encode-and-view")
  ) {
    return true;
  }
  if (normalized.startsWith("simulate ")) {
    return true;
  }
  return false;
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

export function formatLogContent(content?: string | null): string | null {
  if (!content) return null;
  const trimmed = content.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function formatToolResultPreview(
  result: string,
  maxLength = 200,
): string {
  const normalized = result.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}…`;
}

function formatToolResultLine(name: string, result?: string): string {
  if (!result) {
    return `${GREEN}✔ [tool] ${name} done${RESET}`;
  }
  return `${GREEN}✔ [tool] ${name} → ${formatToolResultPreview(result, 120)}${RESET}`;
}

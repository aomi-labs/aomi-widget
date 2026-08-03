import type {
  AomiMessage,
  AomiSSEEvent,
  AomiTaskActivityEvent,
  AomiTaskCompletedEvent,
  AomiTaskStartedEvent,
} from "../types";
import type { CliPaymentEvent } from "./payment";
import { STATE_ROOT_DIR, getActiveStateFilePath } from "./state";

export const DIM = "\x1b[2m";
export const CYAN = "\x1b[36m";
export const YELLOW = "\x1b[33m";
export const GREEN = "\x1b[32m";
export const RESET = "\x1b[0m";

export function printDataFileLocation(options?: { verbose?: boolean }): void {
  if (options?.verbose !== true) {
    return;
  }
  const activeFile = getActiveStateFilePath();
  if (activeFile) {
    console.log(`Data stored at ${activeFile} 📝`);
    return;
  }
  console.log(`Data stored under ${STATE_ROOT_DIR} 📝`);
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
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

// ---------------------------------------------------------------------------
// Orchestrator delegation lines (verbose mode only — see chat command)
// ---------------------------------------------------------------------------

const TASK_LINE_MAX = 100;

export function printTaskStarted(event: AomiTaskStartedEvent): void {
  const label = event.label || event.agent_id;
  console.log(`${CYAN}◆ [agent] ${label} started${RESET}`);
}

export function printTaskActivity(event: AomiTaskActivityEvent): void {
  console.log(`${DIM}  ↳ ${formatTaskActivity(event)}${RESET}`);
}

export function printTaskCompleted(
  event: AomiTaskCompletedEvent,
  label?: string,
): void {
  const color = event.status === "completed" ? GREEN : "\x1b[31m";
  const mark = event.status === "completed" ? "✔" : "✖";
  console.log(
    `${color}  ${mark} ${label || event.agent_id}: ${event.status} (${formatTaskCompletionStats(event)})${RESET}`,
  );
}

/** `tool_call` → tool name, `note` → note text. Truncated for one-line output. */
export function formatTaskActivity(event: AomiTaskActivityEvent): string {
  const raw =
    event.kind === "note"
      ? (event.text ?? "")
      : (event.tool_name ?? "unknown tool");
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (normalized.length <= TASK_LINE_MAX) return normalized;
  return `${normalized.slice(0, TASK_LINE_MAX)}…`;
}

export function formatTaskCompletionStats(
  event: AomiTaskCompletedEvent,
): string {
  const steps = event.steps ?? 0;
  const seconds = ((event.duration_ms ?? 0) / 1000).toFixed(1);
  return `${steps} ${steps === 1 ? "step" : "steps"}, ${seconds}s`;
}

export function printToolResultLine(name: string, result?: string): void {
  console.log(formatToolResultLine(name, result));
}

export function printPaymentEvent(event: CliPaymentEvent): void {
  switch (event.type) {
    case "required": {
      const requirement = event.requirement;
      const details = [
        requirement?.amount ? `amount ${requirement.amount}` : undefined,
        requirement?.network,
        requirement?.payTo ? `beneficiary ${requirement.payTo}` : undefined,
      ]
        .filter(Boolean)
        .join(" · ");
      console.log(
        `${YELLOW}💳 x402 payment required${details ? `: ${details}` : ""}${RESET}`,
      );
      return;
    }
    case "submitting":
      console.log(`${DIM}✍️ Signing and submitting x402 payment…${RESET}`);
      return;
    case "settled":
      console.log(
        `${GREEN}✔ x402 payment settled${event.receiptId ? `: ${event.receiptId}` : ""}${RESET}`,
      );
      return;
    case "rejected":
      console.log(
        `\x1b[31m✖ x402 payment rejected (HTTP ${event.status})${event.reason ? `: ${event.reason}` : ""}${RESET}`,
      );
  }
}

export function getToolNameFromEvent(event: AomiSSEEvent): string {
  return (
    (event.tool_name as string | undefined) ??
    (event.name as string | undefined) ??
    "unknown"
  );
}

export function getToolResultFromEvent(
  event: AomiSSEEvent,
): string | undefined {
  return (
    (event.result as string | undefined) ?? (event.output as string | undefined)
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

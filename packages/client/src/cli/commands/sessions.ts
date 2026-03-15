import { AomiClient } from "../../client";
import type { AomiMessage } from "../../types";
import { fatal } from "../errors";
import {
  CYAN,
  DIM,
  GREEN,
  RESET,
  YELLOW,
  formatLogContent,
  printDataFileLocation,
} from "../output";
import {
  deleteStoredSession,
  listStoredSessions,
  readState,
  setActiveSession,
  type PendingTx,
  type SignedTx,
  type StoredSessionRecord,
} from "../state";
import type { CliRuntime } from "../types";

const MAX_TABLE_VALUE_WIDTH = 72;
const MAX_TX_JSON_WIDTH = 96;
const MAX_TX_ROWS = 8;

function truncateCell(value: string, maxWidth: number): string {
  if (value.length <= maxWidth) return value;
  return `${value.slice(0, maxWidth - 1)}…`;
}

function padRight(value: string, width: number): string {
  return value.padEnd(width, " ");
}

function estimateTokenCount(messages: AomiMessage[]): number {
  let totalChars = 0;
  for (const message of messages) {
    const content = formatLogContent(message.content);
    if (content) {
      totalChars += content.length + 1;
    }
    if (message.tool_result?.[1]) {
      totalChars += message.tool_result[1].length;
    }
  }
  return Math.round(totalChars / 4);
}

function printKeyValueTable(rows: Array<[string, string]>): void {
  const labels = rows.map(([label]) => label);
  const values = rows.map(([, value]) =>
    truncateCell(value, MAX_TABLE_VALUE_WIDTH),
  );

  const keyWidth = Math.max("field".length, ...labels.map((label) => label.length));
  const valueWidth = Math.max("value".length, ...values.map((value) => value.length));
  const border = `+${"-".repeat(keyWidth + 2)}+${"-".repeat(valueWidth + 2)}+`;

  console.log(`${CYAN}${border}${RESET}`);
  console.log(
    `${CYAN}| ${padRight("field", keyWidth)} | ${padRight("value", valueWidth)} |${RESET}`,
  );
  console.log(`${CYAN}${border}${RESET}`);
  for (let i = 0; i < rows.length; i++) {
    console.log(
      `${CYAN}| ${padRight(labels[i], keyWidth)} | ${padRight(values[i], valueWidth)} |${RESET}`,
    );
    console.log(`${CYAN}${border}${RESET}`);
  }
}

function toPendingTxMetadata(tx: PendingTx): Record<string, unknown> {
  return {
    id: tx.id,
    kind: tx.kind,
    to: tx.to ?? null,
    value: tx.value ?? null,
    chainId: tx.chainId ?? null,
    description: tx.description ?? null,
    timestamp: new Date(tx.timestamp).toISOString(),
  };
}

function toSignedTxMetadata(tx: SignedTx): Record<string, unknown> {
  return {
    id: tx.id,
    kind: tx.kind,
    txHash: tx.txHash ?? null,
    signature: tx.signature ?? null,
    from: tx.from ?? null,
    to: tx.to ?? null,
    value: tx.value ?? null,
    chainId: tx.chainId ?? null,
    description: tx.description ?? null,
    timestamp: new Date(tx.timestamp).toISOString(),
  };
}

function printTransactionTable(
  pendingTxs: PendingTx[],
  signedTxs: SignedTx[],
): void {
  const rows = [
    ...pendingTxs.map((tx) => ({
      status: "pending",
      metadata: toPendingTxMetadata(tx),
    })),
    ...signedTxs.map((tx) => ({
      status: "signed",
      metadata: toSignedTxMetadata(tx),
    })),
  ];

  if (rows.length === 0) {
    console.log(`${YELLOW}🪙 No transactions in local CLI state.${RESET}`);
    return;
  }

  const visibleRows = rows.slice(0, MAX_TX_ROWS);
  const statusWidth = Math.max(
    "status".length,
    ...visibleRows.map((row) => row.status.length),
  );
  const jsonCells = visibleRows.map((row) =>
    truncateCell(JSON.stringify(row.metadata), MAX_TX_JSON_WIDTH),
  );
  const jsonWidth = Math.max("metadata_json".length, ...jsonCells.map((v) => v.length));
  const border = `+${"-".repeat(statusWidth + 2)}+${"-".repeat(jsonWidth + 2)}+`;

  console.log(`${GREEN}${border}${RESET}`);
  console.log(
    `${GREEN}| ${padRight("status", statusWidth)} | ${padRight("metadata_json", jsonWidth)} |${RESET}`,
  );
  console.log(`${GREEN}${border}${RESET}`);
  for (let i = 0; i < visibleRows.length; i++) {
    console.log(
      `${GREEN}| ${padRight(visibleRows[i].status, statusWidth)} | ${padRight(jsonCells[i], jsonWidth)} |${RESET}`,
    );
    console.log(`${GREEN}${border}${RESET}`);
  }

  if (rows.length > MAX_TX_ROWS) {
    const omitted = rows.length - MAX_TX_ROWS;
    console.log(`${DIM}${omitted} transaction rows omitted${RESET}`);
  }
}

type RemoteSessionStats = {
  topic: string;
  messageCount: number;
  tokenCountEstimate: number;
  toolCalls: number;
};

async function fetchRemoteSessionStats(
  record: StoredSessionRecord,
): Promise<RemoteSessionStats | null> {
  const client = new AomiClient({
    baseUrl: record.state.baseUrl,
    apiKey: record.state.apiKey,
  });

  try {
    const apiState = await client.fetchState(record.sessionId);
    const messages = apiState.messages ?? [];
    return {
      topic: apiState.title ?? "Untitled Session",
      messageCount: messages.length,
      tokenCountEstimate: estimateTokenCount(messages),
      toolCalls: messages.filter((msg) => Boolean(msg.tool_result)).length,
    };
  } catch {
    return null;
  }
}

function printSessionSummary(
  record: StoredSessionRecord,
  stats: RemoteSessionStats | null,
  isActive: boolean,
): void {
  const pendingTxs = record.state.pendingTxs ?? [];
  const signedTxs = record.state.signedTxs ?? [];
  const header = isActive
    ? `🧵 Session id: ${record.sessionId} (session-${record.localId}, active)`
    : `🧵 Session id: ${record.sessionId} (session-${record.localId})`;

  console.log(`${YELLOW}------ ${header} ------${RESET}`);
  printKeyValueTable([
    ["🧠 topic", stats?.topic ?? "Unavailable (fetch failed)"],
    ["💬 msg count", stats ? String(stats.messageCount) : "n/a"],
    [
      "🧮 token count",
      stats ? `${stats.tokenCountEstimate} (estimated)` : "n/a",
    ],
    ["🛠 tool calls", stats ? String(stats.toolCalls) : "n/a"],
    [
      "💸 transactions",
      `${pendingTxs.length + signedTxs.length} (${pendingTxs.length} pending, ${signedTxs.length} signed)`,
    ],
  ]);

  console.log();
  console.log(`${YELLOW}💾 Transactions metadata (JSON):${RESET}`);
  printTransactionTable(pendingTxs, signedTxs);
}

export async function sessionsCommand(_runtime: CliRuntime): Promise<void> {
  const sessions = listStoredSessions().sort((a, b) => b.updatedAt - a.updatedAt);
  if (sessions.length === 0) {
    console.log("No local sessions.");
    printDataFileLocation();
    return;
  }

  const activeSessionId = readState()?.sessionId;

  for (let i = 0; i < sessions.length; i++) {
    const sessionRecord = sessions[i];
    const stats = await fetchRemoteSessionStats(sessionRecord);
    printSessionSummary(sessionRecord, stats, sessionRecord.sessionId === activeSessionId);
    if (i < sessions.length - 1) {
      console.log();
    }
  }

  printDataFileLocation();
}

export function sessionCommand(runtime: CliRuntime): void {
  const subcommand = runtime.parsed.positional[0];
  const selector = runtime.parsed.positional[1];

  if (subcommand === "resume") {
    if (!selector) {
      fatal("Usage: aomi session resume <session-id|session-N|N>");
    }
    const resumed = setActiveSession(selector);
    if (!resumed) {
      fatal(`No local session found for selector \"${selector}\".`);
    }
    console.log(`Active session set to ${resumed.sessionId} (session-${resumed.localId}).`);
    printDataFileLocation();
    return;
  }

  if (subcommand === "delete") {
    if (!selector) {
      fatal("Usage: aomi session delete <session-id|session-N|N>");
    }
    const deleted = deleteStoredSession(selector);
    if (!deleted) {
      fatal(`No local session found for selector \"${selector}\".`);
    }
    console.log(`Deleted local session ${deleted.sessionId} (session-${deleted.localId}).`);
    const active = readState();
    if (active) {
      console.log(`Active session: ${active.sessionId}`);
    } else {
      console.log("No active session");
    }
    printDataFileLocation();
    return;
  }

  fatal(
    "Usage: aomi session resume <session-id|session-N|N>\n       aomi session delete <session-id|session-N|N>",
  );
}

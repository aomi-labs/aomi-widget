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
import {
  clearState,
  readState,
  type PendingTx,
  type SignedTx,
} from "../state";
import type { CliRuntime } from "../types";

const MAX_TABLE_VALUE_WIDTH = 72;
const MAX_TX_JSON_WIDTH = 96;
const MAX_TX_ROWS = 8;

function truncateCell(value: string, maxWidth: number): string {
  if (value.length <= maxWidth) {
    return value;
  }
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

  console.log(border);
  console.log(`| ${padRight("field", keyWidth)} | ${padRight("value", valueWidth)} |`);
  console.log(border);
  for (let i = 0; i < rows.length; i++) {
    console.log(
      `| ${padRight(labels[i], keyWidth)} | ${padRight(values[i], valueWidth)} |`,
    );
    console.log(border);
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
    console.log("No transactions in local CLI state.");
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

  console.log(border);
  console.log(
    `| ${padRight("status", statusWidth)} | ${padRight("metadata_json", jsonWidth)} |`,
  );
  console.log(border);
  for (let i = 0; i < visibleRows.length; i++) {
    console.log(
      `| ${padRight(visibleRows[i].status, statusWidth)} | ${padRight(jsonCells[i], jsonWidth)} |`,
    );
    console.log(border);
  }

  if (rows.length > MAX_TX_ROWS) {
    const omitted = rows.length - MAX_TX_ROWS;
    console.log(`${DIM}${omitted} transaction rows omitted${RESET}`);
  }
}

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

export function closeCommand(runtime: CliRuntime): void {
  if (readState()) {
    const { session } = getOrCreateSession(runtime);
    session.close();
  }
  clearState();
  console.log("Session closed");
}

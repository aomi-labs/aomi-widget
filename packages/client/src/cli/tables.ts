import type { AomiMessage } from "../types";
import { CYAN, DIM, GREEN, RESET, YELLOW, formatLogContent } from "./output";
import type { PendingTx, SignedTx } from "./state";

export const MAX_TABLE_VALUE_WIDTH = 72;
export const MAX_TX_JSON_WIDTH = 96;
export const MAX_TX_ROWS = 8;

export function truncateCell(value: string, maxWidth: number): string {
  if (value.length <= maxWidth) return value;
  return `${value.slice(0, maxWidth - 1)}…`;
}

export function padRight(value: string, width: number): string {
  return value.padEnd(width, " ");
}

export function estimateTokenCount(messages: AomiMessage[]): number {
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

function toIsoTimestamp(timestamp: unknown): string | null {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return null;
  }

  try {
    return new Date(timestamp).toISOString();
  } catch {
    return null;
  }
}

export function toPendingTxMetadata(tx: PendingTx): Record<string, unknown> {
  return {
    id: tx.id,
    kind: tx.kind,
    txId: tx.txId ?? null,
    eip712Id: tx.eip712Id ?? null,
    to: tx.to ?? null,
    value: tx.value ?? null,
    chainId: tx.chainId ?? null,
    description: tx.description ?? null,
    timestamp: toIsoTimestamp(tx.timestamp),
  };
}

export function toSignedTxMetadata(tx: SignedTx): Record<string, unknown> {
  return {
    id: tx.id,
    kind: tx.kind,
    txHash: tx.txHash ?? null,
    txHashes: tx.txHashes ?? null,
    executionKind: tx.executionKind ?? null,
    aaProvider: tx.aaProvider ?? null,
    aaMode: tx.aaMode ?? null,
    batched: tx.batched ?? null,
    sponsored: tx.sponsored ?? null,
    AAAddress: tx.AAAddress ?? null,
    delegationAddress: tx.delegationAddress ?? null,
    signature: tx.signature ?? null,
    from: tx.from ?? null,
    to: tx.to ?? null,
    value: tx.value ?? null,
    chainId: tx.chainId ?? null,
    description: tx.description ?? null,
    timestamp: toIsoTimestamp(tx.timestamp),
  };
}

export function printKeyValueTable(
  rows: Array<[string, string]>,
  color: string = CYAN,
): void {
  const labels = rows.map(([label]) => label);
  const values = rows.map(([, value]) =>
    truncateCell(value, MAX_TABLE_VALUE_WIDTH),
  );

  const keyWidth = Math.max("field".length, ...labels.map((label) => label.length));
  const valueWidth = Math.max("value".length, ...values.map((value) => value.length));
  const border = `+${"-".repeat(keyWidth + 2)}+${"-".repeat(valueWidth + 2)}+`;

  console.log(`${color}${border}${RESET}`);
  console.log(
    `${color}| ${padRight("field", keyWidth)} | ${padRight("value", valueWidth)} |${RESET}`,
  );
  console.log(`${color}${border}${RESET}`);
  for (let i = 0; i < rows.length; i++) {
    console.log(
      `${color}| ${padRight(labels[i], keyWidth)} | ${padRight(values[i], valueWidth)} |${RESET}`,
    );
    console.log(`${color}${border}${RESET}`);
  }
}

export function printTransactionTable(
  pendingTxs: PendingTx[],
  signedTxs: SignedTx[],
  color: string = GREEN,
): void {
  const safePendingTxs = pendingTxs.filter(
    (tx): tx is PendingTx => typeof tx === "object" && tx !== null,
  );
  const safeSignedTxs = signedTxs.filter(
    (tx): tx is SignedTx => typeof tx === "object" && tx !== null,
  );
  const rows = [
    ...safePendingTxs.map((tx) => ({
      status: "pending",
      metadata: toPendingTxMetadata(tx),
    })),
    ...safeSignedTxs.map((tx) => ({
      status: "signed",
      metadata: toSignedTxMetadata(tx),
    })),
  ];

  if (rows.length === 0) {
    console.log(`${YELLOW}No transactions in local CLI state.${RESET}`);
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

  console.log(`${color}${border}${RESET}`);
  console.log(
    `${color}| ${padRight("status", statusWidth)} | ${padRight("metadata_json", jsonWidth)} |${RESET}`,
  );
  console.log(`${color}${border}${RESET}`);
  for (let i = 0; i < visibleRows.length; i++) {
    console.log(
      `${color}| ${padRight(visibleRows[i].status, statusWidth)} | ${padRight(jsonCells[i], jsonWidth)} |${RESET}`,
    );
    console.log(`${color}${border}${RESET}`);
  }

  if (rows.length > MAX_TX_ROWS) {
    const omitted = rows.length - MAX_TX_ROWS;
    console.log(`${DIM}${omitted} transaction rows omitted${RESET}`);
  }
}

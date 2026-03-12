// =============================================================================
// CLI Session State Persistence
// =============================================================================
//
// Stores session state between CLI invocations in a temp JSON file.
// Each `aomi chat` call reads/writes this file to reuse the same session.
// Wallet transaction requests and signed results are persisted here so
// `aomi tx` can list them and `aomi sign <id>` can pick one up.

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// =============================================================================
// Types
// =============================================================================

export type PendingTx = {
  id: string;
  kind: "transaction" | "eip712_sign";
  to?: string;
  value?: string;
  data?: string;
  chainId?: number;
  description?: string;
  timestamp: number;
  /** Raw payload preserved for signing */
  payload: Record<string, unknown>;
};

export type SignedTx = {
  id: string;
  kind: "transaction" | "eip712_sign";
  /** Transaction hash (for kind: "transaction") */
  txHash?: string;
  /** Signature hex (for kind: "eip712_sign") */
  signature?: string;
  from?: string;
  to?: string;
  value?: string;
  chainId?: number;
  description?: string;
  timestamp: number;
};

export type CliSessionState = {
  sessionId: string;
  baseUrl: string;
  namespace?: string;
  apiKey?: string;
  publicKey?: string;
  pendingTxs?: PendingTx[];
  signedTxs?: SignedTx[];
};

// =============================================================================
// File I/O
// =============================================================================

const STATE_FILE = join(
  process.env.XDG_RUNTIME_DIR ?? tmpdir(),
  "aomi-session.json",
);

export function readState(): CliSessionState | null {
  try {
    if (!existsSync(STATE_FILE)) return null;
    const raw = readFileSync(STATE_FILE, "utf-8");
    return JSON.parse(raw) as CliSessionState;
  } catch {
    return null;
  }
}

export function writeState(state: CliSessionState): void {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function clearState(): void {
  try {
    if (existsSync(STATE_FILE)) unlinkSync(STATE_FILE);
  } catch {
    // Ignore errors on cleanup
  }
}

// =============================================================================
// Transaction Helpers
// =============================================================================

let nextTxId = 1;

export function addPendingTx(
  state: CliSessionState,
  tx: Omit<PendingTx, "id">,
): PendingTx {
  if (!state.pendingTxs) state.pendingTxs = [];

  const pending: PendingTx = {
    ...tx,
    id: `tx-${nextTxId++}`,
  };
  state.pendingTxs.push(pending);
  writeState(state);
  return pending;
}

export function removePendingTx(
  state: CliSessionState,
  id: string,
): PendingTx | null {
  if (!state.pendingTxs) return null;
  const idx = state.pendingTxs.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const [removed] = state.pendingTxs.splice(idx, 1);
  writeState(state);
  return removed;
}

export function addSignedTx(
  state: CliSessionState,
  tx: SignedTx,
): void {
  if (!state.signedTxs) state.signedTxs = [];
  state.signedTxs.push(tx);
  writeState(state);
}

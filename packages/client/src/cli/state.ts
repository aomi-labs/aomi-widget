import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export type PendingTx = {
  id: string;
  kind: "transaction" | "eip712_sign";
  to?: string;
  value?: string;
  data?: string;
  chainId?: number;
  description?: string;
  timestamp: number;
  payload: Record<string, unknown>;
};

export type SignedTx = {
  id: string;
  kind: "transaction" | "eip712_sign";
  txHash?: string;
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
  model?: string;
  apiKey?: string;
  publicKey?: string;
  pendingTxs?: PendingTx[];
  signedTxs?: SignedTx[];
};

export const STATE_FILE = join(
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
    // Ignore errors on cleanup.
  }
}

function getNextTxId(state: CliSessionState): string {
  const allIds = [
    ...(state.pendingTxs ?? []),
    ...(state.signedTxs ?? []),
  ].map((tx) => {
    const match = tx.id.match(/^tx-(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  });
  const max = allIds.length > 0 ? Math.max(...allIds) : 0;
  return `tx-${max + 1}`;
}

export function addPendingTx(
  state: CliSessionState,
  tx: Omit<PendingTx, "id">,
): PendingTx {
  if (!state.pendingTxs) state.pendingTxs = [];

  const pending: PendingTx = {
    ...tx,
    id: getNextTxId(state),
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
  const idx = state.pendingTxs.findIndex((tx) => tx.id === id);
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

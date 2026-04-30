import {
  CLIENT_TYPE_TS_CLI,
  UserState,
} from "../types";
import { getAddress } from "viem";
import type { PendingTx } from "./state";
import { normalizePendingTxData } from "../wallet-utils";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as UnknownRecord;
}

function parsePendingId(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeMaybeAddress(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  try {
    return getAddress(value);
  } catch {
    return value;
  }
}

function pendingDisplayId(id: number): string {
  return `tx-${id}`;
}

function txTimestamp(
  existingById: Map<string, PendingTx>,
  id: string,
  fallbackNow: number,
): number {
  return existingById.get(id)?.timestamp ?? fallbackNow;
}

export function buildCliUserState(
  publicKey?: string,
  chainId?: number,
): UserState {
  const userState: UserState = {};

  if (publicKey !== undefined) {
    userState.address = publicKey;
  }

  if (chainId !== undefined) {
    userState.chain_id = chainId;
  }

  if (publicKey !== undefined && chainId !== undefined) {
    userState.is_connected = true;
  }

  return UserState.withExt(userState, "client_type", CLIENT_TYPE_TS_CLI);
}

export function pendingTxsFromBackendUserState(
  userState: UserState | null | undefined,
  existingPendingTxs: readonly PendingTx[] = [],
): PendingTx[] {
  const normalizedUserState = UserState.normalize(userState);
  if (!normalizedUserState) {
    return [];
  }

  const existingById = new Map(existingPendingTxs.map((tx) => [tx.id, tx]));
  const fallbackNow = Date.now();
  const nextPendingTxs: PendingTx[] = [];

  const pendingTxs = asRecord(normalizedUserState.pending_txs) ?? {};
  for (const [rawId, rawValue] of Object.entries(pendingTxs)) {
    const pendingId = parsePendingId(rawId);
    const tx = asRecord(rawValue);
    if (!pendingId || !tx) {
      continue;
    }

    const id = pendingDisplayId(pendingId);
    const to = normalizeMaybeAddress(tx.to);
    if (!to) {
      continue;
    }

    const data = normalizePendingTxData(tx);
    nextPendingTxs.push({
      id,
      kind: "transaction",
      txId: pendingId,
      to,
      value: parseOptionalString(tx.value),
      data,
      chainId: parseChainId(tx.chain_id),
      description: parseOptionalString(tx.label),
      timestamp: txTimestamp(existingById, id, fallbackNow),
      payload: {
        pending_tx_id: pendingId,
        txId: pendingId,
        to,
        value: parseOptionalString(tx.value),
        data,
        chain_id: parseChainId(tx.chain_id),
        chainId: parseChainId(tx.chain_id),
        description: parseOptionalString(tx.label),
      },
    });
  }

  const pendingEip712s = asRecord(normalizedUserState.pending_eip712s) ?? {};
  for (const [rawId, rawValue] of Object.entries(pendingEip712s)) {
    const pendingId = parsePendingId(rawId);
    const request = asRecord(rawValue);
    if (!pendingId || !request) {
      continue;
    }

    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    nextPendingTxs.push({
      id,
      kind: "eip712_sign",
      eip712Id: pendingId,
      chainId: parseChainId(request.chain_id),
      description,
      timestamp: txTimestamp(existingById, id, fallbackNow),
      payload: {
        pending_eip712_id: pendingId,
        eip712Id: pendingId,
        typed_data: request.typed_data,
        description,
      },
    });
  }

  nextPendingTxs.sort((left, right) => {
    const leftId = left.kind === "transaction" ? left.txId : left.eip712Id;
    const rightId = right.kind === "transaction" ? right.txId : right.eip712Id;
    return (leftId ?? Number.MAX_SAFE_INTEGER) - (rightId ?? Number.MAX_SAFE_INTEGER);
  });

  return nextPendingTxs;
}

export function walletSnapshotFromUserState(
  userState: UserState | null | undefined,
): { publicKey?: string; chainId?: number } {
  const address = UserState.address(userState);
  const isConnected = UserState.isConnected(userState);

  return {
    publicKey: isConnected === false ? undefined : address,
    chainId: UserState.chainId(userState),
  };
}

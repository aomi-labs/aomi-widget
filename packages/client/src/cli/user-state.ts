import {
  CLIENT_TYPE_TS_CLI,
  UserState,
  type UserStateAAMode,
  type UserStateEvm,
  type UserStateEvmAa,
} from "../user-state";
import { getAddress } from "viem";
import type { PendingSolTx, PendingTx } from "./state";
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
  aa?: {
    aaMode?: UserStateAAMode | null;
    smartAccount?: string | null;
  },
): UserState {
  const userState: UserState = {};
  const evm: UserStateEvm = {};

  if (publicKey !== undefined) {
    evm.address = publicKey;
  }

  if (chainId !== undefined) {
    evm.chain_id = chainId;
  }

  // walletKind is derived from evm.aa (smart_account === address), so we only
  // record the AA mode + executor here rather than an explicit kind field.
  if (aa?.aaMode === "4337" || aa?.aaMode === "7702") {
    const aaState: UserStateEvmAa = { mode: aa.aaMode };
    if (aa.smartAccount != null) {
      aaState.smart_account = aa.smartAccount;
    }
    evm.aa = aaState;
  } else if (aa?.aaMode === null) {
    evm.aa = { mode: "none" };
  }

  if (Object.keys(evm).length > 0) {
    userState.evm = evm;
  }

  if (publicKey !== undefined && chainId !== undefined) {
    userState.connection = { is_connected: true };
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

  const pending = asRecord(normalizedUserState.pending) ?? {};
  const pendingTxs = asRecord(pending.evm_txs) ?? {};
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

  const pendingEip712s = asRecord(pending.evm_sigs) ?? {};
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

/**
 * Rebuild the local Solana pending list from the backend's authoritative
 * `pending.svm_ixs` bucket. Mirrors [`pendingTxsFromBackendUserState`] but
 * for the Solana domain only — kept in its own function so the caller's
 * EVM/EIP-712 state and Solana state stay in separate arrays rather than
 * a discriminated union.
 *
 * SEMANTIC GAP: the backend moved Solana from a full-tx signing model
 * (`unsigned_tx`) to an instruction-staging model (`svm_ixs` + `svm_sigs`).
 * Staged-instruction records carry no `unsigned_tx`, so the guard below filters
 * them out — they render nothing rather than being mis-mapped. Wiring the
 * instruction-staging / `svm_sigs` flow into the CLI signer needs product-level
 * rework; this only keeps legacy unsigned-tx records working.
 */
export function pendingSolTxsFromBackendUserState(
  userState: UserState | null | undefined,
  existingPendingSolTxs: readonly PendingSolTx[] = [],
): PendingSolTx[] {
  const normalizedUserState = UserState.normalize(userState);
  if (!normalizedUserState) {
    return [];
  }

  const existingById = new Map(existingPendingSolTxs.map((tx) => [tx.id, tx]));
  const fallbackNow = Date.now();
  const next: PendingSolTx[] = [];

  const pending = asRecord(normalizedUserState.pending) ?? {};
  const pendingSolanaTxs = asRecord(pending.svm_ixs) ?? {};
  for (const [rawId, rawValue] of Object.entries(pendingSolanaTxs)) {
    const pendingId = parsePendingId(rawId);
    const request = asRecord(rawValue);
    if (!pendingId || !request) {
      continue;
    }

    const unsignedTx = parseOptionalString(request.unsigned_tx);
    if (!unsignedTx) {
      continue;
    }

    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const cluster = parseOptionalString(request.cluster);
    const signer = parseOptionalString(request.signer);

    next.push({
      id,
      solanaId: pendingId,
      unsignedTx,
      cluster,
      signer,
      description,
      timestamp: existingById.get(id)?.timestamp ?? fallbackNow,
      payload: {
        pending_solana_id: pendingId,
        pendingSolanaId: pendingId,
        unsigned_tx: unsignedTx,
        unsignedTx,
        cluster,
        description,
        signer,
      },
    });
  }

  next.sort((left, right) => left.solanaId - right.solanaId);
  return next;
}

export function walletSnapshotFromUserState(
  userState: UserState | null | undefined,
): {
  publicKey?: string;
  chainId?: number;
  aaMode?: UserStateAAMode | null;
  smartAccount?: string | null;
} {
  const address = UserState.address(userState);
  const isConnected = UserState.isConnected(userState);
  const sessionAAMode = UserState.aaMode(userState);
  const walletKind = UserState.walletKind(userState);

  const aaMode: UserStateAAMode | null | undefined =
    sessionAAMode === "4337" || sessionAAMode === "7702"
      ? sessionAAMode
      : sessionAAMode === "none"
        ? null
        : undefined;

  const smartAccount: string | null | undefined =
    walletKind === "smart-account" ? address ?? null : null;

  return {
    publicKey: isConnected === false ? undefined : address,
    chainId: UserState.chainId(userState),
    aaMode,
    smartAccount,
  };
}

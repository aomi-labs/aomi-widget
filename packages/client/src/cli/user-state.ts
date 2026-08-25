import {
  CLIENT_TYPE_TS_CLI,
  UserState,
  type UserStateEvm,
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
  evmAddress?: string,
  chainId?: number,
  options?: {
    /** Solana public key (base58). When present, sets svm.address. */
    svmAddress?: string;
    /** Solana cluster. Callers resolve it via `CliSession.resolvedSvmCluster`;
     * this builder never defaults it. */
    svmCluster?: "solana:mainnet" | "solana:devnet" | "solana:testnet";
  },
): UserState {
  // Each wallet family is emitted iff its address is explicitly configured.
  // Account-abstraction is backend authority and no longer carried in
  // user_state. The CLI's `--aa` preference is applied per-transaction via the
  // execution payload, not persisted here.
  const userState: UserState = {};

  if (evmAddress !== undefined) {
    const evm: UserStateEvm = { address: evmAddress };
    if (chainId !== undefined) {
      evm.chain_id = chainId;
    }
    userState.evm = evm;
  }

  if (options?.svmAddress !== undefined) {
    userState.svm = { address: options.svmAddress };
    if (options.svmCluster !== undefined) {
      userState.svm.cluster = options.svmCluster;
    }
  }

  if (userState.evm || userState.svm) {
    userState.connection = {
      is_connected: true,
    };
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
  const pendingTxs =
    asRecord(pending.evmTxs) ?? asRecord(pending.evm_txs) ?? {};
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
      chainId: parseChainId(tx.chainId ?? tx.chain_id),
      description: parseOptionalString(tx.label),
      timestamp: txTimestamp(existingById, id, fallbackNow),
      payload: {
        pending_tx_id: pendingId,
        txId: pendingId,
        to,
        value: parseOptionalString(tx.value),
        data,
        chain_id: parseChainId(tx.chainId ?? tx.chain_id),
        chainId: parseChainId(tx.chainId ?? tx.chain_id),
        description: parseOptionalString(tx.label),
      },
    });
  }

  const pendingEip712s =
    asRecord(pending.evmSigs) ?? asRecord(pending.evm_sigs) ?? {};
  for (const [rawId, rawValue] of Object.entries(pendingEip712s)) {
    const pendingId = parsePendingId(rawId);
    const request = asRecord(rawValue);
    if (!pendingId || !request) {
      continue;
    }

    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    // Backend emits camelCase (`typedData`, `chainId`) via snake_to_camel; accept both.
    const typedData = request.typedData ?? request.typed_data;
    const chainId = parseChainId(request.chainId ?? request.chain_id);
    nextPendingTxs.push({
      id,
      kind: "eip712_sign",
      eip712Id: pendingId,
      chainId,
      description,
      timestamp: txTimestamp(existingById, id, fallbackNow),
      payload: {
        pending_eip712_id: pendingId,
        eip712Id: pendingId,
        typed_data: typedData,
        non_typed_data: parseOptionalString(request.non_typed_data),
        description,
      },
    });
  }

  nextPendingTxs.sort((left, right) => {
    const leftId = left.kind === "transaction" ? left.txId : left.eip712Id;
    const rightId = right.kind === "transaction" ? right.txId : right.eip712Id;
    return (
      (leftId ?? Number.MAX_SAFE_INTEGER) - (rightId ?? Number.MAX_SAFE_INTEGER)
    );
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
 * Instruction-staging records do not themselves carry `unsigned_tx`; that
 * byte envelope arrives in the wallet event. While an authoritative staged id
 * remains pending, preserve the matching event-derived local request. Once the
 * backend removes the id after a terminal callback, the local request is
 * removed on the next sync.
 *
 * Accept both the legacy `pending.solana_txs` / `pending.solana_sigs` shape
 * and the canonical `pending.svm_ixs` / `pending.svm_sigs` buckets because the
 * backend still has older camelCase and aliasing paths on some surfaces.
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
  const pendingSolanaTxs =
    asRecord(pending.solanaTxs) ??
    asRecord(pending.solana_txs) ??
    asRecord(pending.svmIxs) ??
    asRecord(pending.svm_ixs) ??
    {};
  for (const [rawId, rawValue] of Object.entries(pendingSolanaTxs)) {
    const pendingId = parsePendingId(rawId);
    const request = asRecord(rawValue);
    if (!pendingId || !request) {
      continue;
    }

    // Backend serializes with snake_to_camel; accept both forms.
    const unsignedTx =
      parseOptionalString(request.unsignedTx) ??
      parseOptionalString(request.unsigned_tx);
    if (!unsignedTx) {
      const existing = existingPendingSolTxs.find(
        (tx) =>
          tx.solanaId === pendingId ||
          tx.solanaIds?.includes(pendingId) === true,
      );
      if (existing && !next.some((tx) => tx.id === existing.id)) {
        next.push(existing);
      }
      continue;
    }

    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const cluster = parseOptionalString(request.cluster);
    const signer = parseOptionalString(request.signer);
    const rawRequestKind =
      parseOptionalString(request.requestKind) ??
      parseOptionalString(request.request_kind);
    const requestKind =
      rawRequestKind === "send_transaction"
        ? "solana_send"
        : rawRequestKind === "sign_and_send_transaction"
          ? "solana_sign_and_send"
          : "solana_sign";

    next.push({
      id,
      solanaId: pendingId,
      solanaIds: [pendingId],
      requestKind,
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

  // Surface pending Solana transaction and message signatures from the
  // canonical signature bucket. The backend serializes keys snake_to_camel on
  // some surfaces, so accept both forms.
  const pendingSolanaSigs =
    asRecord(normalizedUserState.pending?.solanaSigs) ??
    asRecord(normalizedUserState.pending?.solana_sigs) ??
    asRecord(
      (normalizedUserState.pending as Record<string, unknown> | undefined)
        ?.svmSigs,
    ) ??
    asRecord(
      (normalizedUserState.pending as Record<string, unknown> | undefined)
        ?.svm_sigs,
    ) ??
    {};
  for (const [rawId, rawValue] of Object.entries(pendingSolanaSigs)) {
    const pendingId = parsePendingId(rawId);
    const request = asRecord(rawValue);
    if (!pendingId || !request) {
      continue;
    }

    const unsignedTx =
      parseOptionalString(request.unsigned_tx) ??
      parseOptionalString(request.unsignedTx);
    const message =
      parseOptionalString(request.message_base64) ??
      parseOptionalString(request.messageBase64);
    if (!unsignedTx && !message) {
      const existing = existingPendingSolTxs.find(
        (tx) => tx.solanaId === pendingId,
      );
      if (existing && !next.some((tx) => tx.id === existing.id)) {
        next.push(existing);
      }
      continue;
    }

    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const signer = parseOptionalString(request.signer);
    const cluster = parseOptionalString(request.cluster);

    next.push({
      id,
      solanaId: pendingId,
      requestKind: message ? "solana_sign_message" : "solana_sign",
      unsignedTx,
      message,
      cluster,
      signer,
      description,
      timestamp: existingById.get(id)?.timestamp ?? fallbackNow,
      payload: {
        pending_solana_id: pendingId,
        pendingSolanaId: pendingId,
        unsigned_tx: unsignedTx,
        unsignedTx,
        message_base64: message,
        messageBase64: message,
        cluster,
        description,
        signer,
      },
    });
  }

  next.sort(
    (left, right) =>
      (left.solanaId ?? Number.MAX_SAFE_INTEGER) -
      (right.solanaId ?? Number.MAX_SAFE_INTEGER),
  );
  return next;
}

export function walletSnapshotFromUserState(
  userState: UserState | null | undefined,
): {
  publicKey?: string;
  chainId?: number;
} {
  const address = UserState.address(userState);
  const isConnected = UserState.isConnected(userState);

  return {
    publicKey: isConnected === false ? undefined : address,
    chainId: UserState.chainId(userState),
  };
}

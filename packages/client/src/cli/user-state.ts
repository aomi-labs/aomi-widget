import {
  CLIENT_TYPE_TS_CLI,
  UserState,
  type UserStateAAMode,
} from "../types";
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
  options?: {
    app?: string;
    aaMode?: UserStateAAMode | null;
    smartAccount?: string | null;
    /** Solana public key (base58). When present, sets solana.address and primary_family=solana. */
    svmAddress?: string;
    /** Solana cluster. Defaults to "solana:mainnet" when svmAddress is present. */
    svmCluster?: "solana:mainnet" | "solana:devnet" | "solana:testnet";
  },
): UserState {
  const app = options?.app?.trim().toLowerCase();
  // A publicKey that doesn't start with "0x" (EVM hex) is assumed to be a
  // Solana base58 address. This lets `--public-key <solana-addr>` work
  // correctly for Solana-first apps (e.g. byreal spot/lp) without requiring
  // the user to also supply --solana-private-key.
  const publicKeyIsSolana =
    publicKey !== undefined && !publicKey.trim().startsWith("0x");
  const isSolanaApp =
    app === "sol" || app === "solana" || app === "svm" || app === "byreal" ||
    publicKeyIsSolana ||
    options?.svmAddress !== undefined;
  // When --public-key looks like a Solana address, promote it to svmAddress.
  const svmAddress = options?.svmAddress ?? (publicKeyIsSolana ? publicKey : undefined);
  const anyConnected = (isSolanaApp ? svmAddress : publicKey) !== undefined;
  const userState: UserState = {
    connection: {
      is_connected: anyConnected ? true : undefined,
      primary_family: anyConnected
        ? isSolanaApp
          ? "solana"
          : "evm"
        : undefined,
    },
    evm: isSolanaApp
      ? undefined
      : {
          address: publicKey,
          chain_id: chainId,
          aa: {
            mode: options?.aaMode ?? null,
            smart_account: options?.smartAccount ?? null,
          },
        },
    solana: isSolanaApp
      ? {
          address: svmAddress ?? publicKey,
          // Default to mainnet when an SVM address is present; the backend
          // falls back to "devnet" when cluster is absent which causes mainnet
          // DEXes (byreal etc.) to look for devnet liquidity and fail.
          cluster: options?.svmCluster ?? (svmAddress !== undefined ? "solana:mainnet" : undefined),
        }
      : undefined,
  };

  return UserState.withExt(userState, "clientType", CLIENT_TYPE_TS_CLI);
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

  const pendingTxs = asRecord(normalizedUserState.pending?.evm_txs) ?? {};
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

  const pendingEip712s = asRecord(normalizedUserState.pending?.evm_sigs) ?? {};
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
 * `pending.solana_txs` map. Mirrors [`pendingTxsFromBackendUserState`] but
 * for the Solana domain only — kept in its own function so the caller's
 * EVM/EIP-712 state and Solana state stay in separate arrays rather than
 * a discriminated union.
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

  const pendingSolanaTxs = asRecord(normalizedUserState.pending?.solana_txs) ?? {};
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

  // Also surface pending Solana *message-signature* requests (solana_sigs).
  // These are produced by `svm_commit_message` / `sign_tx_solana` and stored
  // under `pending.solana_sigs` with `message_base64` instead of `unsigned_tx`.
  const pendingSolanaSigs = asRecord(normalizedUserState.pending?.solana_sigs) ?? {};
  for (const [rawId, rawValue] of Object.entries(pendingSolanaSigs)) {
    const pendingId = parsePendingId(rawId);
    const request = asRecord(rawValue);
    if (!pendingId || !request) {
      continue;
    }

    // message_base64 / messageBase64 is the serialized transaction bytes (base64-encoded).
    // The backend serializes pending sigs in camelCase (messageBase64) on the wire.
    const unsignedTx =
      parseOptionalString(request.message_base64) ??
      parseOptionalString(request.messageBase64);
    if (!unsignedTx) {
      continue;
    }

    const id = pendingDisplayId(pendingId);
    const description = parseOptionalString(request.description);
    const signer = parseOptionalString(request.signer);
    // solana_sigs entries don't carry a cluster field — default to mainnet.
    const cluster = "solana:mainnet";

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

  return {
    publicKey: isConnected === false ? undefined : address,
    chainId: UserState.chainId(userState),
    aaMode: UserState.aaMode(userState),
    smartAccount: UserState.smartAccount(userState),
  };
}

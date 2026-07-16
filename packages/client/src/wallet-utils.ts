// =============================================================================
// Wallet Payload Normalization
// =============================================================================
//
// Pure functions extracted from packages/react/src/handlers/wallet-handler.ts.
// Normalizes the various payload shapes the backend can send for wallet
// transaction and EIP-712 signing requests.

// =============================================================================
// Types
// =============================================================================

import { type Hex, getAddress } from "viem";
import type { AAWalletCall } from "./aa/types";
import { UserState } from "./user-state";

export type WalletTxAaPreference = "auto" | "eip4337" | "eip7702" | "none";

export type WalletTxCallPayload = {
  txId: number;
  to: string;
  value?: string;
  data?: string;
  chainId?: number;
  from?: string;
  gas?: string;
  description?: string;
};

export type WalletTxPayload = {
  to?: string;
  value?: string;
  data?: string;
  chainId?: number;
  txId?: number;
  txIds?: number[];
  aaPreference?: WalletTxAaPreference;
  aaStrict?: boolean;
  requestId?: string;
  calls?: WalletTxCallPayload[];
};

type HydrateTxPayloadOptions = {
  strict?: boolean;
};

export type WalletEip712Payload = {
  typed_data?: {
    domain?: { chainId?: number | string };
    types?: Record<string, Array<{ name: string; type: string }>>;
    primaryType?: string;
    message?: Record<string, unknown>;
  };
  non_typed_data?: string;
  description?: string;
  eip712Id?: number;
};

/**
 * Wire payload for `wallet::solana_sign_request`. Mirrors `WalletEip712Payload`
 * in shape — singular sign-only — but carries a base64-encoded serialized
 * Solana transaction instead of EIP-712 typed data.
 *
 * `unsignedTx` is base64 of `VersionedTransaction.serialize()` (legacy
 * `Transaction.serialize()` also accepted by adapters). The host doesn't
 * decode it; the wallet adapter handles deserialization.
 */
export type WalletSolanaSignPayload = {
  /** Base64 of the unsigned Solana transaction. */
  unsignedTx?: string;
  /** Human-readable summary shown alongside the wallet's decoded preview. */
  description?: string;
  /** CAIP-2 cluster string (`"solana:mainnet"` / `"solana:devnet"`). */
  cluster?: string;
  /** Server-side correlation id for the staged sign request. */
  pendingSolanaId?: number;
  /** All staged instruction/transaction ids resolved by this wallet request. */
  pendingSolanaIds?: number[];
};

export type WalletSolanaSignMessagePayload = {
  /** Base64 of the raw message bytes to sign. */
  message?: string;
  /** Human-readable summary shown alongside the wallet's decoded preview. */
  description?: string;
  /** CAIP-2 cluster string (`"solana:mainnet"` / `"solana:devnet"`). */
  cluster?: string;
  /** Server-side correlation id for the staged sign request. */
  pendingSolanaId?: number;
};

export type NormalizedSolanaWalletRequest = {
  kind:
    | "solana_sign"
    | "solana_sign_message"
    | "solana_send"
    | "solana_sign_and_send";
  payload: WalletSolanaSignPayload | WalletSolanaSignMessagePayload;
};

export type ViemSignTypedDataArgs = {
  domain?: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message?: Record<string, unknown>;
};

export type ViemSignMessageArgs = {
  message: string | { raw: Hex };
};

// =============================================================================
// Helpers
// =============================================================================

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return undefined;
  return value as UnknownRecord;
}

function pendingTxsFromUserState(userState: unknown): UnknownRecord | undefined {
  const normalized = UserState.normalize(userState as UserState);
  const pending = asRecord(normalized?.pending);
  return asRecord(pending?.evm_txs) ?? asRecord(asRecord(userState)?.pending_txs);
}

function getToolArgs(payload: unknown): UnknownRecord {
  const root = asRecord(payload);
  const nestedArgs = asRecord(root?.args);
  return nestedArgs ?? root ?? {};
}

function parseChainKind(value: unknown): "evm" | "svm" | undefined {
  return value === "evm" || value === "svm" ? value : undefined;
}

export function inferSolanaRequestKind(
  payload: Record<string, unknown>,
): NormalizedSolanaWalletRequest["kind"] {
  const rawKind =
    typeof payload.kind === "string"
      ? payload.kind
      : typeof payload.request_kind === "string"
        ? payload.request_kind
        : typeof payload.requestKind === "string"
          ? payload.requestKind
          : undefined;

  switch (rawKind) {
    case "solana_sign_message":
    case "message_sign":
      return "solana_sign_message";
    case "solana_send":
    case "send_transaction":
      return "solana_send";
    case "solana_sign_and_send":
    case "sign_and_send_transaction":
      return "solana_sign_and_send";
    default:
      return "solana_sign";
  }
}

export function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : undefined;
  }
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = trimmed.startsWith("0x")
    ? parseCanonicalInteger(trimmed.slice(2), 16)
    : parseCanonicalInteger(trimmed, 10);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function parseCanonicalInteger(
  value: string,
  radix: 10 | 16,
): number | undefined {
  if (value === "") return undefined;
  const pattern = radix === 16 ? /^[0-9a-fA-F]+$/ : /^[0-9]+$/;
  if (!pattern.test(value)) return undefined;

  const parsed = Number.parseInt(value, radix);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseTxIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const parsed = value
    .map((entry) => parsePendingId(entry))
    .filter((entry): entry is number => typeof entry === "number");
  const unique = Array.from(new Set(parsed));
  unique.sort((left, right) => left - right);
  return unique;
}

function parsePendingId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseValue(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return undefined;
}

function parseString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isHexBytes(value: string): value is Hex {
  return /^0x(?:[0-9a-fA-F]{2})*$/.test(value);
}

function normalizeAaPreference(
  value: unknown,
): WalletTxAaPreference | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "auto" ||
    normalized === "eip4337" ||
    normalized === "eip7702" ||
    normalized === "none"
  ) {
    return normalized;
  }
  return undefined;
}

function normalizeAddress(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    return getAddress(trimmed);
  } catch {
    if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      return getAddress(trimmed.toLowerCase());
    }
    return undefined;
  }
}

export function normalizePendingTxData(
  pendingEntry: UnknownRecord,
): string | undefined {
  const data =
    typeof pendingEntry.data === "string" ? pendingEntry.data : undefined;
  if (!data) {
    return undefined;
  }

  const kind =
    typeof pendingEntry.kind === "string"
      ? pendingEntry.kind.toLowerCase()
      : undefined;

  if (kind === "native_transfer") {
    return undefined;
  }

  return data;
}

// =============================================================================
// Normalization
// =============================================================================

/**
 * Normalize a wallet_tx_request payload into a consistent shape.
 * Hard cutover contract: requires `tx_ids`.
 */
export function normalizeTxPayload(payload: unknown): WalletTxPayload | null {
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root?.ctx);
  const txIds = parseTxIds(args.tx_ids ?? args.txIds);
  if (txIds.length === 0) return null;

  const to = normalizeAddress(args.to);
  const value = parseValue(args.value);
  const data = typeof args.data === "string" ? args.data : undefined;
  const chainId =
    parseChainId(args.chainId) ??
    parseChainId(args.chain_id) ??
    parseChainId(ctx?.user_chain_id) ??
    parseChainId(ctx?.userChainId);
  const requestId =
    typeof args.tx_id === "string"
      ? args.tx_id
      : typeof args.txId === "string"
        ? args.txId
        : undefined;
  const aaPreference =
    normalizeAaPreference(args.aa_preference ?? args.aaPreference) ?? "auto";
  const aaStrict = parseBoolean(args.aa_strict ?? args.aaStrict);
  const txId = txIds.length === 1 ? txIds[0] : undefined;

  return {
    to,
    value,
    data,
    chainId,
    txId,
    txIds,
    aaPreference,
    aaStrict,
    requestId,
  };
}

export function hydrateTxPayloadFromUserState(
  payload: WalletTxPayload,
  userState: unknown,
  options?: HydrateTxPayloadOptions,
): WalletTxPayload {
  const strict = options?.strict === true;
  const txIds =
    Array.isArray(payload.txIds) && payload.txIds.length > 0
      ? payload.txIds
      : payload.txId !== undefined
        ? [payload.txId]
        : [];
  if (txIds.length === 0) {
    if (strict) {
      throw new Error("pending_tx_not_found");
    }
    return payload;
  }

  const pendingTxsRaw = pendingTxsFromUserState(userState);
  if (!pendingTxsRaw) {
    if (strict) {
      throw new Error("pending_tx_not_found");
    }
    return payload;
  }

  const calls: WalletTxCallPayload[] = [];
  for (const txId of txIds) {
    const pendingEntry = asRecord(pendingTxsRaw[String(txId)]);
    if (!pendingEntry) {
      if (strict) {
        throw new Error("pending_tx_not_found");
      }
      continue;
    }

    const to = normalizeAddress(pendingEntry.to);
    if (!to) {
      if (strict) {
        throw new Error("pending_transaction_missing_call_data");
      }
      continue;
    }

    calls.push({
      txId,
      to,
      value: parseValue(pendingEntry.value),
      data: normalizePendingTxData(pendingEntry),
      chainId:
        parseChainId(pendingEntry.chain_id) ??
        parseChainId(pendingEntry.chainId) ??
        parseChainId(payload.chainId),
      from:
        typeof pendingEntry.from === "string" ? pendingEntry.from : undefined,
      gas: typeof pendingEntry.gas === "string" ? pendingEntry.gas : undefined,
      description:
        typeof pendingEntry.label === "string"
          ? pendingEntry.label
          : typeof pendingEntry.description === "string"
            ? pendingEntry.description
            : undefined,
    });
  }
  if (calls.length === 0) {
    if (strict) {
      throw new Error("pending_tx_not_found");
    }
    return payload;
  }
  const first = calls[0];

  return {
    ...payload,
    txIds,
    txId: payload.txId ?? first.txId,
    to: payload.to ?? first.to,
    value: payload.value ?? first.value,
    data: payload.data ?? first.data,
    chainId: payload.chainId ?? first.chainId,
    calls,
  };
}

/**
 * Normalize a `wallet::solana_sign_request` payload into a consistent shape.
 *
 * Accepts the various nesting levels the backend can ship: top-level args,
 * `{ args: { ... } }`, snake_case (`unsigned_tx`, `pending_solana_id`) or
 * camelCase (`unsignedTx`, `pendingSolanaId`). Single source of truth for
 * the SDK's view of the request — both the dispatch path and the
 * `syncWalletRequests` reconstruction loop go through here.
 */
export function normalizeSolanaSignPayload(
  payload: unknown,
): WalletSolanaSignPayload {
  const args = getToolArgs(payload);

  const unsignedTxRaw = args.unsigned_tx ?? args.unsignedTx;
  const unsignedTx =
    typeof unsignedTxRaw === "string" ? unsignedTxRaw : undefined;

  const description =
    typeof args.description === "string" ? args.description : undefined;

  const clusterRaw = args.cluster;
  const cluster = typeof clusterRaw === "string" ? clusterRaw : undefined;

  const rawPendingIds = args.svm_tx_ids ?? args.svm_ix_ids;
  const pendingSolanaIds = Array.isArray(rawPendingIds)
    ? rawPendingIds
        .map(parsePendingId)
        .filter((id): id is number => id !== undefined)
    : undefined;
  const pendingSolanaId =
    parsePendingId(args.pendingSolanaId) ??
    parsePendingId(args.pending_solana_id) ??
    parsePendingId(args.pendingSvmSigId) ??
    parsePendingId(args.pending_svm_sig_id) ??
    pendingSolanaIds?.[0];

  return {
    unsignedTx,
    description,
    cluster,
    pendingSolanaId,
    pendingSolanaIds,
  };
}

export function normalizeSolanaSignMessagePayload(
  payload: unknown,
): WalletSolanaSignMessagePayload {
  const args = getToolArgs(payload);

  const messageRaw = args.message_base64 ?? args.messageBase64 ?? args.message;
  const message = typeof messageRaw === "string" ? messageRaw : undefined;

  const description =
    typeof args.description === "string" ? args.description : undefined;

  const clusterRaw = args.cluster;
  const cluster = typeof clusterRaw === "string" ? clusterRaw : undefined;

  const pendingSolanaId =
    parsePendingId(args.pendingSolanaId) ??
    parsePendingId(args.pending_solana_id) ??
    parsePendingId(args.pendingSvmSigId) ??
    parsePendingId(args.pending_svm_sig_id);

  return { message, description, cluster, pendingSolanaId };
}

export function normalizeSolanaWalletRequest(
  payload: unknown,
): NormalizedSolanaWalletRequest | null {
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const solanaRequest = {
    ...(root ?? {}),
    ...args,
  };
  const chainKind =
    parseChainKind(args.chain_kind) ??
    parseChainKind(args.chain_family) ??
    parseChainKind(root?.chain_kind) ??
    parseChainKind(root?.chain_family);
  if (chainKind !== "svm") {
    return null;
  }

  const kind = inferSolanaRequestKind(solanaRequest);
  if (kind === "solana_sign_message") {
    const normalized = normalizeSolanaSignMessagePayload(payload);
    return normalized.message ? { kind, payload: normalized } : null;
  }

  const normalized = normalizeSolanaSignPayload(payload);
  return normalized.unsignedTx ? { kind, payload: normalized } : null;
}

/**
 * Normalize an EIP-712 signing request payload.
 */
export function normalizeEip712Payload(payload: unknown): WalletEip712Payload {
  const args = getToolArgs(payload);
  const typedDataRaw =
    args.typed_data ?? args["712_typed_data"] ?? args.typedData;
  const nonTypedData = parseString(args.non_typed_data ?? args.nonTypedData);
  let typedData: WalletEip712Payload["typed_data"] | undefined;

  if (typeof typedDataRaw === "string") {
    try {
      const parsed = JSON.parse(typedDataRaw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        typedData = parsed as WalletEip712Payload["typed_data"];
      }
    } catch {
      typedData = undefined;
    }
  } else if (
    typedDataRaw &&
    typeof typedDataRaw === "object" &&
    !Array.isArray(typedDataRaw)
  ) {
    typedData = typedDataRaw as WalletEip712Payload["typed_data"];
  }

  const description =
    typeof args.description === "string" ? args.description : undefined;
  const eip712Id =
    parsePendingId(args.eip712Id) ??
    parsePendingId(args.pending_eip712_id) ??
    parsePendingId(args.pendingEip712Id);

  return {
    typed_data: typedData,
    non_typed_data: nonTypedData,
    description,
    eip712Id,
  };
}

/**
 * Convert a normalized WalletTxPayload into AAWalletCalls.
 * This is the single boundary conversion point from backend payloads to AA-ready calls.
 */
export function toAAWalletCalls(
  payload: WalletTxPayload,
  defaultChainId = 1,
): AAWalletCall[] {
  const calls = payload.calls?.length
    ? payload.calls
    : payload.to
      ? [
          {
            txId: payload.txId ?? 0,
            to: payload.to,
            value: payload.value,
            data: payload.data,
            chainId: payload.chainId,
          } satisfies WalletTxCallPayload,
        ]
      : [];
  if (calls.length === 0) {
    throw new Error("pending_transaction_missing_call_data");
  }
  return calls.map((call) => ({
    to: call.to as Hex,
    value: BigInt(call.value ?? "0"),
    data: call.data ? (call.data as Hex) : undefined,
    chainId: call.chainId ?? payload.chainId ?? defaultChainId,
  }));
}

export function toAAWalletCall(
  payload: WalletTxPayload,
  defaultChainId = 1,
): AAWalletCall {
  return toAAWalletCalls(payload, defaultChainId)[0];
}

/**
 * Convert normalized EIP-712 payloads into the viem signing shape used by both
 * the CLI and widget component layers.
 */
export function toViemSignTypedDataArgs(
  payload: WalletEip712Payload,
): ViemSignTypedDataArgs | null {
  const typedData = payload.typed_data;
  const primaryType =
    typeof typedData?.primaryType === "string" &&
    typedData.primaryType.trim().length > 0
      ? typedData.primaryType
      : undefined;

  if (!typedData || !primaryType) {
    return null;
  }

  return {
    domain: asRecord(typedData.domain),
    types: Object.fromEntries(
      Object.entries(typedData.types ?? {}).filter(
        ([typeName]) => typeName !== "EIP712Domain",
      ),
    ) as ViemSignTypedDataArgs["types"],
    primaryType,
    message: asRecord(typedData.message),
  };
}

/**
 * Convert normalized ERC-191/personal_sign payloads into viem signMessage args.
 * Hex strings are opaque bytes; all other strings are signed as UTF-8 text.
 */
export function toViemSignMessageArgs(
  payload: WalletEip712Payload,
): ViemSignMessageArgs | null {
  const nonTypedData = payload.non_typed_data;
  if (typeof nonTypedData !== "string" || nonTypedData.length === 0) {
    return null;
  }

  return {
    message: isHexBytes(nonTypedData) ? { raw: nonTypedData } : nonTypedData,
  };
}

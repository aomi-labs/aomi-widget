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
  description?: string;
  eip712Id?: number;
};

export type ViemSignTypedDataArgs = {
  domain?: Record<string, unknown>;
  types: Record<string, Array<{ name: string; type: string }>>;
  primaryType: string;
  message?: Record<string, unknown>;
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

function getToolArgs(payload: unknown): UnknownRecord {
  const root = asRecord(payload);
  const nestedArgs = asRecord(root?.args);
  return nestedArgs ?? root ?? {};
}

export function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function normalizeAaPreference(value: unknown): WalletTxAaPreference | undefined {
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

  const kind = typeof pendingEntry.kind === "string"
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

  const normalizedUserState = asRecord(userState);
  const pendingTxsRaw = asRecord(normalizedUserState?.pending_txs);
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
      from: typeof pendingEntry.from === "string" ? pendingEntry.from : undefined,
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
 * Normalize an EIP-712 signing request payload.
 */
export function normalizeEip712Payload(
  payload: unknown,
): WalletEip712Payload {
  const args = getToolArgs(payload);
  const typedDataRaw =
    args.typed_data ?? args["712_typed_data"] ?? args.typedData;
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

  return { typed_data: typedData, description, eip712Id };
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

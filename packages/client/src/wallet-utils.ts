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

import { getAddress } from "viem";

export type WalletTxPayload = {
  to: string;
  value?: string;
  data?: string;
  chainId?: number;
};

export type WalletEip712Payload = {
  typed_data?: {
    domain?: { chainId?: number | string };
    types?: Record<string, Array<{ name: string; type: string }>>;
    primaryType?: string;
    message?: Record<string, unknown>;
  };
  description?: string;
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

function parseChainId(value: unknown): number | undefined {
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

// =============================================================================
// Normalization
// =============================================================================

/**
 * Normalize a wallet_tx_request payload into a consistent shape.
 * Returns `null` if the payload is missing the required `to` field.
 */
export function normalizeTxPayload(payload: unknown): WalletTxPayload | null {
  const root = asRecord(payload);
  const args = getToolArgs(payload);
  const ctx = asRecord(root?.ctx);

  const to = normalizeAddress(args.to);
  if (!to) return null;

  const valueRaw = args.value;
  const value =
    typeof valueRaw === "string"
      ? valueRaw
      : typeof valueRaw === "number" && Number.isFinite(valueRaw)
        ? String(Math.trunc(valueRaw))
        : undefined;

  const data = typeof args.data === "string" ? args.data : undefined;
  const chainId =
    parseChainId(args.chainId) ??
    parseChainId(args.chain_id) ??
    parseChainId(ctx?.user_chain_id) ??
    parseChainId(ctx?.userChainId);

  return { to, value, data, chainId };
}

/**
 * Normalize an EIP-712 signing request payload.
 */
export function normalizeEip712Payload(
  payload: unknown,
): WalletEip712Payload {
  const args = getToolArgs(payload);
  const typedDataRaw = args.typed_data ?? args.typedData;
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

  return { typed_data: typedData, description };
}

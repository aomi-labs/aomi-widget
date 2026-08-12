import {
  CHAINS_BY_ID,
  parseChainId,
  type WalletRequest,
  type WalletTxPayload,
} from "@aomi-labs/client";
import { formatEther } from "viem";
import { mainnet, type Chain } from "viem/chains";

export function requestChain(request: WalletRequest | null): Chain {
  const chainId = request ? requestChainId(request) : undefined;
  return (chainId ? CHAINS_BY_ID[chainId] : undefined) ?? mainnet;
}

export function requestChainId(request: WalletRequest): number | undefined {
  if (request.kind === "transaction") {
    const calls = request.payload.calls ?? [];
    return (
      calls.map((call) => call.chainId).find((value) => value !== undefined) ??
      request.payload.chainId
    );
  }
  if (request.kind !== "eip712_sign") return undefined;
  return parseChainId(request.payload.typed_data?.domain?.chainId);
}

export function pendingTransactionIds(payload: WalletTxPayload): number[] {
  if (payload.calls?.length) return payload.calls.map((call) => call.txId);
  if (payload.txIds?.length) return payload.txIds;
  return payload.txId === undefined ? [] : [payload.txId];
}

export function requestedAaMode(
  payload: WalletTxPayload,
): "4337" | "7702" | "none" {
  if (payload.aaPreference === "none") return "none";
  if (payload.aaPreference === "eip4337") return "4337";
  // Keep this aligned with the canonical Session policy: `auto` (and an
  // omitted preference before normalization) requests 7702. Treating it as
  // `none` would let an `aaStrict` request silently execute through an EOA.
  return "7702";
}

export type RequestField = {
  label: string;
  value: string;
  /** Render in a monospace, wrappable block — addresses, calldata, JSON. */
  mono?: boolean;
};

export type RequestSummary = {
  title: string;
  fields: RequestField[];
};

function formatCalldata(data: string | undefined): string {
  if (!data || data === "0x") return "None";
  return data;
}

/**
 * What the user is asked to approve, in the plainest terms we can state without
 * decoding. Nothing here is inferred — every field comes straight off the
 * request — because this is the only place a Telegram user sees what they are
 * signing.
 */
export function describeRequest(
  request: WalletRequest,
  chain: Chain,
): RequestSummary | null {
  if (request.kind === "transaction") {
    const call = request.payload.calls?.[0];
    const to = call?.to ?? request.payload.to;
    const rawValue = call?.value ?? request.payload.value ?? "0";
    const data = call?.data ?? request.payload.data;

    let amount = `${rawValue} wei`;
    try {
      amount = `${formatEther(BigInt(rawValue))} ${chain.nativeCurrency.symbol}`;
    } catch {
      // Leave the raw value visible rather than hiding an unparseable amount.
    }

    const fields: RequestField[] = [
      { label: "Network", value: chain.name },
      { label: "To", value: to ?? "unknown", mono: true },
      { label: "Amount", value: amount },
      { label: "Calldata", value: formatCalldata(data), mono: true },
    ];
    if (call?.description) {
      fields.unshift({ label: "Action", value: call.description });
    }
    return { title: "Approve transaction", fields };
  }

  if (request.kind !== "eip712_sign") return null;

  const { typed_data: typedData, non_typed_data: message } = request.payload;
  const fields: RequestField[] = [];
  if (request.payload.description) {
    fields.push({ label: "Action", value: request.payload.description });
  }

  if (typedData) {
    fields.push({ label: "Network", value: chain.name });
    if (typedData.primaryType) {
      fields.push({ label: "Type", value: typedData.primaryType });
    }
    fields.push({
      label: "Domain",
      value: JSON.stringify(typedData.domain ?? {}, null, 2),
      mono: true,
    });
    fields.push({
      label: "Types",
      value: JSON.stringify(typedData.types ?? {}, null, 2),
      mono: true,
    });
    fields.push({
      label: "Message",
      value: JSON.stringify(typedData.message ?? {}, null, 2),
      mono: true,
    });
    return { title: "Approve signature", fields };
  }

  fields.push({ label: "Message", value: message ?? "", mono: true });
  return { title: "Approve signature", fields };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "wallet_request_failed";
}

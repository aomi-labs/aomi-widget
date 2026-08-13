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
  if (request.kind !== "signing" || request.payload.chainFamily !== "evm") {
    return undefined;
  }
  return parseChainId(request.payload.chainId);
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

  if (request.kind !== "signing" || request.payload.chainFamily !== "evm") {
    return null;
  }

  const fields: RequestField[] = [
    { label: "Network", value: chain.name },
    { label: "Signer", value: request.payload.signer, mono: true },
  ];
  if (request.payload.description) {
    fields.unshift({ label: "Action", value: request.payload.description });
  }

  if (request.payload.executor) {
    fields.push({
      label: "Executor",
      value: request.payload.executor,
      mono: true,
    });
  }
  if (request.payload.calls?.length) {
    fields.push({
      label: "Calls",
      value: JSON.stringify(request.payload.calls, null, 2),
      mono: true,
    });
  }
  if (request.payload.fees?.length) {
    fields.push({
      label: "Fees",
      value: JSON.stringify(request.payload.fees, null, 2),
      mono: true,
    });
  }

  for (const [index, payload] of request.payload.payloads.entries()) {
    const suffix = request.payload.payloads.length > 1 ? ` ${index + 1}` : "";
    if (payload.kind === "evm_typed_data") {
      const typedData = payload.typedData;
      if (typedData.primaryType) {
        fields.push({ label: `Type${suffix}`, value: typedData.primaryType });
      }
      fields.push({
        label: `Domain${suffix}`,
        value: JSON.stringify(typedData.domain ?? {}, null, 2),
        mono: true,
      });
      fields.push({
        label: `Types${suffix}`,
        value: JSON.stringify(typedData.types ?? {}, null, 2),
        mono: true,
      });
      fields.push({
        label: `Message${suffix}`,
        value: JSON.stringify(typedData.message ?? {}, null, 2),
        mono: true,
      });
      continue;
    }
    if (payload.kind === "evm_personal") {
      fields.push({
        label: `Message${suffix}`,
        value: payload.message,
        mono: true,
      });
    }
  }

  return {
    title:
      request.payload.executionKind === "erc4337"
        ? "Approve account action"
        : "Approve signature",
    fields,
  };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "wallet_request_failed";
}

import {
  CHAINS_BY_ID,
  parseChainId,
  type WalletRequest,
  type WalletTxPayload,
} from "@aomi-labs/client";
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
  if (payload.aaPreference === "eip4337") return "4337";
  if (payload.aaPreference === "eip7702") return "7702";
  return "none";
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "wallet_request_failed";
}

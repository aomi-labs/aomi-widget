import { getAddress, type Hex } from "viem";
import type { AomiSimulateFee } from "../types";
import type {
  WalletTxAaPreference,
  WalletTxCallPayload,
  WalletTxPayload,
} from "../wallet-utils";
import type { AAWalletCall } from "./types";

/** Max fee auto-injection threshold (0.05 native token). */
export const MAX_AUTO_FEE_WEI = BigInt("50000000000000000");
const ZERO_WEI = BigInt("0");

export type NormalizedSimulatedFee = {
  recipient: Hex;
  amountWei: bigint;
};

function toPayloadCalls(
  payload: WalletTxPayload,
  defaultChainId: number,
): WalletTxCallPayload[] {
  if (Array.isArray(payload.calls) && payload.calls.length > 0) {
    return payload.calls;
  }

  if (!payload.to) {
    throw new Error("pending_transaction_missing_call_data");
  }

  return [
    {
      txId: payload.txId ?? 0,
      to: payload.to,
      value: payload.value,
      data: payload.data,
      chainId: payload.chainId ?? defaultChainId,
    },
  ];
}

export function normalizeSimulatedFee(
  fee: AomiSimulateFee,
): NormalizedSimulatedFee | null {
  const amountWei = BigInt(fee.amount_wei);
  if (amountWei === ZERO_WEI) {
    return null;
  }
  if (amountWei < ZERO_WEI) {
    throw new Error(`Invalid fee amount: ${fee.amount_wei}`);
  }
  if (amountWei > MAX_AUTO_FEE_WEI) {
    throw new Error("fee_exceeds_safety_limit");
  }

  return {
    recipient: getAddress(fee.recipient),
    amountWei,
  };
}

export function buildFeeAAWalletCall(
  fee: AomiSimulateFee,
  chainId: number,
): AAWalletCall | null {
  const normalizedFee = normalizeSimulatedFee(fee);
  if (!normalizedFee) {
    return null;
  }

  return {
    to: normalizedFee.recipient,
    value: normalizedFee.amountWei,
    chainId,
  };
}

export function appendFeeCallToPayload(
  payload: WalletTxPayload,
  fee: AomiSimulateFee,
  defaultChainId: number,
  options?: {
    forceAaPreference?: WalletTxAaPreference;
    strictAa?: boolean;
  },
): WalletTxPayload {
  const feeCall = normalizeSimulatedFee(fee);
  if (!feeCall) {
    return payload;
  }

  const calls = toPayloadCalls(payload, defaultChainId);
  const forceAaPreference = options?.forceAaPreference ?? "eip4337";
  const strictAa = options?.strictAa ?? true;

  return {
    ...payload,
    // Fee call must be the final call in the AA batch.
    calls: [
      ...calls,
      {
        txId: 0,
        to: feeCall.recipient,
        value: feeCall.amountWei.toString(),
        chainId: defaultChainId,
      },
    ],
    // Force AA mode once fee is appended so single user tx + fee still batches via AA.
    aaPreference: forceAaPreference,
    // Do not silently downgrade fee-injected batch requests to EOA.
    aaStrict: strictAa,
  };
}

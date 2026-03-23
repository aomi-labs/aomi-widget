import type { Hex, TransactionReceipt } from "viem";

import type {
  AAExecutionMode,
  AALike,
  WalletPrimitiveCall,
} from "./types";

// ---------------------------------------------------------------------------
// Smart Account Shape (from @getpara/aa-* SDKs)
// ---------------------------------------------------------------------------

export type ParaSmartAccountLike = {
  provider: string;
  mode: AAExecutionMode;
  smartAccountAddress: Hex;
  delegationAddress?: Hex;
  sendTransaction: (
    call: WalletPrimitiveCall,
    options?: unknown,
  ) => Promise<TransactionReceipt>;
  sendBatchTransaction: (
    calls: WalletPrimitiveCall[],
    options?: unknown,
  ) => Promise<TransactionReceipt>;
};

// ---------------------------------------------------------------------------
// Smart Account Adapter
// ---------------------------------------------------------------------------

/**
 * Bridges a `ParaSmartAccountLike` (from `@getpara/aa-*` SDKs) into
 * the library's `AALike` interface:
 * - Maps `smartAccountAddress` → `AAAddress`
 * - Unwraps `TransactionReceipt` → `{ transactionHash }`
 */
export function adaptSmartAccount(account: ParaSmartAccountLike): AALike {
  return {
    provider: account.provider,
    mode: account.mode,
    AAAddress: account.smartAccountAddress,
    delegationAddress: account.delegationAddress,
    sendTransaction: async (call) => {
      const receipt = await account.sendTransaction(call);
      return { transactionHash: receipt.transactionHash };
    },
    sendBatchTransaction: async (calls) => {
      const receipt = await account.sendBatchTransaction(calls);
      return { transactionHash: receipt.transactionHash };
    },
  };
}

// ---------------------------------------------------------------------------
// Error Classification
// ---------------------------------------------------------------------------

/**
 * Detects Alchemy gas sponsorship quota errors.
 */
export function isAlchemySponsorshipLimitError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return (
    normalized.includes("gas sponsorship limit") ||
    normalized.includes("put your team over your gas sponsorship limit") ||
    normalized.includes("buy gas credits in your gas manager dashboard")
  );
}

import type { Hex, TransactionReceipt } from "viem";

import type {
  AAMode,
  AACallPayload,
  SmartAccount,
} from "./types";

// ---------------------------------------------------------------------------
// Smart Account Shape (from @getpara/aa-* SDKs)
// ---------------------------------------------------------------------------

type SdkSmartAccount = {
  provider: string;
  mode: AAMode;
  smartAccountAddress: Hex;
  delegationAddress?: Hex;
  sendTransaction: (
    call: AACallPayload,
    options?: unknown,
  ) => Promise<TransactionReceipt>;
  sendBatchTransaction: (
    calls: AACallPayload[],
    options?: unknown,
  ) => Promise<TransactionReceipt>;
};

// ---------------------------------------------------------------------------
// Smart Account Adapter
// ---------------------------------------------------------------------------

/**
 * Bridges the provider SDK smart-account shape into the library's
 * SmartAccount interface:
 * - Maps `smartAccountAddress` → `AAAddress`
 * - Unwraps `TransactionReceipt` → `{ transactionHash }`
 */
export function adaptSmartAccount(account: SdkSmartAccount): SmartAccount {
  // In 7702 mode the smart-account address IS the user's EOA.  If the SDK
  // returns the EOA as the delegation address it's a known bug — the real
  // delegation target should be the implementation contract (e.g. Alchemy's
  // SemiModularAccount7702), not the EOA itself.  Drop the bogus value so
  // callers don't display a misleading "Deleg: <own-address>".
  const delegationAddress =
    account.mode === "7702" &&
    account.delegationAddress &&
    account.smartAccountAddress &&
    account.delegationAddress.toLowerCase() ===
      account.smartAccountAddress.toLowerCase()
      ? undefined
      : account.delegationAddress;

  return {
    provider: account.provider,
    mode: account.mode,
    AAAddress: account.smartAccountAddress,
    delegationAddress,
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

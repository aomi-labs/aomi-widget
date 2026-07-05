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
  /** Para SDKs emit uppercase (e.g. "ALCHEMY", "PIMLICO"); normalized by the adapter. */
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

function normalizeAAProvider(value: string): "alchemy" | "pimlico" {
  const lowered = value.toLowerCase();
  if (lowered === "alchemy" || lowered === "pimlico") {
    return lowered;
  }
  throw new Error(`Unsupported AA provider from SDK: ${value}`);
}

// ---------------------------------------------------------------------------
// Smart Account Adapter
// ---------------------------------------------------------------------------

/**
 * Bridges the provider SDK smart-account shape into the library's
 * `SmartAccount` interface.
 *
 * - `address` is the EOA signer — must be supplied by the caller (the SDK
 *   account object only exposes the *executing* address, which differs from
 *   the signer in 4337 mode).
 * - `SmartAccount4337` is the AA contract address (only set in 4337 mode).
 * - `Delegation7702` is the delegation target contract (only set in 7702 mode).
 */
export function adaptSmartAccount(
  account: SdkSmartAccount,
  address: Hex,
): SmartAccount {
  if (account.mode === "4337") {
    return {
      provider: normalizeAAProvider(account.provider),
      mode: "4337",
      address,
      SmartAccount4337: account.smartAccountAddress,
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

  // 7702 mode. In 7702, the smart-account address IS the user's EOA. If the
  // SDK returns the EOA as the delegation address it's a known bug — the
  // real delegation target is the implementation contract (e.g. Alchemy's
  // SemiModularAccount7702), not the EOA itself. Drop bogus self-delegation
  // values so callers don't display a misleading "Deleg: <own-address>".
  const Delegation7702 =
    account.delegationAddress &&
    account.smartAccountAddress &&
    account.delegationAddress.toLowerCase() !==
      account.smartAccountAddress.toLowerCase()
      ? account.delegationAddress
      : undefined;

  return {
    provider: normalizeAAProvider(account.provider),
    mode: "7702",
    address,
    ...(Delegation7702 ? { Delegation7702 } : {}),
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

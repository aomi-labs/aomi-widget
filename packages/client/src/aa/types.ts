import type { Chain, Hex } from "viem";

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type AAMode = "4337" | "7702";
export type AASponsorship = "disabled" | "optional" | "required";

// ---------------------------------------------------------------------------
// Call Types
// ---------------------------------------------------------------------------

export type AAWalletCall = {
  to: Hex;
  value: bigint;
  data?: Hex;
  chainId: number;
};

/** The subset of AAWalletCall passed to wallet send methods (chainId already resolved). */
export type AACallPayload = Omit<AAWalletCall, "chainId">;

export type WalletCapabilities = {
  atomic?: {
    status?: string;
  };
  paymasterService?: {
    supported?: boolean;
  };
  [key: string]: unknown;
};

export type WalletAtomicCapability = WalletCapabilities;

// ---------------------------------------------------------------------------
// Execution Params / Results
// ---------------------------------------------------------------------------

export interface ExecutionResult {
  txHash: string;
  txHashes: string[];
  executionKind: string;
  batched: boolean;
  /**
   * Whether gas was paid by a paymaster.
   *
   * - `true`: paymaster paid, verified by the protocol
   *   (`sponsorship.mode === "required"` fails the tx if the paymaster
   *   rejects).
   * - `false`: no paymaster was attached (EOA path, or sendCalls fallback
   *   to sequential after sponsored-batch error).
   * - `undefined`: paymaster config was passed but the wallet may have
   *   silently fallen back to user-paid (Base Account with
   *   `sponsorship.mode === "optional"`). We cannot tell post-hoc without
   *   decoding the userOp logs.
   */
  sponsored: boolean | undefined;
}

export interface AtomicBatchArgs {
  calls: AACallPayload[];
  chainId?: number;
  connector?: unknown;
  capabilities?: {
    atomic?: {
      required?: boolean;
      optional?: boolean;
    };
    paymasterService?: {
      context?: Record<string, unknown>;
      optional?: boolean;
      url: string;
    };
    [key: string]: unknown;
  };
  forceAtomic?: boolean;
  pollingInterval?: number;
  status?: (status: unknown) => boolean;
  throwOnFailure?: boolean;
  timeout?: number;
  version?: string;
}

export type NativeWalletSponsorship =
  | {
      mode: "disabled";
    }
  | {
      mode: "optional";
      paymasterServiceUrl?: string;
      paymasterServiceContext?: SponsorshipPaymasterServiceContext;
    }
  | {
      mode: "required";
      paymasterServiceUrl?: string;
      paymasterServiceContext?: SponsorshipPaymasterServiceContext;
    };

export type SponsorshipPaymasterServiceContext = Record<string, unknown> & {
  erc20?: never;
  paymasterAddress?: never;
};

export interface NativeWalletExecutionPolicy {
  executionKind?: string;
  requiresAtomicForBatch?: boolean;
  sendCallsTimeoutMs?: number;
  sendCallsVersion?: string;
  sponsorship?: NativeWalletSponsorship;
}

export interface ExecuteWalletCallsParams {
  callList: AAWalletCall[];
  currentChainId: number | undefined;
  capabilities: Record<string, WalletCapabilities> | undefined;
  localPrivateKey: `0x${string}` | null;
  nativeWalletExecution?: NativeWalletExecutionPolicy;
  sendCallsSyncAsync: (args: AtomicBatchArgs) => Promise<unknown>;
  sendTransactionAsync: (args: {
    chainId: number;
    to: Hex;
    value: bigint;
    data?: Hex;
  }) => Promise<string>;
  switchChainAsync: (params: { chainId: number }) => Promise<unknown>;
  chainsById: Record<number, Chain>;
  getPreferredRpcUrl: (chain: Chain) => string;
}

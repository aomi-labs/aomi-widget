import type { Chain, Hex } from "viem";

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type AAProvider = "alchemy" | "pimlico";
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
// Config
// ---------------------------------------------------------------------------

export interface AAChainConfig {
  chainId: number;
  enabled: boolean;
  defaultMode: AAMode;
  supportedModes: AAMode[];
  allowBatching: boolean;
  sponsorship: AASponsorship;
}

export interface AAConfig {
  enabled: boolean;
  provider: AAProvider;
  chains: AAChainConfig[];
}

// ---------------------------------------------------------------------------
// Execution Plan
// ---------------------------------------------------------------------------

export interface AAResolvedConfig {
  provider: AAProvider;
  chainId: number;
  mode: AAMode;
  batchingEnabled: boolean;
  sponsorship: AASponsorship;
}

// ---------------------------------------------------------------------------
// Provider Abstractions
// ---------------------------------------------------------------------------

/** The subset of AAWalletCall passed to smart account send methods (chainId already resolved). */
export type AACallPayload = Omit<AAWalletCall, "chainId">;

/**
 * Smart account used for AA execution. `address` is the EOA signer — the same
 * value the user sees as their connected wallet address (`AomiAuthIdentity.address`).
 *
 * Exactly one of the mode-discriminated address fields is meaningful:
 * - `mode === "4337"` ⟹ `SmartAccount4337` is the AA contract address;
 *   `Delegation7702` is undefined.
 * - `mode === "7702"` ⟹ `Delegation7702` is the delegation target contract;
 *   `SmartAccount4337` is undefined.
 */
export interface SmartAccount {
  provider: "alchemy" | "pimlico";
  mode: "4337" | "7702";
  address: Hex;
  SmartAccount4337?: Hex;
  Delegation7702?: Hex;
  sendTransaction: (
    call: AACallPayload,
  ) => Promise<{ transactionHash: string }>;
  sendBatchTransaction: (
    calls: AACallPayload[],
  ) => Promise<{ transactionHash: string }>;
}

export interface AAState<TAccount extends SmartAccount = SmartAccount> {
  resolved: AAResolvedConfig | null;
  account?: TAccount | null;
  pending: boolean;
  error: Error | null;
}

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
   * - `true`: paymaster paid, verified by the protocol (4337 userOp success
   *   requires paymaster validation; `sponsorship.mode === "required"`
   *   fails the tx if the paymaster rejects).
   * - `false`: no paymaster was attached (EOA path, or sendCalls fallback
   *   to sequential after sponsored-batch error).
   * - `undefined`: paymaster config was passed but the wallet may have
   *   silently fallen back to user-paid (Base Account with
   *   `sponsorship.mode === "optional"`). We cannot tell post-hoc without
   *   decoding the userOp logs.
   */
  sponsored: boolean | undefined;
  SmartAccount4337?: Hex;
  Delegation7702?: Hex;
}

export interface AtomicBatchArgs {
  calls: AACallPayload[];
  chainId?: number;
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

export interface ExecuteWalletCallsParams<
  TAccount extends SmartAccount = SmartAccount,
> {
  callList: AAWalletCall[];
  currentChainId: number;
  capabilities: Record<string, WalletCapabilities> | undefined;
  localPrivateKey: `0x${string}` | null;
  nativeWalletExecution?: NativeWalletExecutionPolicy;
  providerState: AAState<TAccount>;
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

// ---------------------------------------------------------------------------
// Validation Sets
// ---------------------------------------------------------------------------

export const MODES = new Set<AAMode>(["4337", "7702"]);
export const SPONSORSHIP_MODES = new Set<AASponsorship>([
  "disabled",
  "optional",
  "required",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Config Planning
// ---------------------------------------------------------------------------

export function getAAChainConfig(
  config: AAConfig,
  calls: AAWalletCall[],
  chainsById: Record<number, Chain>,
): AAChainConfig | null {
  if (!config.enabled || calls.length === 0) {
    return null;
  }

  const chainIds = Array.from(new Set(calls.map((call) => call.chainId)));
  if (chainIds.length !== 1) {
    return null;
  }

  const chainId = chainIds[0];
  if (!chainsById[chainId]) {
    return null;
  }

  const chainConfig = config.chains.find((item) => item.chainId === chainId);
  if (!chainConfig?.enabled) {
    return null;
  }
  if (calls.length > 1 && !chainConfig.allowBatching) {
    return null;
  }

  return chainConfig;
}

export function buildAAExecutionPlan(
  config: AAConfig,
  chainConfig: AAChainConfig,
): AAResolvedConfig {
  const mode = chainConfig.supportedModes.includes(chainConfig.defaultMode)
    ? chainConfig.defaultMode
    : chainConfig.supportedModes[0];

  if (!mode) {
    throw new Error(
      `No smart account mode configured for chain ${chainConfig.chainId}`,
    );
  }

  return {
    provider: config.provider,
    chainId: chainConfig.chainId,
    mode,
    batchingEnabled: chainConfig.allowBatching,
    sponsorship: chainConfig.sponsorship,
  };
}

// ---------------------------------------------------------------------------
// Readiness Check
// ---------------------------------------------------------------------------

export function getWalletExecutorReady(providerState: AAState): boolean {
  return (
    !providerState.resolved ||
    (!providerState.pending &&
      (Boolean(providerState.account) || Boolean(providerState.error)))
  );
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export const DEFAULT_AA_CONFIG: AAConfig = {
  enabled: true,
  provider: "alchemy",
  chains: [
    {
      chainId: 1,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
      allowBatching: true,
      sponsorship: "optional",
    },
    {
      chainId: 137,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
      allowBatching: true,
      sponsorship: "optional",
    },
    {
      chainId: 42161,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
      allowBatching: true,
      sponsorship: "optional",
    },
    {
      chainId: 10,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
      allowBatching: true,
      sponsorship: "optional",
    },
    {
      chainId: 8453,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["7702", "4337"],
      allowBatching: true,
      sponsorship: "optional",
    },
  ],
};

export const DISABLED_PROVIDER_STATE: AAState = {
  resolved: null,
  account: undefined,
  pending: false,
  error: null,
};

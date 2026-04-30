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

export type WalletAtomicCapability = {
  atomic?: {
    status?: string;
  };
};

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

export interface SmartAccount {
  provider: string;
  mode: string;
  AAAddress?: Hex;
  delegationAddress?: Hex;
  sendTransaction: (call: AACallPayload) => Promise<{ transactionHash: string }>;
  sendBatchTransaction: (calls: AACallPayload[]) => Promise<{ transactionHash: string }>;
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
  sponsored: boolean;
  AAAddress?: Hex;
  delegationAddress?: Hex;
}

export interface AtomicBatchArgs {
  calls: AACallPayload[];
  chainId?: number;
  capabilities?: {
    atomic?: {
      required?: boolean;
      optional?: boolean;
    };
  };
}

export interface ExecuteWalletCallsParams<
  TAccount extends SmartAccount = SmartAccount,
> {
  callList: AAWalletCall[];
  currentChainId: number;
  capabilities: Record<string, WalletAtomicCapability> | undefined;
  localPrivateKey: `0x${string}` | null;
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
    throw new Error(`No smart account mode configured for chain ${chainConfig.chainId}`);
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

export function getWalletExecutorReady(
  providerState: AAState,
): boolean {
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

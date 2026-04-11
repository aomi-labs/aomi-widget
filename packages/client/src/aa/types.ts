import type { Chain, Hex } from "viem";

import type { AAProvider } from "./env";

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type AAMode = "4337" | "7702";
export type AASponsorship = "disabled" | "optional" | "required";

// ---------------------------------------------------------------------------
// Call Types
// ---------------------------------------------------------------------------

export type WalletCall = {
  to: string;
  value: string;
  data?: string;
  chainId: number;
};

export type WalletAtomicCapability = {
  atomic?: {
    status?: string;
  };
};

export type WalletPrimitiveCall = {
  to: Hex;
  value: bigint;
  data?: Hex;
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
  fallbackToEoa: boolean;
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
  fallbackToEoa: boolean;
}

// ---------------------------------------------------------------------------
// Provider Abstractions
// ---------------------------------------------------------------------------

export interface SmartAccount {
  provider: string;
  mode: string;
  AAAddress?: Hex;
  delegationAddress?: Hex;
  sendTransaction: (call: WalletPrimitiveCall) => Promise<{ transactionHash: string }>;
  sendBatchTransaction: (calls: WalletPrimitiveCall[]) => Promise<{ transactionHash: string }>;
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
  calls: WalletPrimitiveCall[];
  capabilities?: {
    atomic?: {
      required?: boolean;
    };
  };
}

export interface ExecuteWalletCallsParams<
  TAccount extends SmartAccount = SmartAccount,
> {
  callList: WalletCall[];
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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function assertChainConfig(
  value: unknown,
  index: number,
): asserts value is AAChainConfig {
  if (!isObject(value)) {
    throw new Error(`Invalid AA config chain at index ${index}: expected object`);
  }

  if (typeof value.chainId !== "number") {
    throw new Error(`Invalid AA config chain at index ${index}: chainId must be a number`);
  }
  if (typeof value.enabled !== "boolean") {
    throw new Error(`Invalid AA config chain ${value.chainId}: enabled must be a boolean`);
  }
  if (!MODES.has(value.defaultMode as AAMode)) {
    throw new Error(`Invalid AA config chain ${value.chainId}: unsupported defaultMode`);
  }
  if (!Array.isArray(value.supportedModes) || value.supportedModes.length === 0) {
    throw new Error(`Invalid AA config chain ${value.chainId}: supportedModes must be a non-empty array`);
  }
  if (!value.supportedModes.every((mode) => MODES.has(mode as AAMode))) {
    throw new Error(`Invalid AA config chain ${value.chainId}: supportedModes contains an unsupported mode`);
  }
  if (!value.supportedModes.includes(value.defaultMode)) {
    throw new Error(`Invalid AA config chain ${value.chainId}: defaultMode must be in supportedModes`);
  }
  if (typeof value.allowBatching !== "boolean") {
    throw new Error(`Invalid AA config chain ${value.chainId}: allowBatching must be a boolean`);
  }
  if (!SPONSORSHIP_MODES.has(value.sponsorship as AASponsorship)) {
    throw new Error(`Invalid AA config chain ${value.chainId}: unsupported sponsorship mode`);
  }
}

// ---------------------------------------------------------------------------
// Config Parsing & Planning
// ---------------------------------------------------------------------------

export function parseAAConfig(
  value: unknown,
): AAConfig {
  if (!isObject(value)) {
    throw new Error("Invalid AA config: expected object");
  }

  if (typeof value.enabled !== "boolean") {
    throw new Error("Invalid AA config: enabled must be a boolean");
  }
  if (typeof value.provider !== "string" || !value.provider) {
    throw new Error("Invalid AA config: provider must be a non-empty string");
  }
  if (value.provider !== "alchemy" && value.provider !== "pimlico") {
    throw new Error("Invalid AA config: provider must be either \"alchemy\" or \"pimlico\"");
  }
  if (typeof value.fallbackToEoa !== "boolean") {
    throw new Error("Invalid AA config: fallbackToEoa must be a boolean");
  }
  if (!Array.isArray(value.chains)) {
    throw new Error("Invalid AA config: chains must be an array");
  }

  value.chains.forEach((chain, index) => assertChainConfig(chain, index));

  return {
    enabled: value.enabled,
    provider: value.provider,
    fallbackToEoa: value.fallbackToEoa,
    chains: value.chains as AAChainConfig[],
  };
}

export function getAAChainConfig(
  config: AAConfig,
  calls: WalletCall[],
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
    fallbackToEoa: config.fallbackToEoa,
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
      (Boolean(providerState.account) ||
        Boolean(providerState.error) ||
        providerState.resolved.fallbackToEoa))
  );
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export function mapCall(call: WalletCall): WalletPrimitiveCall {
  return {
    to: call.to as Hex,
    value: BigInt(call.value),
    data: call.data ? (call.data as Hex) : undefined,
  };
}

export const DEFAULT_AA_CONFIG: AAConfig = {
  enabled: true,
  provider: "alchemy",
  fallbackToEoa: true,
  chains: [
    {
      chainId: 1,
      enabled: true,
      defaultMode: "7702",
      supportedModes: ["4337", "7702"],
      allowBatching: true,
      sponsorship: "optional",
    },
    {
      chainId: 137,
      enabled: true,
      defaultMode: "4337",
      supportedModes: ["4337", "7702"],
      allowBatching: true,
      sponsorship: "optional",
    },
    {
      chainId: 42161,
      enabled: true,
      defaultMode: "4337",
      supportedModes: ["4337", "7702"],
      allowBatching: true,
      sponsorship: "optional",
    },
    {
      chainId: 10,
      enabled: true,
      defaultMode: "4337",
      supportedModes: ["4337", "7702"],
      allowBatching: true,
      sponsorship: "optional",
    },
    {
      chainId: 8453,
      enabled: true,
      defaultMode: "4337",
      supportedModes: ["4337", "7702"],
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

export async function executeWalletCalls(
  params: ExecuteWalletCallsParams,
): Promise<ExecutionResult> {
  const {
    callList,
    currentChainId,
    capabilities,
    localPrivateKey,
    providerState,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl,
  } = params;

  if (providerState.resolved && providerState.account) {
    return executeViaAA(callList, providerState);
  }

  if (providerState.resolved && providerState.error && !providerState.resolved.fallbackToEoa) {
    throw providerState.error;
  }

  return executeViaEoa({
    callList,
    currentChainId,
    capabilities,
    localPrivateKey,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl,
  });
}

// ---------------------------------------------------------------------------
// Internal Execution Paths
// ---------------------------------------------------------------------------

async function executeViaAA(
  callList: WalletCall[],
  providerState: AAState,
): Promise<ExecutionResult> {
  const account = providerState.account;
  const resolved = providerState.resolved;

  if (!account || !resolved) {
    throw providerState.error ?? new Error("smart_account_unavailable");
  }

  const callsPayload = callList.map(mapCall);
  const receipt =
    callList.length > 1
      ? await account.sendBatchTransaction(callsPayload)
      : await account.sendTransaction(callsPayload[0]);
  const txHash = receipt.transactionHash;
  const providerPrefix = account.provider.toLowerCase();

  // For 7702, the SDK may not provide the delegation address (or provide the
  // EOA which is already filtered out by adaptSmartAccount).  Fall back to
  // reading the authorization list from the on-chain transaction.
  let delegationAddress: Hex | undefined =
    account.mode === "7702" ? account.delegationAddress : undefined;

  if (account.mode === "7702" && !delegationAddress) {
    delegationAddress = await resolve7702Delegation(txHash, callList);
  }

  return {
    txHash,
    txHashes: [txHash],
    executionKind: `${providerPrefix}_${account.mode}`,
    batched: callList.length > 1,
    sponsored: resolved.sponsorship !== "disabled",
    AAAddress: account.AAAddress,
    delegationAddress,
  };
}

/**
 * Best-effort extraction of the 7702 delegation target from the on-chain
 * transaction's authorization list.  Returns `undefined` on any failure so
 * the caller can safely fall through.
 */
async function resolve7702Delegation(
  txHash: string,
  callList: WalletCall[],
): Promise<Hex | undefined> {
  try {
    const { createPublicClient, http } = await import("viem");
    const chainId = callList[0]?.chainId;
    if (!chainId) return undefined;

    const { mainnet, polygon, arbitrum, optimism, base } = await import("viem/chains");
    const knownChains: Record<number, Parameters<typeof createPublicClient>[0]["chain"]> = {
      1: mainnet, 137: polygon, 42161: arbitrum, 10: optimism, 8453: base,
    };
    const chain = knownChains[chainId];
    if (!chain) return undefined;

    const client = createPublicClient({ chain, transport: http() });
    const tx = await client.getTransaction({ hash: txHash as Hex });
    const authList = (
      tx as unknown as {
        authorizationList?: Array<{ address?: Hex; contractAddress?: Hex }>;
      }
    ).authorizationList;
    const target = authList?.[0]?.address ?? authList?.[0]?.contractAddress;
    if (target) {
      return target;
    }
  } catch {
    // Best-effort — don't fail the whole execution.
  }
  return undefined;
}

async function executeViaEoa({
  callList,
  currentChainId,
  capabilities,
  localPrivateKey,
  sendCallsSyncAsync,
  sendTransactionAsync,
  switchChainAsync,
  chainsById,
  getPreferredRpcUrl,
}: Omit<ExecuteWalletCallsParams, "providerState">): Promise<ExecutionResult> {
  const { createPublicClient, createWalletClient, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");

  const hashes: string[] = [];

  if (localPrivateKey) {
    for (const call of callList) {
      const chain = chainsById[call.chainId];
      if (!chain) {
        throw new Error(`Unsupported chain ${call.chainId}`);
      }
      const rpcUrl = getPreferredRpcUrl(chain);
      if (!rpcUrl) {
        throw new Error(`No RPC for chain ${call.chainId}`);
      }

      const account = privateKeyToAccount(localPrivateKey);
      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
      });
      const hash = await walletClient.sendTransaction({
        account,
        to: call.to as Hex,
        value: BigInt(call.value),
        data: call.data ? (call.data as Hex) : undefined,
      });
      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      hashes.push(hash);
    }

    return {
      txHash: hashes[hashes.length - 1],
      txHashes: hashes,
      executionKind: "eoa",
      batched: hashes.length > 1,
      sponsored: false,
    };
  }

  const chainIds = Array.from(new Set(callList.map((call) => call.chainId)));
  if (chainIds.length > 1) {
    throw new Error("mixed_chain_bundle_not_supported");
  }

  const chainId = chainIds[0];
  if (currentChainId !== chainId) {
    await switchChainAsync({ chainId });
  }

  const chainCaps = capabilities?.[`eip155:${chainId}`];
  const atomicStatus = chainCaps?.atomic?.status;
  const canUseSendCalls = atomicStatus === "supported" || atomicStatus === "ready";

  if (canUseSendCalls) {
    const batchResult = await sendCallsSyncAsync({
      calls: callList.map(mapCall),
      capabilities: {
        atomic: {
          required: true,
        },
      },
    });

    const receipts =
      (batchResult as { receipts?: Array<{ transactionHash?: string }> }).receipts ??
      [];
    for (const receipt of receipts) {
      if (receipt.transactionHash) {
        hashes.push(receipt.transactionHash);
      }
    }
  } else {
    for (const call of callList) {
      const hash = await sendTransactionAsync({
        chainId: call.chainId,
        to: call.to as Hex,
        value: BigInt(call.value),
        data: call.data ? (call.data as Hex) : undefined,
      });
      hashes.push(hash);
    }
  }

  return {
    txHash: hashes[hashes.length - 1],
    txHashes: hashes,
    executionKind: "eoa",
    batched: hashes.length > 1,
    sponsored: false,
  };
}

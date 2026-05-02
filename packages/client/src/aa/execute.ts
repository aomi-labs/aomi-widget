import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Chain, Hex } from "viem";
import { CHAINS_BY_ID } from "../chains";

import type {
  AACallPayload,
  AAState,
  AAWalletCall,
  AtomicBatchArgs,
  ExecuteWalletCallsParams,
  ExecutionResult,
  NativeWalletExecutionPolicy,
  SponsorshipPaymasterServiceContext,
  WalletCapabilities,
} from "./types";

const ERC20_PAYMENT_CONTEXT_KEYS = new Set(["erc20", "paymasterAddress"]);
const AA_DEBUG_STORAGE_KEYS = ["aomi:debug-aa", "AOMI_DEBUG_AA"];

function normalizeRpcCallData(data: Hex | undefined): Hex | undefined {
  return data === "0x" ? undefined : data;
}

function isAADebugEnabled(): boolean {
  const debugGlobal = globalThis as typeof globalThis & {
    __AOMI_DEBUG_AA?: boolean;
    localStorage?: Storage;
  };

  if (debugGlobal.__AOMI_DEBUG_AA === true) {
    return true;
  }

  try {
    return AA_DEBUG_STORAGE_KEYS.some((key) => {
      const value = debugGlobal.localStorage?.getItem(key);
      return value === "1" || value === "true";
    });
  } catch {
    return false;
  }
}

function debugAA(label: string, data: unknown) {
  if (!isAADebugEnabled()) return;
  console.info(`[aomi][aa][debug] ${label}`, data);
}

// ---------------------------------------------------------------------------
// Public Entry Point
// ---------------------------------------------------------------------------

export async function executeWalletCalls(
  params: ExecuteWalletCallsParams,
): Promise<ExecutionResult> {
  const {
    callList,
    currentChainId,
    capabilities,
    localPrivateKey,
    nativeWalletExecution,
    providerState,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl,
  } = params;

  if (providerState.resolved && providerState.account) {
    try {
      return await executeViaAA(callList, providerState, getPreferredRpcUrl);
    } catch (error) {
      if (!shouldFallbackFromAAError(error, providerState)) {
        throw error;
      }
      const errorKind = classifyAAFallbackError(error);
      console.error("[aomi][aa] AA execution failed; falling back to EOA", {
        provider: providerState.account.provider,
        mode: providerState.resolved.mode,
        chainId: providerState.resolved.chainId,
        callCount: callList.length,
        errorKind,
        error: toErrorMessage(error),
      });
      if (errorKind === "simulation_revert") {
        console.warn(
          "[aomi][aa] 4337 simulation reverted. This often means the smart account context (balance/allowance/state) differs from EOA.",
        );
      }
      if (errorKind === "insufficient_prefund") {
        console.warn(
          "[aomi][aa] 4337 precheck indicates insufficient sender balance/deposit. Configure sponsorship or fund the smart account.",
        );
      }
      return executeViaEoa({
        callList,
        currentChainId,
        capabilities,
        localPrivateKey,
        nativeWalletExecution,
        sendCallsSyncAsync,
        sendTransactionAsync,
        switchChainAsync,
        chainsById,
        getPreferredRpcUrl,
      });
    }
  }

  if (providerState.resolved && providerState.error) {
    throw providerState.error;
  }

  return executeViaEoa({
    callList,
    currentChainId,
    capabilities,
    localPrivateKey,
    nativeWalletExecution,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl,
  });
}

// ---------------------------------------------------------------------------
// Internal — AA Path
// ---------------------------------------------------------------------------

async function executeViaAA(
  callList: AAWalletCall[],
  providerState: AAState,
  getPreferredRpcUrl: (chain: Chain) => string,
): Promise<ExecutionResult> {
  const account = providerState.account;
  const resolved = providerState.resolved;

  if (!account || !resolved) {
    throw providerState.error ?? new Error("smart_account_unavailable");
  }

  const callsPayload: AACallPayload[] = callList.map(({ to, value, data }) => ({
    to,
    value,
    data: normalizeRpcCallData(data),
  }));
  const sendAARequest = async () => {
    return callList.length > 1
      ? account.sendBatchTransaction(callsPayload)
      : account.sendTransaction(callsPayload[0]);
  };

  let receipt;
  try {
    receipt = await sendAARequest();
  } catch (error) {
    if (!isRetryableBundlerSubmissionError(error)) {
      throw error;
    }
    console.warn(
      "[aomi][aa] transient bundler submission error; retrying once",
      {
        provider: account.provider,
        mode: account.mode,
        chainId: resolved.chainId,
        callCount: callList.length,
        error: toErrorMessage(error),
      },
    );
    try {
      receipt = await sendAARequest();
    } catch (retryError) {
      console.error(
        "[aomi][aa] AA retry failed after transient bundler submission error",
        {
          provider: account.provider,
          mode: account.mode,
          chainId: resolved.chainId,
          callCount: callList.length,
          firstError: toErrorMessage(error),
          retryError: toErrorMessage(retryError),
        },
      );
      throw retryError;
    }
  }
  const txHash = receipt.transactionHash;
  const providerPrefix = account.provider.toLowerCase();

  // For 7702, the SDK may not provide the delegation address (or provide the
  // EOA which is already filtered out by adaptSmartAccount).  Fall back to
  // reading the authorization list from the on-chain transaction.
  let delegationAddress: Hex | undefined =
    account.mode === "7702" ? account.delegationAddress : undefined;

  if (account.mode === "7702" && !delegationAddress) {
    delegationAddress = await resolve7702Delegation(txHash, callList, getPreferredRpcUrl);
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
  callList: AAWalletCall[],
  getPreferredRpcUrl: (chain: Chain) => string,
): Promise<Hex | undefined> {
  try {
    const chainId = callList[0]?.chainId;
    if (!chainId) return undefined;

    const chain = CHAINS_BY_ID[chainId];
    if (!chain) return undefined;

    const rpcUrl = getPreferredRpcUrl(chain);
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
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

// ---------------------------------------------------------------------------
// Internal — EOA Path
// ---------------------------------------------------------------------------

async function executeViaEoa({
  callList,
  currentChainId,
  capabilities,
  localPrivateKey,
  nativeWalletExecution,
  sendCallsSyncAsync,
  sendTransactionAsync,
  switchChainAsync,
  chainsById,
  getPreferredRpcUrl,
}: Omit<ExecuteWalletCallsParams, "providerState">): Promise<ExecutionResult> {
  const hashes: string[] = [];
  const normalizedCalls = callList.map((call) => ({
    ...call,
    data: normalizeRpcCallData(call.data),
  }));
  const requiresAtomicForBatch =
    Boolean(nativeWalletExecution?.requiresAtomicForBatch) &&
    normalizedCalls.length > 1;
  const nativeExecutionKind = nativeWalletExecution?.executionKind ?? "eoa";
  const sponsorship = nativeWalletExecution?.sponsorship;
  const requiresSponsoredSendCalls = sponsorship?.mode === "required";

  if (localPrivateKey) {
    if (requiresSponsoredSendCalls) {
      throw new Error("wallet_sponsorship_requires_send_calls");
    }

    if (requiresAtomicForBatch) {
      throw new Error("wallet_atomic_batch_required");
    }

    for (const call of normalizedCalls) {
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
        to: call.to,
        value: call.value,
        data: call.data,
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
      batched: normalizedCalls.length > 1,
      sponsored: false,
    };
  }

  const chainIds = Array.from(
    new Set(normalizedCalls.map((call) => call.chainId)),
  );
  if (chainIds.length > 1) {
    throw new Error("mixed_chain_bundle_not_supported");
  }

  const chainId = chainIds[0];
  if (currentChainId !== chainId) {
    await switchChainAsync({ chainId });
  }

  const chainCaps = resolveChainCapabilities(capabilities, chainId);
  const atomicStatus = chainCaps?.atomic?.status;
  const canUseAtomicSendCalls =
    normalizedCalls.length > 1 &&
    (atomicStatus === "supported" || atomicStatus === "ready");
  const canUseSendCalls = canUseAtomicSendCalls || requiresSponsoredSendCalls;
  const sendCallsCapabilities = buildSendCallsCapabilities({
    chainCaps,
    nativeWalletExecution,
    requiresAtomicForBatch,
    canUseAtomicSendCalls,
  });

  debugAA("native-wallet-sendCalls-plan", {
    callCount: normalizedCalls.length,
    chainId,
    chainCaps,
    canUseAtomicSendCalls,
    canUseSendCalls,
    nativeExecutionKind,
    requiresAtomicForBatch,
    sponsorshipMode: sponsorship?.mode ?? "disabled",
    sendCallsCapabilities,
  });

  const sendSequentially = async () => {
    if (requiresAtomicForBatch) {
      throw new Error("wallet_atomic_batch_required");
    }

    for (const call of normalizedCalls) {
      const hash = await sendTransactionAsync({
        chainId: call.chainId,
        to: call.to,
        value: call.value,
        data: call.data,
      });
      hashes.push(hash);
    }
  };
  let usedPaymasterService = false;
  let usedSendCalls = false;

  if (canUseSendCalls) {
    try {
      const sendCallsArgs = {
        chainId,
        calls: normalizedCalls.map(({ to, value, data }) => ({
          to,
          value,
          data,
        })),
        capabilities: sendCallsCapabilities,
        forceAtomic: requiresAtomicForBatch,
        status: (result: unknown) =>
          (result as { status?: string } | undefined)?.status === "success",
        throwOnFailure: true,
        timeout: nativeWalletExecution?.sendCallsTimeoutMs,
        version: nativeWalletExecution?.sendCallsVersion,
      };
      debugAA("native-wallet-sendCalls-args", sendCallsArgs);
      const batchResult = await sendCallsSyncAsync({
        ...sendCallsArgs,
      });
      debugAA("native-wallet-sendCalls-result", batchResult);

      hashes.push(...extractBatchTransactionHashes(batchResult));
      usedPaymasterService = Boolean(sendCallsCapabilities?.paymasterService);
      usedSendCalls = true;
    } catch (error) {
      if (!isUnsupportedAtomicCapabilityError(error)) {
        throw error;
      }
      if (requiresSponsoredSendCalls) {
        throw new Error("wallet_sponsorship_required");
      }
      await sendSequentially();
    }
  } else {
    await sendSequentially();
  }

  return {
    txHash: hashes[hashes.length - 1],
    txHashes: hashes,
    executionKind: usedSendCalls ? nativeExecutionKind : "eoa",
    batched: normalizedCalls.length > 1,
    sponsored: usedPaymasterService,
  };
}

export function extractBatchTransactionHashes(batchResult: unknown): string[] {
  const receipts =
    (
      batchResult as {
        receipts?: Array<{ transactionHash?: string; hash?: string }>;
      }
    ).receipts ?? [];
  const hashes = receipts.flatMap((receipt) => {
    const hash = receipt.transactionHash ?? receipt.hash;
    return hash ? [hash] : [];
  });

  if (hashes.length === 0) {
    throw new Error("wallet_send_calls_missing_transaction_hash");
  }

  return hashes;
}

function buildSendCallsCapabilities({
  chainCaps,
  nativeWalletExecution,
  requiresAtomicForBatch,
  canUseAtomicSendCalls,
}: {
  chainCaps: WalletCapabilities | undefined;
  nativeWalletExecution: NativeWalletExecutionPolicy | undefined;
  requiresAtomicForBatch: boolean;
  canUseAtomicSendCalls: boolean;
}): AtomicBatchArgs["capabilities"] | undefined {
  const capabilities: AtomicBatchArgs["capabilities"] = {};

  if (canUseAtomicSendCalls) {
    capabilities.atomic = requiresAtomicForBatch
      ? { required: true }
      : { optional: true };
  }

  const sponsorship = nativeWalletExecution?.sponsorship;
  if (sponsorship?.mode === "required") {
    if (!sponsorship.paymasterServiceUrl) {
      throw new Error("wallet_paymaster_service_url_required");
    }
    if (chainCaps?.paymasterService?.supported !== true) {
      throw new Error("wallet_paymaster_service_unsupported");
    }

    const context = sanitizeSponsorshipPaymasterServiceContext(
      sponsorship.paymasterServiceContext,
    );

    capabilities.paymasterService = {
      url: sponsorship.paymasterServiceUrl,
      context: context ?? {},
    };
  } else if (
    sponsorship?.mode === "optional" &&
    sponsorship.paymasterServiceUrl &&
    chainCaps?.paymasterService?.supported === true
  ) {
    const context = sanitizeSponsorshipPaymasterServiceContext(
      sponsorship.paymasterServiceContext,
    );

    capabilities.paymasterService = {
      url: sponsorship.paymasterServiceUrl,
      optional: true,
      ...(context ? { context } : {}),
    };
  }

  return Object.keys(capabilities).length > 0 ? capabilities : undefined;
}

function sanitizeSponsorshipPaymasterServiceContext(
  context: SponsorshipPaymasterServiceContext | undefined,
): SponsorshipPaymasterServiceContext | undefined {
  if (!context) return undefined;

  const filteredEntries = Object.entries(context).filter(
    ([key]) => !ERC20_PAYMENT_CONTEXT_KEYS.has(key),
  );

  if (filteredEntries.length === Object.keys(context).length) {
    return context;
  }

  console.warn(
    "[aomi][aa] Ignoring ERC20 paymaster payment context on a sponsorship request",
  );

  const filteredContext = Object.fromEntries(
    filteredEntries,
  ) as SponsorshipPaymasterServiceContext;
  return Object.keys(filteredContext).length > 0 ? filteredContext : undefined;
}

function isUnsupportedAtomicCapabilityError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("unsupported non-optional capabilities: atomic") ||
    (lowered.includes("unsupported") && lowered.includes("atomic")) ||
    (lowered.includes("wallet does not support") &&
      lowered.includes("capabilit"))
  );
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}

function shouldFallbackFromAAError(
  error: unknown,
  providerState: AAState,
): boolean {
  if (!providerState.resolved) {
    return false;
  }

  // 7702 is additive over EOA, so execution failures can safely fall back.
  if (providerState.resolved.mode === "7702") {
    return true;
  }

  if (providerState.resolved.mode !== "4337") {
    return false;
  }

  return (
    isRetryableBundlerSubmissionError(error) ||
    isAASimulationRevertError(error) ||
    isAAInsufficientPrefundError(error)
  );
}

function isRetryableBundlerSubmissionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();

  return (
    lowered.includes("bundle id is unknown") ||
    lowered.includes("bundle id unknown") ||
    lowered.includes("has not been submitted") ||
    (lowered.includes("userop") && lowered.includes("not found")) ||
    (lowered.includes("user operation") && lowered.includes("not found"))
  );
}

function isAASimulationRevertError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    (lowered.includes("eth_estimateuseroperationgas") &&
      lowered.includes("execution reverted")) ||
    (lowered.includes("wallet_preparecalls") &&
      (lowered.includes("aa23 reverted") ||
        lowered.includes("validation reverted")))
  );
}

function isAAInsufficientPrefundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  const lowered = message.toLowerCase();
  return (
    lowered.includes("sender balance and deposit together") ||
    (lowered.includes("precheck failed") &&
      lowered.includes("must be at least"))
  );
}

function classifyAAFallbackError(
  error: unknown,
):
  | "retryable_bundler"
  | "simulation_revert"
  | "insufficient_prefund"
  | "other" {
  if (isRetryableBundlerSubmissionError(error)) {
    return "retryable_bundler";
  }
  if (isAAInsufficientPrefundError(error)) {
    return "insufficient_prefund";
  }
  if (isAASimulationRevertError(error)) {
    return "simulation_revert";
  }
  return "other";
}

function resolveChainCapabilities(
  capabilities: ExecuteWalletCallsParams["capabilities"],
  chainId: number,
): WalletCapabilities | undefined {
  if (!capabilities) {
    return undefined;
  }

  const asRecord = capabilities as Record<string, WalletCapabilities>;
  const eip155Key = `eip155:${chainId}`;
  const decimalKey = String(chainId);
  const hexKey = `0x${chainId.toString(16)}`;

  return asRecord[eip155Key] ?? asRecord[decimalKey] ?? asRecord[hexKey];
}

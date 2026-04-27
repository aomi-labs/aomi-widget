import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { CHAINS_BY_ID } from "../chains";

import type {
  AACallPayload,
  AAState,
  AAWalletCall,
  ExecuteWalletCallsParams,
  ExecutionResult,
  WalletAtomicCapability,
} from "./types";

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
    providerState,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
    chainsById,
    getPreferredRpcUrl,
  } = params;

  if (providerState.resolved && providerState.account) {
    try {
      return await executeViaAA(callList, providerState);
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
        sendCallsSyncAsync,
        sendTransactionAsync,
        switchChainAsync,
        chainsById,
        getPreferredRpcUrl,
      });
    }
  }

  if (
    providerState.resolved &&
    providerState.error &&
    !providerState.resolved.fallbackToEoa
  ) {
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
// Internal — AA Path
// ---------------------------------------------------------------------------

async function executeViaAA(
  callList: AAWalletCall[],
  providerState: AAState,
): Promise<ExecutionResult> {
  const account = providerState.account;
  const resolved = providerState.resolved;

  if (!account || !resolved) {
    throw providerState.error ?? new Error("smart_account_unavailable");
  }

  const callsPayload: AACallPayload[] = callList.map(({ to, value, data }) => ({
    to,
    value,
    data,
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
  callList: AAWalletCall[],
): Promise<Hex | undefined> {
  try {
    const chainId = callList[0]?.chainId;
    if (!chainId) return undefined;

    const chain = CHAINS_BY_ID[chainId];
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

// ---------------------------------------------------------------------------
// Internal — EOA Path
// ---------------------------------------------------------------------------

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

  const chainCaps = resolveChainCapabilities(capabilities, chainId);
  const atomicStatus = chainCaps?.atomic?.status;
  const canUseSendCalls =
    callList.length > 1 &&
    (atomicStatus === "supported" || atomicStatus === "ready");
  const atomicCapabilityRequest = canUseSendCalls
    ? { optional: true }
    : undefined;

  const sendSequentially = async () => {
    for (const call of callList) {
      const hash = await sendTransactionAsync({
        chainId: call.chainId,
        to: call.to,
        value: call.value,
        data: call.data,
      });
      hashes.push(hash);
    }
  };

  if (canUseSendCalls) {
    try {
      const batchResult = await sendCallsSyncAsync({
        chainId,
        calls: callList.map(({ to, value, data }) => ({ to, value, data })),
        capabilities: atomicCapabilityRequest
          ? {
              atomic: atomicCapabilityRequest,
            }
          : undefined,
      });

      const receipts =
        (batchResult as { receipts?: Array<{ transactionHash?: string }> })
          .receipts ?? [];
      for (const receipt of receipts) {
        if (receipt.transactionHash) {
          hashes.push(receipt.transactionHash);
        }
      }
    } catch (error) {
      if (!isUnsupportedAtomicCapabilityError(error)) {
        throw error;
      }
      await sendSequentially();
    }
  } else {
    await sendSequentially();
  }

  return {
    txHash: hashes[hashes.length - 1],
    txHashes: hashes,
    executionKind: "eoa",
    batched: hashes.length > 1,
    sponsored: false,
  };
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

  // 7702 is additive over EOA — any execution failure is safe to fallback
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
      (lowered.includes("aa23 reverted") || lowered.includes("validation reverted")))
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
): WalletAtomicCapability | undefined {
  if (!capabilities) {
    return undefined;
  }

  const asRecord = capabilities as Record<string, WalletAtomicCapability>;
  const eip155Key = `eip155:${chainId}`;
  const decimalKey = String(chainId);
  const hexKey = `0x${chainId.toString(16)}`;

  return asRecord[eip155Key] ?? asRecord[decimalKey] ?? asRecord[hexKey];
}

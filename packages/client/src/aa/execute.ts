import type { Hex } from "viem";
import { CHAINS_BY_ID } from "../chains";

import type {
  AACallPayload,
  AAState,
  AAWalletCall,
  ExecuteWalletCallsParams,
  ExecutionResult,
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

  const callsPayload: AACallPayload[] = callList.map(({ to, value, data }) => ({ to, value, data }));
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
  callList: AAWalletCall[],
): Promise<Hex | undefined> {
  try {
    const { createPublicClient, http } = await import("viem");
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

  const chainCaps = capabilities?.[`eip155:${chainId}`];
  const atomicStatus = chainCaps?.atomic?.status;
  const canUseSendCalls = atomicStatus === "supported" || atomicStatus === "ready";

  if (canUseSendCalls) {
    const batchResult = await sendCallsSyncAsync({
      calls: callList.map(({ to, value, data }) => ({ to, value, data })),
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
        to: call.to,
        value: call.value,
        data: call.data,
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

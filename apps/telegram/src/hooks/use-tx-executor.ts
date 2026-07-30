"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { isAddress, isHex, type Hex } from "viem";

import {
  executeWalletCalls,
  type AAWalletCall,
  type ExecutionResult,
} from "@aomi-labs/client";

import { CHAIN_BY_ID } from "@/lib/chains";
import { getPreferredRpcUrl } from "@/lib/rpc";
import type { TxCall } from "@/lib/wallet-state/types";

// Re-export for consumers
export type TransactionExecutionResult = ExecutionResult;

function toWalletExecutionCall(call: TxCall): AAWalletCall {
  const { to, data } = call;

  if (!isAddress(to)) {
    throw new Error(`Invalid transaction recipient: ${to}`);
  }
  if (data !== undefined && !isHex(data)) {
    throw new Error("Invalid transaction data");
  }

  return {
    to,
    value: BigInt(call.value),
    data,
    chainId: call.chainId,
  };
}

// ---------------------------------------------------------------------------
// Transaction Executor Hook
// ---------------------------------------------------------------------------

interface UseTxExecutorParams {
  calls: TxCall[] | null;
  currentChainId: number;
  capabilities: Record<string, { atomic?: { status?: string } }> | undefined;
  localPrivateKey: `0x${string}` | null;
  sendCallsSyncAsync: (args: {
    calls: Array<{ to: Hex; value: bigint; data?: Hex }>;
    capabilities?: {
      atomic?: {
        required?: boolean;
      };
    };
  }) => Promise<unknown>;
  sendTransactionAsync: (args: {
    chainId: number;
    to: Hex;
    value: bigint;
    data?: Hex;
  }) => Promise<string>;
  switchChainAsync: (params: { chainId: number }) => Promise<unknown>;
}

/**
 * Native wallet execution only: local private key or the connected wallet
 * (EIP-5792 sendCalls / sendTransaction). Client-side smart accounts were
 * removed — AA runs server-side in the backend.
 */
export function useTxExecutor({
  calls,
  currentChainId,
  capabilities,
  localPrivateKey,
  sendCallsSyncAsync,
  sendTransactionAsync,
  switchChainAsync,
}: UseTxExecutorParams) {
  const { isConnected } = useAccount();
  const effectiveLocalPrivateKey = isConnected ? null : localPrivateKey;

  const execute = useMemo(() => {
    return async (callList: TxCall[]): Promise<TransactionExecutionResult> => {
      return executeWalletCalls({
        callList: callList.map(toWalletExecutionCall),
        currentChainId,
        capabilities,
        localPrivateKey: effectiveLocalPrivateKey,
        sendCallsSyncAsync,
        sendTransactionAsync,
        switchChainAsync,
        chainsById: CHAIN_BY_ID,
        getPreferredRpcUrl,
      });
    };
  }, [
    currentChainId,
    capabilities,
    effectiveLocalPrivateKey,
    sendCallsSyncAsync,
    sendTransactionAsync,
    switchChainAsync,
  ]);

  return {
    executorReady: true,
    execute,
  };
}

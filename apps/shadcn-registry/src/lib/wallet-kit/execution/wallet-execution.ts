"use client";

import type { Chain } from "viem";
import type {
  NativeWalletExecutionPolicy as ClientNativeWalletExecutionPolicy,
  SponsorshipPaymasterServiceContext,
  WalletCapabilities,
  WalletTxPayload,
} from "@aomi-labs/react";
import {
  aaModeFromExecutionKind,
  executeWalletCalls,
  toAAWalletCalls,
} from "@aomi-labs/react";
import type { AomiTxResult } from "../types";

export type RequestedAAMode = "none" | "4337" | "7702";
export type WalletExecutionCallList = Parameters<
  typeof executeWalletCalls
>[0]["callList"];

export type WalletExecutionKitState = {
  currentChainId?: number;
  capabilities?: Parameters<typeof executeWalletCalls>[0]["capabilities"];
  nativeWalletExecution?: NativeWalletExecutionPolicy;
  sendCallsSyncAsync?: Parameters<
    typeof executeWalletCalls
  >[0]["sendCallsSyncAsync"];
  sendTransactionAsync?: Parameters<
    typeof executeWalletCalls
  >[0]["sendTransactionAsync"];
  switchChainAsync?: Parameters<
    typeof executeWalletCalls
  >[0]["switchChainAsync"];
  chainsById: Record<number, Chain>;
  getPreferredRpcUrl?: (chain: Chain) => string;
};

export type NativeWalletExecutionPolicy = Omit<
  ClientNativeWalletExecutionPolicy,
  "sponsorship"
> & {
  sponsorship?:
    | { mode: "disabled" }
    | {
        mode: "optional";
        getPaymasterServiceContext?: (
          chainId: number,
        ) => SponsorshipPaymasterServiceContext | undefined;
        getPaymasterServiceUrl?: (chainId: number) => string | undefined;
      }
    | {
        mode: "required";
        getPaymasterServiceContext?: (
          chainId: number,
        ) => SponsorshipPaymasterServiceContext | undefined;
        getPaymasterServiceUrl?: (chainId: number) => string | undefined;
      };
};

export function getPreferredRpcUrl(chain: Chain): string {
  return chain.rpcUrls.default.http[0] ?? chain.rpcUrls.public?.http[0] ?? "";
}

/**
 * The AA mode the payload asked for — reporting only. Client-side smart
 * accounts were removed; account abstraction for staged calls happens
 * server-side. The connected wallet may still execute atomically/sponsored
 * via EIP-5792 `sendCalls`, reported through `executionKind`.
 */
export function resolveRequestedAAMode(
  payload: WalletTxPayload,
  isBatch: boolean,
): RequestedAAMode {
  if (payload.aaPreference === "none") return "none";
  if (!isBatch && !payload.aaStrict) return "none";
  if (payload.aaPreference === "eip4337") return "4337";
  return "7702";
}

export function normalizeAtomicCapabilities(
  raw: Record<string, WalletCapabilities> | undefined,
): Record<string, WalletCapabilities> | undefined {
  if (!raw) return undefined;

  const normalized: Record<string, WalletCapabilities> = {};
  for (const [key, capability] of Object.entries(raw)) {
    normalized[key] =
      capability.atomic?.status === "ready"
        ? {
            ...capability,
            atomic: {
              ...capability.atomic,
              status: "supported",
            },
          }
        : capability;
  }

  return normalized;
}

function resolveNativeWalletExecutionPolicy({
  policy,
  chainId,
  requiresAtomicForBatch,
}: {
  policy?: NativeWalletExecutionPolicy;
  chainId: number;
  requiresAtomicForBatch: boolean;
}): ClientNativeWalletExecutionPolicy | undefined {
  if (!policy && !requiresAtomicForBatch) {
    return undefined;
  }

  const sponsorship =
    policy?.sponsorship?.mode === "optional" ||
    policy?.sponsorship?.mode === "required"
      ? {
          mode: policy.sponsorship.mode,
          paymasterServiceContext:
            policy.sponsorship.getPaymasterServiceContext?.(chainId),
          paymasterServiceUrl:
            policy.sponsorship.getPaymasterServiceUrl?.(chainId),
        }
      : policy?.sponsorship;

  return {
    executionKind: policy?.executionKind,
    requiresAtomicForBatch:
      requiresAtomicForBatch || policy?.requiresAtomicForBatch,
    sendCallsTimeoutMs: policy?.sendCallsTimeoutMs,
    sendCallsVersion: policy?.sendCallsVersion,
    sponsorship,
  };
}

export async function executeWalletKitTransaction({
  payload,
  state,
}: {
  payload: WalletTxPayload;
  state: WalletExecutionKitState;
}): Promise<AomiTxResult> {
  if (!payload.to && (!payload.calls || payload.calls.length === 0)) {
    throw new Error("pending_transaction_missing_call_data");
  }

  if (!state.sendTransactionAsync) {
    throw new Error("wallet_send_transaction_not_supported");
  }
  const sendTransactionAsync = state.sendTransactionAsync;
  const sendCallsSyncAsync = state.sendCallsSyncAsync;
  const switchChainAsync = state.switchChainAsync;

  const callList = toAAWalletCalls(
    payload,
    payload.chainId ?? state.currentChainId ?? 1,
  );
  const isBatch = callList.length > 1;
  const aaRequestedMode = resolveRequestedAAMode(payload, isBatch);
  // Atomic-required is a payload-level intent (`aaStrict === true`): a
  // fee-injected or dependent batch must not be silently split into
  // sequential sends.
  const requiresAtomicForBatch = isBatch && payload.aaStrict === true;
  const nativeWalletExecution = resolveNativeWalletExecutionPolicy({
    policy: state.nativeWalletExecution,
    chainId: callList[0]?.chainId ?? state.currentChainId ?? 1,
    requiresAtomicForBatch,
  });

  const execution = await executeWalletCalls({
    callList,
    currentChainId: state.currentChainId ?? callList[0]?.chainId ?? 1,
    capabilities: state.capabilities,
    localPrivateKey: null,
    nativeWalletExecution,
    sendCallsSyncAsync: sendCallsSyncAsync
      ? async (args) => sendCallsSyncAsync(args)
      : async () => {
          throw new Error("wallet_send_calls_not_supported");
        },
    sendTransactionAsync,
    switchChainAsync: switchChainAsync
      ? async ({ chainId }) => switchChainAsync({ chainId })
      : async () => {
          throw new Error("wallet_switch_chain_not_supported");
        },
    chainsById: state.chainsById,
    getPreferredRpcUrl: state.getPreferredRpcUrl ?? getPreferredRpcUrl,
  });

  if (!execution.txHash) {
    throw new Error("wallet_execution_missing_transaction_hash");
  }

  const aaResolvedMode: RequestedAAMode =
    aaModeFromExecutionKind(execution.executionKind) ?? "none";

  return {
    txHash: execution.txHash,
    amount: payload.value,
    aaRequestedMode,
    aaResolvedMode,
    aaFallbackReason:
      aaRequestedMode !== "none" && aaResolvedMode === "none"
        ? "aa_unavailable_fallback_eoa"
        : undefined,
    executionKind: execution.executionKind,
    batched: execution.batched,
    callCount: callList.length,
    sponsored: execution.sponsored,
  };
}

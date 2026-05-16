"use client";

import type { Chain } from "viem";
import type {
  NativeWalletExecutionPolicy as ClientNativeWalletExecutionPolicy,
  SponsorshipPaymasterServiceContext,
  WalletTxPayload,
} from "@aomi-labs/react";
import {
  DISABLED_PROVIDER_STATE,
  aaModeFromExecutionKind,
  executeWalletCalls,
  toAAWalletCalls,
} from "@aomi-labs/react";
import type { AomiTxResult } from "./types";

export type RequestedAAMode = "none" | "4337" | "7702";
export type WalletProviderState = Parameters<
  typeof executeWalletCalls
>[0]["providerState"];
export type WalletExecutionCallList = Parameters<
  typeof executeWalletCalls
>[0]["callList"];

export type WalletExecutionAdapterState = {
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

export type ResolveAAProviderState = (params: {
  callList: WalletExecutionCallList;
  chainsById: Record<number, Chain>;
  requestedMode: Exclude<RequestedAAMode, "none">;
  shouldUseExternalSigner: boolean;
  sponsored?: boolean;
}) => Promise<{
  providerState: WalletProviderState;
  resolvedMode: RequestedAAMode;
  fallbackReason?: string;
}>;

export function getPreferredRpcUrl(chain: Chain): string {
  return chain.rpcUrls.default.http[0] ?? chain.rpcUrls.public?.http[0] ?? "";
}

export function resolveRequestedAAMode(
  payload: WalletTxPayload,
  isBatch: boolean,
  preferAAForSingleCall = false,
  forceAA = false,
): RequestedAAMode {
  if (!forceAA && !isBatch && !preferAAForSingleCall) return "none";
  if (!forceAA && payload.aaPreference === "none" && isBatch) return "none";
  if (payload.aaPreference === "eip4337") return "4337";
  return "7702";
}

export function normalizeAtomicCapabilities(
  raw: Parameters<typeof executeWalletCalls>[0]["capabilities"] | undefined,
): Parameters<typeof executeWalletCalls>[0]["capabilities"] | undefined {
  if (!raw) return undefined;

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      normalized[key] = value;
      continue;
    }

    const record = value as {
      atomic?: { status?: string };
      [field: string]: unknown;
    };
    normalized[key] =
      record.atomic?.status === "ready"
        ? {
            ...record,
            atomic: {
              ...record.atomic,
              status: "supported",
            },
          }
        : value;
  }

  return normalized as Parameters<typeof executeWalletCalls>[0]["capabilities"];
}

function buildAaAttempts(
  aaRequestedMode: RequestedAAMode,
  shouldUseExternalSigner: boolean,
): Array<{
  requestedMode: Exclude<RequestedAAMode, "none">;
  sponsored?: boolean;
}> {
  if (aaRequestedMode === "7702") {
    if (shouldUseExternalSigner) {
      return [{ requestedMode: "4337", sponsored: true }];
    }
    return [
      { requestedMode: "7702" },
      { requestedMode: "4337", sponsored: true },
    ];
  }

  if (aaRequestedMode === "4337") {
    return [{ requestedMode: "4337", sponsored: true }];
  }

  return [];
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

function hasResolvedAAProviderState(
  providerState: WalletProviderState,
): boolean {
  return Boolean(providerState.resolved);
}

export async function executeAdapterTransaction({
  payload,
  state,
  shouldUseExternalSigner = false,
  resolveAAProviderState,
  preferAAForSingleCall = false,
  forceAA = false,
}: {
  payload: WalletTxPayload;
  state: WalletExecutionAdapterState;
  shouldUseExternalSigner?: boolean;
  resolveAAProviderState?: ResolveAAProviderState;
  preferAAForSingleCall?: boolean;
  forceAA?: boolean;
}): Promise<AomiTxResult> {
  if (!payload.to && (!payload.calls || payload.calls.length === 0)) {
    throw new Error("pending_transaction_missing_call_data");
  }

  if (!state.sendTransactionAsync) {
    throw new Error("wallet_send_transaction_not_supported");
  }
  const sendTransactionAsync = state.sendTransactionAsync;

  const callList = toAAWalletCalls(
    payload,
    payload.chainId ?? state.currentChainId ?? 1,
  );
  const isBatch = callList.length > 1;
  const aaRequestedMode = resolveRequestedAAMode(
    payload,
    isBatch,
    preferAAForSingleCall,
    forceAA,
  );
  const requiresSponsoredExecution =
    state.nativeWalletExecution?.sponsorship?.mode === "required";
  // Atomic-required is a payload-level intent (`aaStrict === true`),
  // independent of the provider's sponsorship mode. Conflating them
  // (commit 1d406d2) forces every sponsored batch into atomic+no-fallback
  // and breaks fee-injected 2-call batches when the wallet/bundler errors
  // after sign. `requiresSponsoredExecution` still drives fail-closed
  // semantics in the AA-failure exit path below.
  const requiresAtomicForBatch = isBatch && payload.aaStrict === true;
  const nativeWalletExecution = resolveNativeWalletExecutionPolicy({
    policy: state.nativeWalletExecution,
    chainId: callList[0]?.chainId ?? state.currentChainId ?? 1,
    requiresAtomicForBatch,
  });

  const executeWithProviderState = async (providerState: WalletProviderState) =>
    executeWalletCalls({
      callList,
      currentChainId: state.currentChainId ?? callList[0]?.chainId ?? 1,
      capabilities: state.capabilities,
      localPrivateKey: null,
      nativeWalletExecution,
      providerState,
      sendCallsSyncAsync: state.sendCallsSyncAsync
        ? async (args) => {
            return state.sendCallsSyncAsync?.({
              ...args,
            });
          }
        : async () => {
            throw new Error("wallet_send_calls_not_supported");
          },
      sendTransactionAsync,
      switchChainAsync: state.switchChainAsync
        ? async ({ chainId }) => {
            return state.switchChainAsync?.({ chainId });
          }
        : async () => {
            throw new Error("wallet_switch_chain_not_supported");
          },
      chainsById: state.chainsById,
      getPreferredRpcUrl: state.getPreferredRpcUrl ?? getPreferredRpcUrl,
    });

  let execution: Awaited<ReturnType<typeof executeWalletCalls>> | null = null;
  let finalFallbackReason: string | undefined;
  let lastAAError: unknown;
  let sawUnresolvedAAProviderState = false;
  const aaStateResolver = resolveAAProviderState;
  const aaAttempts = aaStateResolver
    ? buildAaAttempts(aaRequestedMode, shouldUseExternalSigner)
    : [];

  if (aaAttempts.length === 0) {
    execution = await executeWithProviderState(DISABLED_PROVIDER_STATE);
  } else {
    if (!aaStateResolver) {
      throw new Error("aa_provider_state_resolver_missing");
    }
    for (const attempt of aaAttempts) {
      const attemptState = await aaStateResolver({
        callList,
        chainsById: state.chainsById,
        requestedMode: attempt.requestedMode,
        shouldUseExternalSigner,
        sponsored: attempt.sponsored,
      });

      if (attemptState.fallbackReason && !finalFallbackReason) {
        finalFallbackReason = attemptState.fallbackReason;
      }

      if (!hasResolvedAAProviderState(attemptState.providerState)) {
        sawUnresolvedAAProviderState = true;
        continue;
      }

      try {
        execution = await executeWithProviderState(attemptState.providerState);
        if (
          aaRequestedMode === "7702" &&
          attempt.requestedMode === "4337" &&
          !finalFallbackReason
        ) {
          finalFallbackReason = "requested_7702_fallback_4337";
        }
        break;
      } catch (error) {
        lastAAError = error;
        console.warn("[aomi-auth-adapter] AA attempt failed", {
          requestedMode: attempt.requestedMode,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (!execution) {
      if (requiresSponsoredExecution) {
        throw new Error(finalFallbackReason ?? "aa_required_execution_failed");
      }
      if (payload.aaStrict && lastAAError && !sawUnresolvedAAProviderState) {
        throw new Error(finalFallbackReason ?? "aa_required_execution_failed");
      }
      console.warn(
        "[aomi-auth-adapter] All AA attempts failed; falling back to native wallet",
        {
          error:
            lastAAError instanceof Error
              ? lastAAError.message
              : String(lastAAError ?? "unknown"),
        },
      );
      execution = await executeWithProviderState(DISABLED_PROVIDER_STATE);
      finalFallbackReason = finalFallbackReason ?? "aa_failed_fallback_eoa";
    }
  }

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
      finalFallbackReason ??
      (aaRequestedMode === "7702" && aaResolvedMode === "4337"
        ? "requested_7702_fallback_4337"
        : aaRequestedMode !== "none" && aaResolvedMode === "none"
          ? "aa_unavailable_fallback_eoa"
          : undefined),
    executionKind: execution.executionKind,
    batched: execution.batched,
    callCount: callList.length,
    sponsored: execution.sponsored,
    SmartAccount4337: execution.SmartAccount4337,
    Delegation7702: execution.Delegation7702,
  };
}

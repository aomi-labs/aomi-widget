"use client";

import type { Chain } from "viem";
import type {
  NativeWalletExecutionPolicy as ClientNativeWalletExecutionPolicy,
  SponsorshipPaymasterServiceContext,
  WalletTxDebugTraceEntry,
  WalletTxFailureMetadata,
  WalletTxFallbackAttempt,
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

const DEFAULT_AA_REQUESTED_MODE: RequestedAAMode = "7702";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export class AomiTxExecutionError extends Error {
  metadata: WalletTxFailureMetadata;

  constructor(
    message: string,
    metadata: WalletTxFailureMetadata,
    cause?: unknown,
  ) {
    super(message);
    this.name = "AomiTxExecutionError";
    this.metadata = metadata;
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export function getAomiTxFailureMetadata(
  error: unknown,
): WalletTxFailureMetadata | undefined {
  return error instanceof AomiTxExecutionError ? error.metadata : undefined;
}

export function resolveRequestedAAMode(): RequestedAAMode {
  return DEFAULT_AA_REQUESTED_MODE;
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

function buildAaAttempts(): Array<{
  requestedMode: Exclude<RequestedAAMode, "none">;
  sponsored?: boolean;
}> {
  return [
    { requestedMode: "7702" },
    { requestedMode: "4337", sponsored: true },
  ];
}

function resolveNativeWalletExecutionPolicy({
  policy,
  chainId,
}: {
  policy?: NativeWalletExecutionPolicy;
  chainId: number;
}): ClientNativeWalletExecutionPolicy | undefined {
  if (!policy) {
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
    requiresAtomicForBatch: policy?.requiresAtomicForBatch,
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
}: {
  payload: WalletTxPayload;
  state: WalletExecutionAdapterState;
  shouldUseExternalSigner?: boolean;
  resolveAAProviderState?: ResolveAAProviderState;
}): Promise<AomiTxResult> {
  const debugTrace: WalletTxDebugTraceEntry[] = [];
  const fallbackAttempts: WalletTxFallbackAttempt[] = [];

  const buildFailureMetadata = (params: {
    error: string;
    aaResolvedMode?: RequestedAAMode;
    aaFallbackReason?: string;
    executionKind?: string;
    sponsored?: boolean;
  }): WalletTxFailureMetadata => ({
    error: params.error,
    aaRequestedMode: DEFAULT_AA_REQUESTED_MODE,
    aaResolvedMode: params.aaResolvedMode ?? "none",
    aaFallbackReason: params.aaFallbackReason,
    executionKind: params.executionKind,
    batched:
      Array.isArray(payload.calls) && payload.calls.length > 0
        ? payload.calls.length > 1
        : false,
    callCount:
      Array.isArray(payload.calls) && payload.calls.length > 0
        ? payload.calls.length
        : 1,
    sponsored: params.sponsored,
    aaFallbackAttempts: fallbackAttempts,
    walletDebugTrace: debugTrace,
  });

  if (!payload.to && (!payload.calls || payload.calls.length === 0)) {
    const message = "pending_transaction_missing_call_data";
    debugTrace.push({
      layer: "executeAdapterTransaction",
      step: "payload.validate",
      status: "terminal",
      message,
    });
    throw new AomiTxExecutionError(
      message,
      buildFailureMetadata({
        error: message,
        aaFallbackReason: "payload_missing_call_data",
      }),
    );
  }

  if (!state.sendTransactionAsync) {
    const message = "wallet_send_transaction_not_supported";
    debugTrace.push({
      layer: "executeAdapterTransaction",
      step: "native.prepare",
      status: "terminal",
      mode: "none",
      message,
    });
    throw new AomiTxExecutionError(
      message,
      buildFailureMetadata({
        error: message,
        aaFallbackReason: "native_wallet_send_transaction_missing",
        executionKind: "eoa",
      }),
    );
  }
  const sendTransactionAsync = state.sendTransactionAsync;

  const callList = toAAWalletCalls(
    payload,
    payload.chainId ?? state.currentChainId ?? 1,
  );
  const aaRequestedMode = resolveRequestedAAMode();
  const nativeWalletExecution = resolveNativeWalletExecutionPolicy({
    policy: state.nativeWalletExecution,
    chainId: callList[0]?.chainId ?? state.currentChainId ?? 1,
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
  const aaAttempts = aaStateResolver ? buildAaAttempts() : [];

  if (aaAttempts.length === 0) {
    debugTrace.push({
      layer: "executeAdapterTransaction",
      step: "native.execute",
      status: "started",
      mode: "none",
      callCount: callList.length,
    });
    try {
      execution = await executeWithProviderState(DISABLED_PROVIDER_STATE);
    } catch (error) {
      const message = errorMessage(error);
      debugTrace.push({
        layer: "executeAdapterTransaction",
        step: "native.execute",
        status: "terminal",
        mode: "none",
        callCount: callList.length,
        message,
      });
      throw new AomiTxExecutionError(
        message,
        buildFailureMetadata({
          error: message,
          aaFallbackReason: "native_wallet_execution_failed",
          executionKind: "eoa",
          sponsored: false,
        }),
        error,
      );
    }
  } else {
    if (!aaStateResolver) {
      throw new Error("aa_provider_state_resolver_missing");
    }
    for (const [index, attempt] of aaAttempts.entries()) {
      debugTrace.push({
        layer: "executeAdapterTransaction",
        step: "aa.resolve_provider_state",
        status: "started",
        mode: attempt.requestedMode,
        sponsored: attempt.sponsored,
        callCount: callList.length,
      });
      let attemptState: Awaited<ReturnType<ResolveAAProviderState>>;
      try {
        attemptState = await aaStateResolver({
          callList,
          chainsById: state.chainsById,
          requestedMode: attempt.requestedMode,
          shouldUseExternalSigner,
          sponsored: attempt.sponsored,
        });
      } catch (error) {
        const message = errorMessage(error);
        lastAAError = error;
        fallbackAttempts.push({
          order: index + 1,
          layer: "aa.resolve_provider_state",
          mode: attempt.requestedMode,
          status: "failed",
          sponsored: attempt.sponsored,
          error: message,
        });
        debugTrace.push({
          layer: "executeAdapterTransaction",
          step: "aa.resolve_provider_state",
          status: "failed",
          mode: attempt.requestedMode,
          sponsored: attempt.sponsored,
          callCount: callList.length,
          message,
        });
        continue;
      }

      if (attemptState.fallbackReason && !finalFallbackReason) {
        finalFallbackReason = attemptState.fallbackReason;
      }

      if (!hasResolvedAAProviderState(attemptState.providerState)) {
        sawUnresolvedAAProviderState = true;
        const reason =
          attemptState.fallbackReason ?? "aa_provider_state_unresolved";
        fallbackAttempts.push({
          order: index + 1,
          layer: "aa.resolve_provider_state",
          mode: attempt.requestedMode,
          status: "skipped",
          sponsored: attempt.sponsored,
          reason,
        });
        debugTrace.push({
          layer: "executeAdapterTransaction",
          step: "aa.resolve_provider_state",
          status: "skipped",
          mode: attempt.requestedMode,
          sponsored: attempt.sponsored,
          callCount: callList.length,
          reason,
        });
        continue;
      }

      const provider = attemptState.providerState.resolved?.provider;
      debugTrace.push({
        layer: "executeAdapterTransaction",
        step: "aa.resolve_provider_state",
        status: "resolved",
        mode: attempt.requestedMode,
        provider,
        sponsored: attempt.sponsored,
        callCount: callList.length,
      });
      debugTrace.push({
        layer: "executeAdapterTransaction",
        step: "aa.execute",
        status: "started",
        mode: attempt.requestedMode,
        provider,
        sponsored: attempt.sponsored,
        callCount: callList.length,
      });
      try {
        execution = await executeWithProviderState(attemptState.providerState);
        fallbackAttempts.push({
          order: index + 1,
          layer: "aa.execute",
          mode: attempt.requestedMode,
          status: "succeeded",
          provider,
          sponsored: execution.sponsored,
          executionKind: execution.executionKind,
        });
        debugTrace.push({
          layer: "executeAdapterTransaction",
          step: "aa.execute",
          status: "resolved",
          mode: attempt.requestedMode,
          provider,
          executionKind: execution.executionKind,
          sponsored: execution.sponsored,
          callCount: callList.length,
        });
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
        const message = errorMessage(error);
        fallbackAttempts.push({
          order: index + 1,
          layer: "aa.execute",
          mode: attempt.requestedMode,
          status: "failed",
          provider,
          sponsored: attempt.sponsored,
          error: message,
        });
        debugTrace.push({
          layer: "executeAdapterTransaction",
          step: "aa.execute",
          status: "failed",
          mode: attempt.requestedMode,
          provider,
          sponsored: attempt.sponsored,
          callCount: callList.length,
          message,
        });
        console.warn("[aomi-auth-adapter] AA attempt failed", {
          requestedMode: attempt.requestedMode,
          error: message,
        });
      }
    }

    if (!execution) {
      const fallbackError =
        lastAAError === undefined ? undefined : errorMessage(lastAAError);
      console.warn(
        "[aomi-auth-adapter] All AA attempts failed; falling back to native wallet",
        {
          error: fallbackError ?? "unknown",
        },
      );
      finalFallbackReason = finalFallbackReason ?? "aa_failed_fallback_eoa";
      debugTrace.push({
        layer: "executeAdapterTransaction",
        step: "native.fallback",
        status: "fallback",
        mode: "none",
        callCount: callList.length,
        reason: finalFallbackReason,
        message: fallbackError,
      });
      debugTrace.push({
        layer: "executeAdapterTransaction",
        step: "native.execute",
        status: "started",
        mode: "none",
        callCount: callList.length,
        reason: finalFallbackReason,
      });
      try {
        execution = await executeWithProviderState(DISABLED_PROVIDER_STATE);
      } catch (error) {
        const message = errorMessage(error);
        debugTrace.push({
          layer: "executeAdapterTransaction",
          step: "native.execute",
          status: "terminal",
          mode: "none",
          callCount: callList.length,
          reason: finalFallbackReason,
          message,
        });
        throw new AomiTxExecutionError(
          message,
          buildFailureMetadata({
            error: message,
            aaFallbackReason: finalFallbackReason,
            executionKind: "eoa",
            sponsored: false,
          }),
          error,
        );
      }
    }
  }

  if (!execution.txHash) {
    const message = "wallet_execution_missing_transaction_hash";
    debugTrace.push({
      layer: "executeAdapterTransaction",
      step: "wallet.result",
      status: "terminal",
      mode: aaModeFromExecutionKind(execution.executionKind) ?? "none",
      executionKind: execution.executionKind,
      sponsored: execution.sponsored,
      callCount: callList.length,
      message,
    });
    throw new AomiTxExecutionError(
      message,
      buildFailureMetadata({
        error: message,
        aaResolvedMode:
          aaModeFromExecutionKind(execution.executionKind) ?? "none",
        aaFallbackReason: finalFallbackReason,
        executionKind: execution.executionKind,
        sponsored: execution.sponsored,
      }),
    );
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

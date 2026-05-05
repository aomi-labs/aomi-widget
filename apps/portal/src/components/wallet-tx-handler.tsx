"use client";

import { useEffect, useMemo, useRef } from "react";
import { useClient } from "@getpara/react-sdk";
import {
  hydrateTxPayloadFromUserState,
  toAAWalletCalls,
  toViemSignTypedDataArgs,
  useAomiRuntime,
  type WalletEip712Payload,
  type WalletRequest,
  type WalletTxPayload,
} from "@aomi-labs/react";
import {
  createAAProviderState,
  executeWalletCalls,
  type AAMode,
  type AAProvider,
} from "@aomi-labs/client";
import type { Hex } from "viem";
import {
  useAccount,
  useCapabilities,
  useConfig,
  useSendCallsSync,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
  useWalletClient,
} from "wagmi";

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() ?? "";
const ALCHEMY_GAS_POLICY_ID =
  process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID?.trim();
const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY?.trim() ?? "";
const AA_PROVIDER_OVERRIDE =
  process.env.NEXT_PUBLIC_AA_PROVIDER?.trim().toLowerCase();

function parseChainId(value: number | string | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

const getPreferredRpcUrl: Parameters<
  typeof executeWalletCalls
>[0]["getPreferredRpcUrl"] = (chain) => {
  const maybeChain = chain as unknown as {
    rpcUrls?: {
      default?: { http?: readonly string[] };
      public?: { http?: readonly string[] };
    };
  };

  return (
    maybeChain.rpcUrls?.default?.http?.[0] ??
    maybeChain.rpcUrls?.public?.http?.[0] ??
    ""
  );
};

const EOA_PROVIDER_STATE: Parameters<
  typeof executeWalletCalls
>[0]["providerState"] = {
  resolved: null,
  account: undefined,
  pending: false,
  error: null,
};

type RequestedAAMode = "none" | "4337" | "7702";
type WalletProviderState = Parameters<
  typeof executeWalletCalls
>[0]["providerState"];
type WalletExecutionCallList = Parameters<
  typeof executeWalletCalls
>[0]["callList"];
type ChainsById = Parameters<typeof executeWalletCalls>[0]["chainsById"];

function hasHydratedCalls(payload: WalletTxPayload): boolean {
  return Array.isArray(payload.calls) && payload.calls.length > 0;
}

function resolveRequestedAAMode(
  payload: WalletTxPayload,
  isBatch: boolean,
): RequestedAAMode {
  if (!isBatch) return "none";
  if (payload.aaPreference === "none") return "none";
  if (payload.aaPreference === "eip7702") return "7702";
  if (payload.aaPreference === "eip4337") return "4337";
  return "7702";
}

function resolveAAProvider(): AAProvider | null {
  if (
    AA_PROVIDER_OVERRIDE === "alchemy" ||
    AA_PROVIDER_OVERRIDE === "pimlico"
  ) {
    return AA_PROVIDER_OVERRIDE;
  }

  if (ALCHEMY_API_KEY) return "alchemy";
  if (PIMLICO_API_KEY) return "pimlico";
  return null;
}

function inferResolvedAAMode(executionKind: string): RequestedAAMode {
  if (executionKind.endsWith("_7702")) return "7702";
  if (executionKind.endsWith("_4337")) return "4337";
  return "none";
}

async function resolveAAProviderState({
  callList,
  chainsById,
  requestedMode,
  shouldUseExternalSigner,
  paraSession,
  walletClient,
  address,
  sponsored,
}: {
  callList: WalletExecutionCallList;
  chainsById: ChainsById;
  requestedMode: RequestedAAMode;
  shouldUseExternalSigner: boolean;
  paraSession: ReturnType<typeof useClient>;
  walletClient: ReturnType<typeof useWalletClient>["data"];
  address: string | undefined;
  sponsored?: boolean;
}): Promise<{
  providerState: WalletProviderState;
  resolvedMode: RequestedAAMode;
  fallbackReason?: string;
}> {
  if (requestedMode === "none") {
    return {
      providerState: EOA_PROVIDER_STATE,
      resolvedMode: "none",
    };
  }

  let resolvedMode: RequestedAAMode = requestedMode;
  let fallbackReason: string | undefined;
  if (requestedMode === "7702" && shouldUseExternalSigner) {
    resolvedMode = "4337";
    fallbackReason = "requested_7702_connected_wallet_fallback_4337";
  }

  const provider = resolveAAProvider();
  if (!provider) {
    return {
      providerState: EOA_PROVIDER_STATE,
      resolvedMode,
      fallbackReason:
        fallbackReason ?? "aa_provider_not_configured_fallback_eoa",
    };
  }

  if (!paraSession) {
    return {
      providerState: EOA_PROVIDER_STATE,
      resolvedMode,
      fallbackReason: fallbackReason ?? "para_session_unavailable_fallback_eoa",
    };
  }

  const chainId = callList[0]?.chainId;
  const chain = chainId ? chainsById[chainId] : undefined;
  if (!chainId || !chain) {
    return {
      providerState: EOA_PROVIDER_STATE,
      resolvedMode,
      fallbackReason: fallbackReason ?? "aa_chain_not_supported_fallback_eoa",
    };
  }

  const apiKey =
    provider === "alchemy"
      ? ALCHEMY_API_KEY || undefined
      : PIMLICO_API_KEY || undefined;
  if (!apiKey) {
    return {
      providerState: EOA_PROVIDER_STATE,
      resolvedMode,
      fallbackReason:
        fallbackReason ?? `aa_${provider}_api_key_missing_fallback_eoa`,
    };
  }

  const ownerBase = {
    kind: "session" as const,
    adapter: "para",
    session: paraSession,
    address: address as Hex | undefined,
  };
  const owner =
    shouldUseExternalSigner && walletClient
      ? {
          ...ownerBase,
          signer: walletClient,
        }
      : ownerBase;

  try {
    const state = await createAAProviderState({
      provider,
      owner,
      chain,
      rpcUrl: getPreferredRpcUrl(chain),
      callList,
      mode: resolvedMode as AAMode,
      apiKey,
      gasPolicyId: provider === "alchemy" ? ALCHEMY_GAS_POLICY_ID : undefined,
      sponsored,
    });

    if (!state.account || state.error) {
      console.warn("[WalletTxHandler] AA unavailable; falling back to EOA", {
        provider,
        mode: resolvedMode,
        error: state.error?.message ?? "account_unavailable",
      });
      return {
        providerState: EOA_PROVIDER_STATE,
        resolvedMode,
        fallbackReason:
          fallbackReason ?? `aa_${provider}_account_unavailable_fallback_eoa`,
      };
    }

    return {
      providerState: state,
      resolvedMode,
      fallbackReason,
    };
  } catch (error) {
    console.warn("[WalletTxHandler] AA init failed; falling back to EOA", {
      provider,
      mode: resolvedMode,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      providerState: EOA_PROVIDER_STATE,
      resolvedMode,
      fallbackReason:
        fallbackReason ?? `aa_${provider}_initialization_failed_fallback_eoa`,
    };
  }
}

function normalizeAtomicCapabilities(
  raw: Parameters<typeof executeWalletCalls>[0]["capabilities"] | undefined,
): Parameters<typeof executeWalletCalls>[0]["capabilities"] | undefined {
  if (!raw) return undefined;
  const entries = Object.entries(raw as Record<string, unknown>);
  if (!entries.length) return raw;

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      normalized[key] = value;
      continue;
    }
    const record = value as {
      atomic?: { status?: string };
      [field: string]: unknown;
    };
    const status = record.atomic?.status;
    if (status === "ready") {
      normalized[key] = {
        ...record,
        atomic: {
          ...record.atomic,
          status: "supported",
        },
      };
      continue;
    }
    normalized[key] = value;
  }
  return normalized as Parameters<typeof executeWalletCalls>[0]["capabilities"];
}

/**
 * Bridge component that consumes wallet requests queued by Aomi runtime
 * and executes them through wagmi using the shared executeWalletCalls flow.
 */
export function WalletTxHandler() {
  const {
    user,
    pendingWalletRequests,
    startWalletRequest,
    resolveWalletRequest,
    rejectWalletRequest,
  } = useAomiRuntime();
  const { sendTransactionAsync } = useSendTransaction();
  const { sendCallsSyncAsync } = useSendCallsSync();
  const { data: capabilities } = useCapabilities();
  const { signTypedDataAsync } = useSignTypedData();
  const { chainId: currentChainId, connector, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const paraSession = useClient();
  const { switchChainAsync } = useSwitchChain();
  const wagmiConfig = useConfig();
  const processingRef = useRef(false);
  const connectorName = connector?.name?.toLowerCase() ?? "";
  const isParaWallet = connectorName.includes("para");
  const shouldUseExternalSigner = Boolean(walletClient && !isParaWallet);
  const safeCapabilities = useMemo(
    () =>
      normalizeAtomicCapabilities(
        capabilities as Parameters<
          typeof executeWalletCalls
        >[0]["capabilities"],
      ),
    [capabilities],
  );

  const chainsById = useMemo<
    Parameters<typeof executeWalletCalls>[0]["chainsById"]
  >(
    () =>
      Object.fromEntries(
        (wagmiConfig.chains ?? []).map((chain) => [chain.id, chain]),
      ) as Parameters<typeof executeWalletCalls>[0]["chainsById"],
    [wagmiConfig.chains],
  );

  useEffect(() => {
    if (!pendingWalletRequests) return;

    const next = pendingWalletRequests[0];
    if (!next || processingRef.current) return;

    processingRef.current = true;
    startWalletRequest(next.id);

    processRequest(next).finally(() => {
      processingRef.current = false;
    });

    async function processRequest(request: WalletRequest) {
      try {
        if (request.kind === "transaction") {
          if (!sendTransactionAsync) {
            rejectWalletRequest(request.id, "Wallet provider is not ready");
            return;
          }

          const requestPayload = request.payload as WalletTxPayload;
          const requestTxIds =
            Array.isArray(requestPayload.txIds) &&
            requestPayload.txIds.length > 0
              ? requestPayload.txIds
              : typeof requestPayload.txId === "number"
                ? [requestPayload.txId]
                : [];

          console.info("[WalletTxHandler] Hydration decision", {
            requestId: request.id,
            txIds: requestTxIds,
            hasHydratedCalls: hasHydratedCalls(requestPayload),
          });

          const payload = hasHydratedCalls(requestPayload)
            ? requestPayload
            : hydrateTxPayloadFromUserState(requestPayload, user, {
                strict: true,
              });
          const callList = toAAWalletCalls(
            payload,
            payload.chainId ?? currentChainId ?? 1,
          );
          console.info("[WalletTxHandler] Hydration result", {
            requestId: request.id,
            txIds: requestTxIds,
            callCount: callList.length,
            chainId: callList[0]?.chainId,
            aaPreference: payload.aaPreference ?? "auto",
          });
          const isBatch = callList.length > 1;
          const aaRequestedMode = resolveRequestedAAMode(payload, isBatch);

          const fallbackOrder =
            aaRequestedMode === "none"
              ? ["eoa"]
              : isBatch && aaRequestedMode === "7702"
                ? ["7702", "4337_sponsored", "eoa"]
                : aaRequestedMode === "7702"
                  ? ["7702", "eoa"]
                  : ["4337", "eoa"];

          console.info("[WalletTxHandler] AA mode plan", {
            requestId: request.id,
            txIds: requestTxIds,
            aaPreference: payload.aaPreference ?? "auto",
            requestedMode: aaRequestedMode,
            isBatch,
            fallbackOrder,
            shouldUseExternalSigner,
          });

          const executeWithProviderState = async (
            providerState: WalletProviderState,
          ) =>
            executeWalletCalls({
              callList,
              currentChainId: currentChainId ?? callList[0]?.chainId ?? 1,
              capabilities: safeCapabilities,
              localPrivateKey: null,
              providerState,
              sendCallsSyncAsync: async ({ calls, capabilities }) => {
                return sendCallsSyncAsync({
                  calls,
                  capabilities,
                });
              },
              sendTransactionAsync: async ({ chainId, to, value, data }) => {
                return sendTransactionAsync({ chainId, to, value, data });
              },
              switchChainAsync: switchChainAsync
                ? async ({ chainId }) => {
                    await switchChainAsync({ chainId });
                  }
                : async () => {
                    throw new Error("wallet_switch_chain_not_supported");
                  },
              chainsById,
              getPreferredRpcUrl,
            });

          let result: Awaited<ReturnType<typeof executeWalletCalls>> | null =
            null;
          let finalProviderFallbackReason: string | undefined;
          let lastAAError: unknown;

          const aaAttempts: Array<{
            stage: string;
            requestedMode: RequestedAAMode;
            sponsored?: boolean;
          }> = [];
          if (aaRequestedMode !== "none") {
            if (isBatch && aaRequestedMode === "7702") {
              if (shouldUseExternalSigner) {
                aaAttempts.push({
                  stage: "fallback_4337_connected_wallet",
                  requestedMode: "4337",
                  sponsored: true,
                });
              } else {
                aaAttempts.push({
                  stage: "primary_7702",
                  requestedMode: "7702",
                });
                aaAttempts.push({
                  stage: "fallback_4337_sponsored",
                  requestedMode: "4337",
                  sponsored: true,
                });
              }
            } else {
              aaAttempts.push({
                stage: "primary",
                requestedMode: aaRequestedMode,
                sponsored: aaRequestedMode === "4337" ? true : undefined,
              });
            }
          }

          if (aaAttempts.length === 0) {
            result = await executeWithProviderState(EOA_PROVIDER_STATE);
          } else {
            for (const attempt of aaAttempts) {
              const attemptState = await resolveAAProviderState({
                callList,
                chainsById,
                requestedMode: attempt.requestedMode,
                shouldUseExternalSigner,
                paraSession,
                walletClient,
                address,
                sponsored: attempt.sponsored,
              });

              console.info("[WalletTxHandler] AA attempt", {
                requestId: request.id,
                stage: attempt.stage,
                requestedMode: attempt.requestedMode,
                resolvedMode: attemptState.resolvedMode,
                sponsored: attempt.sponsored ?? false,
                providerEnabled:
                  attemptState.providerState !== EOA_PROVIDER_STATE,
                fallbackReason: attemptState.fallbackReason,
              });

              if (attemptState.fallbackReason && !finalProviderFallbackReason) {
                finalProviderFallbackReason = attemptState.fallbackReason;
              }

              try {
                result = await executeWithProviderState(
                  attemptState.providerState,
                );
                if (
                  aaRequestedMode === "7702" &&
                  attempt.requestedMode === "4337" &&
                  !finalProviderFallbackReason
                ) {
                  finalProviderFallbackReason = "requested_7702_fallback_4337";
                }
                break;
              } catch (attemptError) {
                lastAAError = attemptError;
                const attemptErrorMessage =
                  attemptError instanceof Error
                    ? attemptError.message
                    : String(attemptError);
                console.warn("[WalletTxHandler] AA attempt failed", {
                  requestId: request.id,
                  stage: attempt.stage,
                  requestedMode: attempt.requestedMode,
                  error: attemptErrorMessage,
                });
              }
            }

            if (!result) {
              const lastAAErrorMessage =
                lastAAError instanceof Error
                  ? lastAAError.message
                  : String(lastAAError ?? "unknown");
              console.warn(
                "[WalletTxHandler] All AA attempts failed; falling back to EOA",
                {
                  requestId: request.id,
                  error: lastAAErrorMessage,
                },
              );
              result = await executeWithProviderState(EOA_PROVIDER_STATE);
              finalProviderFallbackReason =
                finalProviderFallbackReason ?? "aa_failed_fallback_eoa";
            }
          }

          if (!result) {
            throw new Error("wallet_execution_result_missing");
          }

          const aaResolvedMode = inferResolvedAAMode(result.executionKind);
          const aaFallbackReason =
            finalProviderFallbackReason ??
            (aaRequestedMode === "7702" && aaResolvedMode === "4337"
              ? "requested_7702_fallback_4337"
              : aaRequestedMode !== "none" && aaResolvedMode === "none"
                ? "aa_unavailable_fallback_eoa"
                : undefined);

          resolveWalletRequest(request.id, {
            txHash: result.txHash,
            amount: payload.value,
            aaRequestedMode,
            aaResolvedMode,
            aaFallbackReason,
            executionKind: result.executionKind,
            batched: result.batched,
            callCount: callList.length,
            sponsored: result.sponsored,
            smartAccountAddress: result.AAAddress,
            delegationAddress: result.delegationAddress,
          } as never);
          return;
        }

        if (!signTypedDataAsync) {
          rejectWalletRequest(request.id, "Wallet provider is not ready");
          return;
        }

        const payload = request.payload as WalletEip712Payload;
        const signArgs = toViemSignTypedDataArgs(payload);

        if (!signArgs) {
          rejectWalletRequest(request.id, "Missing typed_data payload");
          return;
        }

        const requestChainId = parseChainId(
          typeof signArgs.domain?.chainId === "number" ||
            typeof signArgs.domain?.chainId === "string"
            ? signArgs.domain.chainId
            : undefined,
        );
        if (
          requestChainId &&
          currentChainId &&
          requestChainId !== currentChainId
        ) {
          await switchChainAsync({ chainId: requestChainId });
        }

        const signature = await signTypedDataAsync(signArgs as never);
        resolveWalletRequest(request.id, { signature });
      } catch (error) {
        console.error("[WalletTxHandler] Request failed:", error);
        rejectWalletRequest(
          request.id,
          error instanceof Error ? error.message : "Request failed",
        );
      }
    }
  }, [
    user,
    pendingWalletRequests,
    currentChainId,
    address,
    paraSession,
    walletClient,
    shouldUseExternalSigner,
    chainsById,
    safeCapabilities,
    switchChainAsync,
    sendCallsSyncAsync,
    sendTransactionAsync,
    signTypedDataAsync,
    startWalletRequest,
    resolveWalletRequest,
    rejectWalletRequest,
  ]);

  return null;
}

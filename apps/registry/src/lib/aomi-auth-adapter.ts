"use client";

import { useMemo } from "react";
import {
  useAccount as useParaAccount,
  useClient as useParaClient,
  useModal,
} from "@getpara/react-sdk";
import type { Chain, Hex } from "viem";
import {
  useAccount as useWagmiAccount,
  useCapabilities,
  useConfig,
  useSendCallsSync,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
  useWalletClient,
} from "wagmi";
import type { WalletEip712Payload, WalletTxPayload } from "@aomi-labs/react";
import {
  DISABLED_PROVIDER_STATE,
  executeWalletCalls,
  toAAWalletCalls,
  toViemSignTypedDataArgs,
} from "@aomi-labs/react";
import {
  createAAProviderState,
  type AAMode,
  type AAProvider,
} from "@aomi-labs/client";
import {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAddress,
  formatAuthProvider,
  inferAuthProvider,
  type AomiAuthIdentity,
} from "./auth-identity";

type ParaAccountShape = {
  isLoading: boolean;
  isConnected: boolean;
  embedded: {
    email?: string;
    farcasterUsername?: string;
    telegramUserId?: string;
    authMethods?: Set<unknown>;
    wallets?: Array<{ address?: string }>;
  };
  external: {
    evm?: {
      address?: string;
      chainId?: number | string;
    };
  };
};

type WagmiAccountShape = {
  address?: `0x${string}`;
  chainId?: number;
  isConnected: boolean;
  connector?: { name?: string };
};

type WagmiConfigShape = {
  chains: readonly Chain[];
};

function getPreferredRpcUrl(chain: Chain): string {
  return chain.rpcUrls.default.http[0] ?? chain.rpcUrls.public?.http[0] ?? "";
}

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() ?? "";
const ALCHEMY_GAS_POLICY_ID =
  process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID?.trim();
const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY?.trim() ?? "";
const AA_PROVIDER_OVERRIDE =
  process.env.NEXT_PUBLIC_AA_PROVIDER?.trim().toLowerCase();

type RequestedAAMode = "none" | "4337" | "7702";
type WalletProviderState = Parameters<
  typeof executeWalletCalls
>[0]["providerState"];
type WalletExecutionCallList = Parameters<
  typeof executeWalletCalls
>[0]["callList"];

function resolveRequestedAAMode(
  payload: WalletTxPayload,
  isBatch: boolean,
): RequestedAAMode {
  if (!isBatch) return "none";
  if (payload.aaPreference === "none") return "none";
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

function normalizeAtomicCapabilities(
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

export type AomiAuthAdapter = {
  identity: AomiAuthIdentity;
  isReady: boolean;
  isSwitchingChain: boolean;
  canConnect: boolean;
  canManageAccount: boolean;
  connect: () => Promise<void>;
  manageAccount: () => Promise<void>;
  switchChain?: (chainId: number) => Promise<void>;
  sendTransaction?: (payload: WalletTxPayload) => Promise<{
    txHash: string;
    amount?: string;
    aaRequestedMode?: "4337" | "7702" | "none";
    aaResolvedMode?: "4337" | "7702" | "none";
    aaFallbackReason?: string;
    executionKind?: string;
    batched?: boolean;
    callCount?: number;
    sponsored?: boolean;
    smartAccountAddress?: string;
    delegationAddress?: string;
  }>;
  signTypedData?: (
    payload: WalletEip712Payload,
  ) => Promise<{ signature: string }>;
};

const DISCONNECTED_PARA_ACCOUNT: ParaAccountShape = {
  isLoading: false,
  isConnected: false,
  embedded: {},
  external: {},
};

const DISCONNECTED_WAGMI_ACCOUNT: WagmiAccountShape = {
  address: undefined,
  chainId: undefined,
  isConnected: false,
};

const DISCONNECTED_WAGMI_CONFIG: WagmiConfigShape = {
  chains: [],
};

function useSafeParaAccount(): ParaAccountShape {
  try {
    return useParaAccount() as ParaAccountShape;
  } catch {
    return DISCONNECTED_PARA_ACCOUNT;
  }
}

function useSafeParaModal(): {
  openModal: (args?: { step?: string }) => void;
} | null {
  try {
    return useModal() as { openModal: (args?: { step?: string }) => void };
  } catch {
    return null;
  }
}

function useSafeWagmiAccount(): WagmiAccountShape {
  try {
    return useWagmiAccount() as WagmiAccountShape;
  } catch {
    return DISCONNECTED_WAGMI_ACCOUNT;
  }
}

function useSafeParaClient(): unknown {
  try {
    return useParaClient();
  } catch {
    return null;
  }
}

function useSafeWalletClient(): {
  walletClient?: ReturnType<typeof useWalletClient>["data"];
} {
  try {
    const { data } = useWalletClient();
    return { walletClient: data };
  } catch {
    return { walletClient: undefined };
  }
}

function useSafeWagmiConfig(): WagmiConfigShape {
  try {
    const config = useConfig();
    return {
      chains: config.chains ?? [],
    };
  } catch {
    return DISCONNECTED_WAGMI_CONFIG;
  }
}

function useSafeSwitchChain(): {
  switchChain?: (args: { chainId: number }) => void;
  switchChainAsync?: (args: { chainId: number }) => Promise<unknown>;
  isPending: boolean;
} {
  try {
    const result = useSwitchChain();
    return {
      switchChain: result.switchChain,
      switchChainAsync: result.switchChainAsync,
      isPending: result.isPending,
    };
  } catch {
    return {
      switchChain: undefined,
      switchChainAsync: undefined,
      isPending: false,
    };
  }
}

function useSafeSendTransaction(): {
  sendTransactionAsync?: (args: {
    chainId?: number;
    to: `0x${string}`;
    value?: bigint;
    data?: `0x${string}`;
  }) => Promise<string>;
} {
  try {
    return useSendTransaction() as {
      sendTransactionAsync?: (args: {
        chainId?: number;
        to: `0x${string}`;
        value?: bigint;
        data?: `0x${string}`;
      }) => Promise<string>;
    };
  } catch {
    return { sendTransactionAsync: undefined };
  }
}

function useSafeSignTypedData(): {
  signTypedDataAsync?: (args: unknown) => Promise<string>;
} {
  try {
    return useSignTypedData() as {
      signTypedDataAsync?: (args: unknown) => Promise<string>;
    };
  } catch {
    return { signTypedDataAsync: undefined };
  }
}

function useSafeCapabilities(): {
  capabilities?: Parameters<typeof executeWalletCalls>[0]["capabilities"];
} {
  try {
    const { data } = useCapabilities();
    return {
      capabilities: normalizeAtomicCapabilities(
        data as Parameters<typeof executeWalletCalls>[0]["capabilities"],
      ),
    };
  } catch {
    return { capabilities: undefined };
  }
}

function useSafeSendCallsSync(): {
  sendCallsSyncAsync?: Parameters<
    typeof executeWalletCalls
  >[0]["sendCallsSyncAsync"];
} {
  try {
    const { sendCallsSyncAsync } = useSendCallsSync();
    return {
      sendCallsSyncAsync: async ({ calls, capabilities, chainId }) => {
        return sendCallsSyncAsync({
          calls,
          capabilities,
          chainId,
        });
      },
    };
  } catch {
    return { sendCallsSyncAsync: undefined };
  }
}

async function resolveParaAAProviderState({
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
  chainsById: Record<number, Chain>;
  requestedMode: RequestedAAMode;
  shouldUseExternalSigner: boolean;
  paraSession: unknown;
  walletClient: ReturnType<typeof useWalletClient>["data"] | undefined;
  address: string | undefined;
  sponsored?: boolean;
}): Promise<{
  providerState: WalletProviderState;
  resolvedMode: RequestedAAMode;
  fallbackReason?: string;
}> {
  if (requestedMode === "none") {
    return {
      providerState: DISABLED_PROVIDER_STATE,
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
      providerState: DISABLED_PROVIDER_STATE,
      resolvedMode,
      fallbackReason:
        fallbackReason ?? "aa_provider_not_configured_fallback_eoa",
    };
  }

  if (!paraSession) {
    return {
      providerState: DISABLED_PROVIDER_STATE,
      resolvedMode,
      fallbackReason: fallbackReason ?? "para_session_unavailable_fallback_eoa",
    };
  }

  const chainId = callList[0]?.chainId;
  const chain = chainId ? chainsById[chainId] : undefined;
  if (!chainId || !chain) {
    return {
      providerState: DISABLED_PROVIDER_STATE,
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
      providerState: DISABLED_PROVIDER_STATE,
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
      console.warn("[aomi-auth-adapter] AA unavailable; falling back to EOA", {
        provider,
        mode: resolvedMode,
        error: state.error?.message ?? "account_unavailable",
      });
      return {
        providerState: DISABLED_PROVIDER_STATE,
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
    console.warn("[aomi-auth-adapter] AA init failed; falling back to EOA", {
      provider,
      mode: resolvedMode,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      providerState: DISABLED_PROVIDER_STATE,
      resolvedMode,
      fallbackReason:
        fallbackReason ?? `aa_${provider}_initialization_failed_fallback_eoa`,
    };
  }
}

export function useAomiAuthAdapter(): AomiAuthAdapter {
  const paraAccount = useSafeParaAccount();
  const paraSession = useSafeParaClient();
  const paraModal = useSafeParaModal();
  const {
    address: wagmiAddress,
    chainId,
    isConnected: wagmiConnected,
    connector,
  } = useSafeWagmiAccount();
  const { walletClient } = useSafeWalletClient();
  const { switchChainAsync, isPending } = useSafeSwitchChain();
  const { sendTransactionAsync } = useSafeSendTransaction();
  const { sendCallsSyncAsync } = useSafeSendCallsSync();
  const { capabilities } = useSafeCapabilities();
  const { signTypedDataAsync } = useSafeSignTypedData();
  const wagmiConfig = useSafeWagmiConfig();

  const chainsById = useMemo<Record<number, Chain>>(
    () =>
      Object.fromEntries(
        (wagmiConfig.chains ?? []).map((chain) => [chain.id, chain]),
      ),
    [wagmiConfig.chains],
  );

  return useMemo(() => {
    const isConnected = Boolean(paraAccount.isConnected || wagmiConnected);
    const isBooting = paraAccount.isLoading && !isConnected;

    const embeddedPrimary =
      paraAccount.embedded.email ??
      paraAccount.embedded.farcasterUsername ??
      paraAccount.embedded.telegramUserId ??
      undefined;
    const embeddedWallet = paraAccount.embedded.wallets?.[0] as
      | { address?: string }
      | undefined;
    const embeddedAddress = embeddedWallet?.address;
    const externalAddress = paraAccount.external.evm?.address;
    const address =
      wagmiAddress ?? externalAddress ?? embeddedAddress ?? undefined;
    const authProvider = inferAuthProvider(paraAccount.embedded.authMethods);
    const providerLabel = formatAuthProvider(authProvider);

    const identity: AomiAuthIdentity = isBooting
      ? {
          ...AOMI_AUTH_BOOTING_IDENTITY,
          chainId: chainId ?? undefined,
        }
      : isConnected && embeddedPrimary
        ? {
            status: "connected",
            isConnected: true,
            address,
            chainId: chainId ?? undefined,
            authProvider,
            primaryLabel: embeddedPrimary,
            secondaryLabel: providerLabel,
          }
        : isConnected && address
          ? {
              status: "connected",
              isConnected: true,
              address,
              chainId: chainId ?? undefined,
              authProvider,
              primaryLabel: formatAddress(address) ?? "Connected wallet",
              secondaryLabel: undefined,
            }
          : {
              ...AOMI_AUTH_DISCONNECTED_IDENTITY,
              chainId: chainId ?? undefined,
              authProvider,
            };

    return {
      identity,
      isReady: !isBooting,
      isSwitchingChain: isPending,
      canConnect: Boolean(paraModal) && !identity.isConnected,
      canManageAccount: Boolean(paraModal) && identity.isConnected,
      connect: async () => {
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      manageAccount: async () => {
        paraModal?.openModal({ step: "ACCOUNT_MAIN" });
      },
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
      sendTransaction: sendTransactionAsync
        ? async (payload: WalletTxPayload) => {
            if (!payload.to) {
              // New tx_ids contract hydrates `calls`; keep this guard for
              // defensive handling when hydration failed.
              if (!payload.calls || payload.calls.length === 0) {
                throw new Error("pending_transaction_missing_call_data");
              }
            }

            const callList = toAAWalletCalls(
              payload,
              payload.chainId ?? chainId ?? 1,
            );
            const isBatch = callList.length > 1;
            const aaRequestedMode = resolveRequestedAAMode(payload, isBatch);
            const connectorName = connector?.name?.toLowerCase() ?? "";
            const isParaWallet = connectorName.includes("para");
            const shouldUseExternalSigner = Boolean(
              walletClient && !isParaWallet,
            );

            const executeWithProviderState = async (
              providerState: WalletProviderState,
            ) =>
              executeWalletCalls({
                callList,
                currentChainId: chainId ?? callList[0]?.chainId ?? 1,
                capabilities,
                localPrivateKey: null,
                providerState,
                sendCallsSyncAsync: sendCallsSyncAsync
                  ? async ({ calls, capabilities, chainId }) => {
                      return sendCallsSyncAsync({
                        calls,
                        capabilities,
                        chainId,
                      });
                    }
                  : async () => {
                      throw new Error("wallet_send_calls_not_supported");
                    },
                sendTransactionAsync: async ({
                  chainId: txChainId,
                  to,
                  value,
                  data,
                }) => {
                  return sendTransactionAsync({
                    chainId: txChainId,
                    to,
                    value,
                    data,
                  });
                },
                switchChainAsync: switchChainAsync
                  ? async ({ chainId: nextChainId }) => {
                      await switchChainAsync({ chainId: nextChainId });
                    }
                  : async () => {
                      throw new Error("wallet_switch_chain_not_supported");
                    },
                chainsById,
                getPreferredRpcUrl,
              });

            let execution: Awaited<
              ReturnType<typeof executeWalletCalls>
            > | null = null;
            let finalFallbackReason: string | undefined;
            let lastAAError: unknown;

            const aaAttempts: Array<{
              requestedMode: RequestedAAMode;
              sponsored?: boolean;
            }> = [];
            if (aaRequestedMode === "7702") {
              if (shouldUseExternalSigner) {
                aaAttempts.push({ requestedMode: "4337", sponsored: true });
              } else {
                aaAttempts.push({ requestedMode: "7702" });
                aaAttempts.push({ requestedMode: "4337", sponsored: true });
              }
            } else if (aaRequestedMode === "4337") {
              aaAttempts.push({ requestedMode: "4337", sponsored: true });
            }

            if (aaAttempts.length === 0) {
              execution = await executeWithProviderState(
                DISABLED_PROVIDER_STATE,
              );
            } else {
              for (const attempt of aaAttempts) {
                const attemptState = await resolveParaAAProviderState({
                  callList,
                  chainsById,
                  requestedMode: attempt.requestedMode,
                  shouldUseExternalSigner,
                  paraSession,
                  walletClient,
                  address,
                  sponsored: attempt.sponsored,
                });

                if (attemptState.fallbackReason && !finalFallbackReason) {
                  finalFallbackReason = attemptState.fallbackReason;
                }

                try {
                  execution = await executeWithProviderState(
                    attemptState.providerState,
                  );
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
                    error:
                      error instanceof Error ? error.message : String(error),
                  });
                }
              }

              if (!execution) {
                console.warn(
                  "[aomi-auth-adapter] All AA attempts failed; falling back to EOA",
                  {
                    error:
                      lastAAError instanceof Error
                        ? lastAAError.message
                        : String(lastAAError ?? "unknown"),
                  },
                );
                execution = await executeWithProviderState(
                  DISABLED_PROVIDER_STATE,
                );
                finalFallbackReason =
                  finalFallbackReason ?? "aa_failed_fallback_eoa";
              }
            }

            const aaResolvedMode = inferResolvedAAMode(execution.executionKind);

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
              smartAccountAddress: execution.AAAddress,
              delegationAddress: execution.delegationAddress,
            };
          }
        : undefined,
      signTypedData: signTypedDataAsync
        ? async (payload: WalletEip712Payload) => {
            const signArgs = toViemSignTypedDataArgs(payload);
            if (!signArgs) {
              throw new Error("Missing typed_data payload");
            }
            const signature = await signTypedDataAsync(signArgs as never);
            return { signature };
          }
        : undefined,
    };
  }, [
    chainId,
    isPending,
    paraAccount.embedded,
    paraAccount.external,
    paraAccount.isConnected,
    paraAccount.isLoading,
    paraModal,
    paraSession,
    capabilities,
    chainsById,
    connector,
    walletClient,
    sendCallsSyncAsync,
    sendTransactionAsync,
    signTypedDataAsync,
    switchChainAsync,
    wagmiAddress,
    wagmiConnected,
  ]);
}

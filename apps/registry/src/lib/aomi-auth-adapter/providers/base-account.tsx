"use client";

import { useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Chain } from "viem";
import { http } from "viem";
import { WagmiProvider, createConfig, type Config } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { baseAccount } from "wagmi/connectors";
import type {
  SponsorshipPaymasterServiceContext,
  WalletEip712Payload,
  WalletTxPayload,
} from "@aomi-labs/react";
import { toViemSignTypedDataArgs } from "@aomi-labs/react";
import { AomiAuthAdapterProvider } from "../context";
import { AOMI_AUTH_DISCONNECTED_IDENTITY, formatAddress } from "../identity";
import {
  useSafeCapabilities,
  useSafeConnect,
  useSafeConnectors,
  useSafeDisconnect,
  useSafeSendCallsSync,
  useSafeSendTransaction,
  useSafeSignTypedData,
  useSafeSwitchChain,
  useSafeWagmiAccount,
  useSafeWagmiConfig,
} from "../safe-wagmi-hooks";
import type { AomiAuthAdapter, AomiAuthIdentity } from "../types";
import {
  executeAdapterTransaction,
  getPreferredRpcUrl,
} from "../wallet-execution";

export type AomiBaseAccountProviderProps = {
  children: ReactNode;
  appName: string;
  appLogoUrl?: string | null;
  chains?: readonly [Chain, ...Chain[]];
  includeBaseSepolia?: boolean;
  sponsorship?: BaseAccountSponsorshipOptions;
};

export type BaseAccountSponsorshipOptions =
  | {
      mode?: "disabled";
    }
  | {
      mode: "optional";
      paymasterServiceContext?:
        | SponsorshipPaymasterServiceContext
        | ((chainId: number) => SponsorshipPaymasterServiceContext | undefined);
      paymasterServiceUrl?: string | ((chainId: number) => string | undefined);
      sendCallsTimeoutMs?: number;
    }
  | {
      // Temporary testing mode: fail closed instead of charging user ETH.
      mode: "required";
      paymasterServiceContext?:
        | SponsorshipPaymasterServiceContext
        | ((chainId: number) => SponsorshipPaymasterServiceContext | undefined);
      paymasterServiceUrl?: string | ((chainId: number) => string | undefined);
      sendCallsTimeoutMs?: number;
    };

const BASE_ACCOUNT_SDK_STORE_KEY = "base-acc-sdk.store";

function syncPersistedBaseAccountConfig({
  appName,
  appLogoUrl,
  chains,
}: {
  appName: string;
  appLogoUrl?: string | null;
  chains: readonly [Chain, ...Chain[]];
}) {
  const storage = globalThis.localStorage;
  if (!storage) return;

  try {
    const raw = storage.getItem(BASE_ACCOUNT_SDK_STORE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw) as {
      state?: { config?: Record<string, unknown> };
    };
    if (!parsed.state?.config) {
      return;
    }

    parsed.state.config = {
      ...parsed.state.config,
      metadata: {
        appName,
        appLogoUrl: appLogoUrl ?? "",
        appChainIds: chains.map((chain) => chain.id),
      },
      paymasterUrls: {},
    };
    storage.setItem(BASE_ACCOUNT_SDK_STORE_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore malformed persisted SDK state; connector initialization can recover.
  }
}

function createBaseAccountConfig({
  appName,
  appLogoUrl,
  chains,
}: {
  appName: string;
  appLogoUrl?: string | null;
  chains: readonly [Chain, ...Chain[]];
}): Config {
  syncPersistedBaseAccountConfig({ appName, appLogoUrl, chains });

  return createConfig({
    chains,
    connectors: [
      baseAccount({
        appName,
        appLogoUrl: appLogoUrl ?? null,
        paymasterUrls: {},
      }),
    ],
    transports: Object.fromEntries(
      chains.map((chain) => [chain.id, http(chain.rpcUrls.default.http[0])]),
    ),
    multiInjectedProviderDiscovery: false,
    ssr: true,
  });
}

function BaseAccountAdapterInner({
  children,
  sponsorship,
}: {
  children: ReactNode;
  sponsorship?: BaseAccountSponsorshipOptions;
}) {
  const { address, chainId, isConnected } = useSafeWagmiAccount();
  const connectors = useSafeConnectors();
  const { connectAsync, isPending: isConnecting } = useSafeConnect();
  const { disconnectAsync, isPending: isDisconnecting } = useSafeDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } =
    useSafeSwitchChain();
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

  const adapter = useMemo<AomiAuthAdapter>(() => {
    const baseConnector =
      connectors.find((connector) => connector.id === "baseAccount") ??
      connectors.find((connector) => connector.type === "baseAccount") ??
      connectors[0];
    const identity: AomiAuthIdentity =
      isConnected && address
        ? {
            status: "connected",
            isConnected: true,
            address,
            chainId: chainId ?? undefined,
            authProvider: "baseAccount",
            primaryLabel: formatAddress(address) ?? "Base Account",
            secondaryLabel: "Base Account",
          }
        : {
            ...AOMI_AUTH_DISCONNECTED_IDENTITY,
            chainId: chainId ?? undefined,
            authProvider: "baseAccount",
          };

    const connect = async () => {
      if (!connectAsync || !baseConnector) return;
      await connectAsync({ connector: baseConnector });
    };
    const disconnect = async () => {
      if (!disconnectAsync) return;
      await disconnectAsync();
    };

    return {
      identity,
      isReady: true,
      isSwitchingChain: isSwitchingChain || isConnecting || isDisconnecting,
      canConnect:
        Boolean(connectAsync && baseConnector) && !identity.isConnected,
      canManageAccount: Boolean(disconnectAsync) && identity.isConnected,
      supportedChains: wagmiConfig.chains,
      connect,
      manageAccount: disconnect,
      disconnect,
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
      sendTransaction: sendTransactionAsync
        ? async (payload: WalletTxPayload) =>
            executeAdapterTransaction({
              payload,
              state: {
                currentChainId: chainId,
                capabilities,
                nativeWalletExecution: {
                  executionKind: "base_account_4337",
                  sendCallsVersion: "1.0",
                  sendCallsTimeoutMs:
                    sponsorship?.mode === "optional" ||
                    sponsorship?.mode === "required"
                      ? sponsorship.sendCallsTimeoutMs
                      : undefined,
                  sponsorship:
                    sponsorship?.mode === "optional" ||
                    sponsorship?.mode === "required"
                      ? {
                          mode: sponsorship.mode,
                          getPaymasterServiceContext: (nextChainId) =>
                            typeof sponsorship.paymasterServiceContext ===
                            "function"
                              ? sponsorship.paymasterServiceContext(nextChainId)
                              : sponsorship.paymasterServiceContext,
                          getPaymasterServiceUrl: (nextChainId) =>
                            typeof sponsorship.paymasterServiceUrl ===
                            "function"
                              ? sponsorship.paymasterServiceUrl(nextChainId)
                              : sponsorship.paymasterServiceUrl,
                        }
                      : { mode: "disabled" },
                },
                sendCallsSyncAsync,
                sendTransactionAsync,
                switchChainAsync,
                chainsById,
                getPreferredRpcUrl,
              },
            })
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
    address,
    capabilities,
    chainId,
    chainsById,
    connectAsync,
    connectors,
    disconnectAsync,
    isConnected,
    isConnecting,
    isDisconnecting,
    isSwitchingChain,
    sendCallsSyncAsync,
    sendTransactionAsync,
    signTypedDataAsync,
    sponsorship,
    switchChainAsync,
    wagmiConfig.chains,
  ]);

  return (
    <AomiAuthAdapterProvider value={adapter}>
      {children}
    </AomiAuthAdapterProvider>
  );
}

export function AomiBaseAccountProvider({
  children,
  appName,
  appLogoUrl,
  chains,
  includeBaseSepolia = false,
  sponsorship,
}: AomiBaseAccountProviderProps) {
  const resolvedChains = useMemo(
    () =>
      chains ??
      (includeBaseSepolia ? ([base, baseSepolia] as const) : ([base] as const)),
    [chains, includeBaseSepolia],
  );
  const [queryClient] = useState(() => new QueryClient());
  const config = useMemo(
    () =>
      createBaseAccountConfig({
        appName,
        appLogoUrl,
        chains: resolvedChains,
      }),
    [appLogoUrl, appName, resolvedChains],
  );

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <BaseAccountAdapterInner sponsorship={sponsorship}>
          {children}
        </BaseAccountAdapterInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

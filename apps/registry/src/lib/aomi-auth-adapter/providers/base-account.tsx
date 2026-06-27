"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import {
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
} from "@aomi-labs/react";
import { AomiAuthAdapterProvider } from "../context";
import { AOMI_AUTH_DISCONNECTED_IDENTITY } from "../identity";
import { useFullTestnet } from "../full-testnet-wallet-routing";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../network-preferences";
import {
  useSafeCapabilities,
  useSafeConnect,
  useSafeConnectors,
  useSafeDisconnect,
  useSafeSendCallsSync,
  useSafeSendTransaction,
  useSafeSignMessage,
  useSafeSignTypedData,
  useSafeSwitchChain,
  useSafeWagmiAccount,
  useSafeWagmiConfig,
} from "../safe-wagmi-hooks";
import type { AomiAuthAdapter, AomiAuthIdentity } from "../types";
import { ExtUserProvider, UserState, useUser } from "@aomi-labs/react";
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
  const { signMessageAsync } = useSafeSignMessage();
  const wagmiConfig = useSafeWagmiConfig();
  const { selectedEvmChainId, setSelectedEvmChainId, supportedSolanaNetworks } =
    useAomiWalletNetworkPreferences();

  const chainsById = useMemo<Record<number, Chain>>(
    () =>
      Object.fromEntries(
        (wagmiConfig.chains ?? []).map((chain) => [chain.id, chain]),
      ),
    [wagmiConfig.chains],
  );

  useEffect(() => {
    if (
      !isConnected ||
      !selectedEvmChainId ||
      !switchChainAsync ||
      chainId === selectedEvmChainId
    ) {
      return;
    }
    void switchChainAsync({ chainId: selectedEvmChainId });
  }, [chainId, isConnected, selectedEvmChainId, switchChainAsync]);

  // Per-tx AA fields are session-owned: `session.ts` writes them to UserState
  // on tx-complete and we read them back via `useUser()`. This makes UserState
  // the single source of truth — identity rehydrates correctly after remount
  // (the previous local `useState<ResolvedAA>` was lost on unmount).
  const { user } = useUser();
  const userAAMode = UserState.aaMode(user);
  const userSmartAccount4337 = UserState.SmartAccount4337(user);
  const userDelegation7702 = UserState.Delegation7702(user);

  const adapter = useMemo<AomiAuthAdapter>(() => {
    const sponsorshipEnabled =
      sponsorship?.mode === "optional" || sponsorship?.mode === "required";
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
            walletKind: "smart-account",
            aaMode: userAAMode ?? "4337",
            SmartAccount4337: userSmartAccount4337 ?? address,
            Delegation7702: userDelegation7702 ?? undefined,
            sponsored: sponsorshipEnabled,
            sponsorProvider: sponsorshipEnabled ? "coinbase" : "self",
            sponsorAccount: undefined,
            // Fall back to the selected EVM network while wagmi hasn't resolved
            // the connected chain, so the chain reported to the backend (via
            // setUser) matches the network selector instead of defaulting to
            // Ethereum mainnet server-side.
            chainId: chainId ?? selectedEvmChainId,
            walletProvider: "baseAccount",
            authMethod: undefined,
          }
        : {
            ...AOMI_AUTH_DISCONNECTED_IDENTITY,
            chainId: chainId ?? undefined,
            walletProvider: "baseAccount",
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
      accounts: [],
      selectAccount: async () => undefined,
      canConnect:
        Boolean(connectAsync && baseConnector) && !identity.isConnected,
      canOpenAccountUI: false,
      canDisconnect: Boolean(disconnectAsync) && identity.isConnected,
      supportedChains: wagmiConfig.chains,
      supportedNetworks: {
        evm: wagmiConfig.chains,
        solana: supportedSolanaNetworks,
      },
      connect: async () => {
        await connect();
      },
      disconnect,
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            setSelectedEvmChainId(nextChainId);
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
      selectNetwork: async (target) => {
        if (target.family !== "evm") return;
        setSelectedEvmChainId(target.chainId);
        if (switchChainAsync && chainId !== target.chainId && isConnected) {
          await switchChainAsync({ chainId: target.chainId });
        }
      },
      sendTransaction: sendTransactionAsync
        ? async (payload: WalletTxPayload) => {
            const result = await executeAdapterTransaction({
              payload,
              state: {
                currentChainId: chainId,
                capabilities,
                nativeWalletExecution: {
                  executionKind: "base_account_4337",
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
            });
            // session.ts writes aa_mode / smart_account_4337 / delegation_7702
            // to UserState on tx-complete; identity rereads them via useUser.
            return result;
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
      signMessage: signMessageAsync
        ? async (payload: WalletEip712Payload) => {
            const messageArgs = toViemSignMessageArgs(payload);
            if (!messageArgs) {
              throw new Error("Missing non_typed_data payload");
            }
            const signature = await signMessageAsync(messageArgs as never);
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
    selectedEvmChainId,
    setSelectedEvmChainId,
    sendCallsSyncAsync,
    sendTransactionAsync,
    signMessageAsync,
    signTypedDataAsync,
    sponsorship,
    supportedSolanaNetworks,
    switchChainAsync,
    userAAMode,
    userSmartAccount4337,
    userDelegation7702,
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
  const preferredChains = useMemo(
    () =>
      chains ??
      (includeBaseSepolia ? ([base, baseSepolia] as const) : ([base] as const)),
    [chains, includeBaseSepolia],
  );
  const routing = useFullTestnet(preferredChains);
  const [queryClient] = useState(() => new QueryClient());
  const config = useMemo(
    () =>
      createBaseAccountConfig({
        appName,
        appLogoUrl,
        chains: routing.routedChains,
      }),
    [appLogoUrl, appName, routing.routedChains],
  );

  // `BaseAccountAdapterInner` reads per-tx AA fields from `useUser()`, so
  // mount `ExtUserProvider` here. The provider owns its own UserState
  // store — descendants of `AomiBaseAccountProvider` get one store,
  // siblings get their own.
  return (
    <AomiWalletNetworkPreferencesProvider
      evmChains={routing.routedChains}
      solanaNetworks={[]}
    >
      <ExtUserProvider>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <BaseAccountAdapterInner sponsorship={sponsorship}>
              {children}
            </BaseAccountAdapterInner>
          </QueryClientProvider>
        </WagmiProvider>
      </ExtUserProvider>
    </AomiWalletNetworkPreferencesProvider>
  );
}

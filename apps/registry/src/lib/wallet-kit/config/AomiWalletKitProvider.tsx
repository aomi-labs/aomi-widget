"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExtUserProvider } from "@aomi-labs/react";
import { monad, monadTestnet } from "@aomi-labs/client";
import {
  arbitrum,
  base,
  linea,
  lineaSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "wagmi/chains";
import type { Chain } from "viem";
import { AomiWalletKitComposer } from "../composer/AomiWalletKitComposer";
import type { AuthRuntime, ExecutionRuntime } from "../composer/types";
import { resolveExternalWalletAAProviderState } from "../execution/aa-provider-state";
import { buildEvmExecutionRuntime } from "../execution/execution-runtime";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../network-preferences";
import {
  FullTestnetWalletRouter,
  useFullTestnet,
} from "../full-testnet-wallet-routing";
import { AomiEvmRuntimeProvider } from "../runtime/evm/provider";
import { useEvmWalletRuntime } from "../runtime/evm/wallet-runtime";
import { useSvmRegistrySource } from "../runtime/svm/registry-source";
import { buildSvmTransactionMethods } from "../runtime/svm/transactions";
import { useSafeSvmWallet } from "../runtime/svm/wallet-runtime";
import { REGISTRY_STORAGE_KEY } from "../registry/types";
import { createAomiEvmConfig } from "../catalog/evm-connector-catalog";
import { resolveAomiSvmConfig } from "../catalog/svm-wallet-catalog";
import {
  detectProviderSugar,
  getWalletProvider,
  registerWalletProvider,
} from "../providers/plugin-registry";
import { paraPlugin } from "../providers/para/para-plugin";
import { privyPlugin } from "../providers/privy/privy-plugin";
import type {
  AomiWalletKitProviderInput,
  AomiWalletKitProviderProps,
  WalletsConfig,
} from "./types";

export type { AomiWalletKitProviderInput, AomiWalletKitProviderProps };

const defaultNetworks = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
  monad,
  monadTestnet,
] as const;

registerWalletProvider(paraPlugin);
registerWalletProvider(privyPlugin);

function WalletsOnlyWalletKitProvider({
  children,
  supportedChains,
}: {
  children: ReactNode;
  supportedChains: readonly Chain[];
}) {
  const {
    selectedEvmChainId,
    selectedSolanaNetwork,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks,
  } = useAomiWalletNetworkPreferences();
  const evmRuntime = useEvmWalletRuntime({
    configuredChains: supportedChains,
    selectedEvmChainId,
    setSelectedEvmChainId,
    storageKey: REGISTRY_STORAGE_KEY,
  });
  const svmWallet = useSafeSvmWallet();
  useSvmRegistrySource(evmRuntime.registryStore, { svmWallet });
  const svmRuntimeConfig = useMemo(
    () => ({
      cluster: selectedSolanaNetwork?.cluster ?? "solana:mainnet",
      rpcHttpUrl: selectedSolanaNetwork?.rpcHttpUrl ?? "",
      rpcWsUrl: selectedSolanaNetwork?.rpcWsUrl,
      preferDirectSend: true,
    }),
    [selectedSolanaNetwork],
  );
  const authRuntime = useMemo<AuthRuntime>(
    () => ({
      provider: "none",
      status: "unauthenticated",
      methods: [],
      canOpenModal: false,
    }),
    [],
  );
  const executionRuntime = useMemo<ExecutionRuntime>(
    () => ({
      sponsorship: {},
      evm: buildEvmExecutionRuntime(evmRuntime, {
        resolveAAProviderState: async (params, context) =>
          resolveExternalWalletAAProviderState({
            ...params,
            walletClient: context.walletClient,
            address: context.address,
          }),
      }),
      svm: buildSvmTransactionMethods(svmWallet, svmRuntimeConfig),
    }),
    [evmRuntime, svmRuntimeConfig, svmWallet],
  );

  return (
    <AomiWalletKitComposer
      auth={authRuntime}
      evm={evmRuntime}
      svm={{
        wallet: svmWallet,
        config: {
          ...svmRuntimeConfig,
        },
        supportedNetworks: supportedSolanaNetworks,
        selectedNetwork: selectedSolanaNetwork,
        setSelectedNetworkId: setSelectedSolanaNetworkId,
      }}
      execution={executionRuntime}
      supportedChains={supportedChains}
    >
      {children}
    </AomiWalletKitComposer>
  );
}

function AomiWalletsOnlyProvider({
  children,
  wallets,
}: {
  children: ReactNode;
  wallets?: WalletsConfig;
}) {
  const evmWallets = wallets?.evm === false ? undefined : wallets?.evm;
  const svmWallets = wallets?.solana === false ? false : wallets?.solana;
  const chains = evmWallets?.chains ?? defaultNetworks;
  const routing = useFullTestnet(chains);
  const { selectedSolanaNetworkId } = useAomiWalletNetworkPreferences();
  const resolvedSvm = useMemo(
    () => resolveAomiSvmConfig(svmWallets, selectedSolanaNetworkId),
    [selectedSolanaNetworkId, svmWallets],
  );
  const wagmiConfig = useMemo(
    () =>
      createAomiEvmConfig({
        chains: routing.routedChains,
        preset: evmWallets?.preset,
        wallets: evmWallets?.wallets,
        connectors: evmWallets?.connectors,
        walletConnectProjectId: evmWallets?.walletConnectProjectId,
        coinbase: evmWallets?.coinbase,
        appName: evmWallets?.appName,
        appLogoUrl: evmWallets?.appLogoUrl,
        transports: evmWallets?.transports ?? routing.transports,
      }),
    [evmWallets, routing.routedChains, routing.transports],
  );
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AomiEvmRuntimeProvider config={wagmiConfig}>
        {resolvedSvm.enabled && resolvedSvm.activeNetwork ? (
          <ConnectionProvider endpoint={resolvedSvm.rpcHttpUrl}>
            <WalletProvider wallets={resolvedSvm.wallets as never} autoConnect>
              <FullTestnetWalletRouter
                enabled={routing.enabled}
                chains={routing.routedChains}
                routedChainIds={routing.routedChainIds}
              >
                <WalletsOnlyWalletKitProvider
                  supportedChains={routing.routedChains}
                >
                  {children}
                </WalletsOnlyWalletKitProvider>
              </FullTestnetWalletRouter>
            </WalletProvider>
          </ConnectionProvider>
        ) : (
          <FullTestnetWalletRouter
            enabled={routing.enabled}
            chains={routing.routedChains}
            routedChainIds={routing.routedChainIds}
          >
            <WalletsOnlyWalletKitProvider supportedChains={routing.routedChains}>
              {children}
            </WalletsOnlyWalletKitProvider>
          </FullTestnetWalletRouter>
        )}
      </AomiEvmRuntimeProvider>
    </QueryClientProvider>
  );
}

export function AomiWalletKitProvider(input: AomiWalletKitProviderInput) {
  const props =
    detectProviderSugar(input) ?? (input as AomiWalletKitProviderProps);
  const provider = props.auth
    ? props.auth.provider
    : props.preset === "para"
      ? "para"
      : props.preset === "privy"
        ? "privy"
        : "none";

  const plugin = getWalletProvider(provider);
  if (plugin) {
    return <>{plugin.render(props)}</>;
  }

  return (
    <AomiWalletNetworkPreferencesProvider
      evmChains={
        props.wallets?.evm === false
          ? defaultNetworks
          : (props.wallets?.evm?.chains ?? defaultNetworks)
      }
      solanaNetworks={
        resolveAomiSvmConfig(
          props.wallets?.solana === false ? false : props.wallets?.solana,
        ).networks
      }
      storageKey="wallets-only"
    >
      <ExtUserProvider>
        <AomiWalletsOnlyProvider wallets={props.wallets}>
          {props.children}
        </AomiWalletsOnlyProvider>
      </ExtUserProvider>
    </AomiWalletNetworkPreferencesProvider>
  );
}

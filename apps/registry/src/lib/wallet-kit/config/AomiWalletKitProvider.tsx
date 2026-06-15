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
import { useDisabledEvmWalletRuntime } from "../runtime/evm/disabled-runtime";
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

type ResolvedSvmWalletsConfig = ReturnType<typeof resolveAomiSvmConfig>;

function WalletsOnlyComposerProvider({
  children,
  evmRuntime,
  supportedChains,
}: {
  children: ReactNode;
  evmRuntime: ReturnType<typeof useEvmWalletRuntime>;
  supportedChains: readonly Chain[];
}) {
  const {
    selectedSolanaNetwork,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks,
  } = useAomiWalletNetworkPreferences();
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

function EvmWalletsOnlyComposerProvider({
  children,
  supportedChains,
}: {
  children: ReactNode;
  supportedChains: readonly Chain[];
}) {
  const { selectedEvmChainId, setSelectedEvmChainId } =
    useAomiWalletNetworkPreferences();
  const evmRuntime = useEvmWalletRuntime({
    configuredChains: supportedChains,
    selectedEvmChainId,
    setSelectedEvmChainId,
    storageKey: REGISTRY_STORAGE_KEY,
  });

  return (
    <WalletsOnlyComposerProvider
      evmRuntime={evmRuntime}
      supportedChains={supportedChains}
    >
      {children}
    </WalletsOnlyComposerProvider>
  );
}

function SvmOnlyComposerProvider({ children }: { children: ReactNode }) {
  const evmRuntime = useDisabledEvmWalletRuntime({
    storageKey: REGISTRY_STORAGE_KEY,
  });

  return (
    <WalletsOnlyComposerProvider evmRuntime={evmRuntime} supportedChains={[]}>
      {children}
    </WalletsOnlyComposerProvider>
  );
}

function MaybeSvmWalletProvider({
  children,
  resolvedSvm,
}: {
  children: ReactNode;
  resolvedSvm: ResolvedSvmWalletsConfig;
}) {
  if (!resolvedSvm.enabled || !resolvedSvm.activeNetwork) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={resolvedSvm.rpcHttpUrl}>
      <WalletProvider wallets={resolvedSvm.wallets as never} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

function AomiEvmWalletsOnlyProvider({
  children,
  evmWallets,
  resolvedSvm,
}: {
  children: ReactNode;
  evmWallets: Exclude<WalletsConfig["evm"], false | undefined> | undefined;
  resolvedSvm: ResolvedSvmWalletsConfig;
}) {
  const chains = evmWallets?.chains ?? defaultNetworks;
  const routing = useFullTestnet(chains);
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
        <MaybeSvmWalletProvider resolvedSvm={resolvedSvm}>
          <FullTestnetWalletRouter
            enabled={routing.enabled}
            chains={routing.routedChains}
            routedChainIds={routing.routedChainIds}
          >
            <EvmWalletsOnlyComposerProvider
              supportedChains={routing.routedChains}
            >
              {children}
            </EvmWalletsOnlyComposerProvider>
          </FullTestnetWalletRouter>
        </MaybeSvmWalletProvider>
      </AomiEvmRuntimeProvider>
    </QueryClientProvider>
  );
}

function AomiSvmOnlyWalletsOnlyProvider({
  children,
  resolvedSvm,
}: {
  children: ReactNode;
  resolvedSvm: ResolvedSvmWalletsConfig;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MaybeSvmWalletProvider resolvedSvm={resolvedSvm}>
        <SvmOnlyComposerProvider>{children}</SvmOnlyComposerProvider>
      </MaybeSvmWalletProvider>
    </QueryClientProvider>
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
  const evmEnabled = wallets?.evm !== false;
  const svmWallets = wallets?.solana === false ? false : wallets?.solana;
  const { selectedSolanaNetworkId } = useAomiWalletNetworkPreferences();
  const resolvedSvm = useMemo(
    () => resolveAomiSvmConfig(svmWallets, selectedSolanaNetworkId),
    [selectedSolanaNetworkId, svmWallets],
  );

  if (!evmEnabled) {
    return (
      <AomiSvmOnlyWalletsOnlyProvider resolvedSvm={resolvedSvm}>
        {children}
      </AomiSvmOnlyWalletsOnlyProvider>
    );
  }

  return (
    <AomiEvmWalletsOnlyProvider
      evmWallets={evmWallets}
      resolvedSvm={resolvedSvm}
    >
      {children}
    </AomiEvmWalletsOnlyProvider>
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
          ? []
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

"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { useStandardWalletAdapters } from "@solana/wallet-standard-wallet-adapter-react";
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
import { resolveAAProviderState } from "../execution/aa-provider-state";
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
import { useSvmWalletRuntime } from "../runtime/svm/wallet-runtime";
import { REGISTRY_STORAGE_KEY } from "../registry/types";
import { createAomiEvmConfig } from "../catalog/evm-connector-catalog";
import { resolveAomiSvmConfig } from "../catalog/svm-wallet-catalog";
import { canonicalWalletKey } from "../catalog/wallet-branding";
import {
  detectProviderSugar,
  requireWalletProvider,
  type WalletProviderPlugin,
} from "../providers/plugin-registry";
import { registerDefaultWalletProviders } from "../providers/defaults";
import type {
  AomiWalletKitProviderInput,
  AomiWalletKitProviderProps,
  AuthConfig,
  ExecutionConfig,
  ProvidersConfig,
  WalletsConfig,
} from "./types";
import {
  resolveExecutionSponsorshipIdentity,
  resolveConfiguredNativeWalletExecutionPolicy,
} from "./execution";

export type { AomiWalletKitProviderInput, AomiWalletKitProviderProps };

registerDefaultWalletProviders();

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

type ResolvedSvmWalletsConfig = ReturnType<typeof resolveAomiSvmConfig>;

function ExternalWalletComposerProvider({
  children,
  evmRuntime,
  execution,
  supportedChains,
}: {
  children: ReactNode;
  evmRuntime: ReturnType<typeof useEvmWalletRuntime>;
  execution?: ExecutionConfig;
  supportedChains: readonly Chain[];
}) {
  const {
    selectedSolanaNetwork,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks,
  } = useAomiWalletNetworkPreferences();
  const svmRuntime = useSvmWalletRuntime({
    registryStore: evmRuntime.registryStore,
    selectedNetwork: selectedSolanaNetwork,
    supportedNetworks: supportedSolanaNetworks,
    setSelectedNetworkId: setSelectedSolanaNetworkId,
  });
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
      sponsorship: resolveExecutionSponsorshipIdentity(execution),
      evm: buildEvmExecutionRuntime(evmRuntime, {
        aaModes: execution?.modes,
        aaOwner: execution?.owner ?? "auto",
        aaPolicy: execution?.aa ?? "optional",
        aaProvider: execution?.provider ?? "auto",
        nativeWalletExecution:
          resolveConfiguredNativeWalletExecutionPolicy(execution),
        resolveAAProviderState: async (params, context) =>
          resolveAAProviderState({
            ...params,
            ownerStrategy: { kind: "external-wallet" },
            walletClient: context.walletClient,
            address: context.address,
          }),
      }),
    }),
    [evmRuntime, execution],
  );

  return (
    <AomiWalletKitComposer
      auth={authRuntime}
      evm={evmRuntime}
      svm={svmRuntime}
      execution={executionRuntime}
      supportedChains={supportedChains}
    >
      {children}
    </AomiWalletKitComposer>
  );
}

function EvmExternalWalletComposerProvider({
  children,
  execution,
  supportedChains,
}: {
  children: ReactNode;
  execution?: ExecutionConfig;
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
    <ExternalWalletComposerProvider
      evmRuntime={evmRuntime}
      execution={execution}
      supportedChains={supportedChains}
    >
      {children}
    </ExternalWalletComposerProvider>
  );
}

function SvmExternalWalletComposerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const evmRuntime = useDisabledEvmWalletRuntime({
    storageKey: REGISTRY_STORAGE_KEY,
  });

  return (
    <ExternalWalletComposerProvider
      evmRuntime={evmRuntime}
      supportedChains={[]}
    >
      {children}
    </ExternalWalletComposerProvider>
  );
}

function MaybeSvmWalletProvider({
  children,
  resolvedSvm,
}: {
  children: ReactNode;
  resolvedSvm: ResolvedSvmWalletsConfig;
}) {
  const standardWalletAdapters = useStandardWalletAdapters([]);
  const walletAdapters = useMemo(() => {
    const wanted = new Set<string>(resolvedSvm.walletIds);
    return standardWalletAdapters.filter((adapter) =>
      wanted.has(canonicalWalletKey(adapter.name)),
    );
  }, [resolvedSvm.walletIds, standardWalletAdapters]);

  if (!resolvedSvm.enabled || !resolvedSvm.activeNetwork) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={resolvedSvm.rpcHttpUrl}>
      <WalletProvider wallets={walletAdapters} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}

function WalletKitComposerOutlet({
  auth,
  authPlugin,
  children,
  execution,
  providers,
  resolvedSvm,
  routing,
  setSelectedSolanaNetworkId,
}: {
  auth?: AuthConfig;
  authPlugin?: WalletProviderPlugin;
  children: ReactNode;
  execution?: ExecutionConfig;
  providers?: ProvidersConfig;
  resolvedSvm: ResolvedSvmWalletsConfig;
  routing: ReturnType<typeof useFullTestnet<readonly [Chain, ...Chain[]]>>;
  setSelectedSolanaNetworkId: (networkId: string) => void;
}) {
  if (authPlugin?.renderComposer) {
    return (
      <>
        {authPlugin.renderComposer({
          auth,
          children,
          execution,
          providers,
          selectedSolanaNetwork: resolvedSvm.activeNetwork,
          setSelectedSolanaNetworkId,
          solanaRuntimeConfig:
            resolvedSvm.enabled && resolvedSvm.activeNetwork
              ? {
                  cluster: resolvedSvm.cluster,
                  rpcHttpUrl: resolvedSvm.rpcHttpUrl,
                  rpcWsUrl: resolvedSvm.rpcWsUrl,
                  preferDirectSend: resolvedSvm.preferDirectSend,
                }
              : undefined,
          supportedChains: routing.routedChains,
          supportedSolanaNetworks: resolvedSvm.networks,
        })}
      </>
    );
  }

  return (
    <EvmExternalWalletComposerProvider
      execution={execution}
      supportedChains={routing.routedChains}
    >
      {children}
    </EvmExternalWalletComposerProvider>
  );
}

function AomiEvmExternalWalletProvider({
  auth,
  authPlugin,
  children,
  evmWallets,
  execution,
  providers,
  resolvedSvm,
  setSelectedSolanaNetworkId,
}: {
  auth?: AuthConfig;
  authPlugin?: WalletProviderPlugin;
  children: ReactNode;
  evmWallets: Exclude<WalletsConfig["evm"], false | undefined> | undefined;
  execution?: ExecutionConfig;
  providers?: ProvidersConfig;
  resolvedSvm: ResolvedSvmWalletsConfig;
  setSelectedSolanaNetworkId: (networkId: string) => void;
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
  const authPluginAvailable =
    authPlugin?.isAvailable?.({ auth, providers }) ?? true;
  const shouldUseAuthPlugin = Boolean(
    authPlugin?.renderComposer && authPluginAvailable,
  );
  const wrapWithAuthProvider =
    authPlugin?.wrap ??
    ((props: { children: ReactNode }) => <>{props.children}</>);

  return (
    <QueryClientProvider client={queryClient}>
      {wrapWithAuthProvider({
        auth,
        providers,
        children: (
          <AomiEvmRuntimeProvider config={wagmiConfig}>
            <MaybeSvmWalletProvider resolvedSvm={resolvedSvm}>
              <FullTestnetWalletRouter
                enabled={routing.enabled}
                chains={routing.routedChains}
                routedChainIds={routing.routedChainIds}
              >
                <WalletKitComposerOutlet
                  auth={auth}
                  authPlugin={shouldUseAuthPlugin ? authPlugin : undefined}
                  execution={execution}
                  providers={providers}
                  resolvedSvm={resolvedSvm}
                  routing={routing}
                  setSelectedSolanaNetworkId={setSelectedSolanaNetworkId}
                >
                  {children}
                </WalletKitComposerOutlet>
              </FullTestnetWalletRouter>
            </MaybeSvmWalletProvider>
          </AomiEvmRuntimeProvider>
        ),
      })}
    </QueryClientProvider>
  );
}

function AomiSvmExternalWalletProvider({
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
        <SvmExternalWalletComposerProvider>
          {children}
        </SvmExternalWalletComposerProvider>
      </MaybeSvmWalletProvider>
    </QueryClientProvider>
  );
}

function AomiExternalWalletProvider({
  auth,
  authPlugin,
  children,
  execution,
  providers,
  wallets,
}: {
  auth?: AuthConfig;
  authPlugin?: WalletProviderPlugin;
  children: ReactNode;
  execution?: ExecutionConfig;
  providers?: ProvidersConfig;
  wallets?: WalletsConfig;
}) {
  const evmWallets = wallets?.evm === false ? undefined : wallets?.evm;
  const evmEnabled = wallets?.evm !== false;
  const svmWallets = wallets?.solana === false ? false : wallets?.solana;
  const { selectedSolanaNetworkId, setSelectedSolanaNetworkId } =
    useAomiWalletNetworkPreferences();
  const resolvedSvm = useMemo(
    () => resolveAomiSvmConfig(svmWallets, selectedSolanaNetworkId),
    [selectedSolanaNetworkId, svmWallets],
  );

  if (!evmEnabled) {
    return (
      <AomiSvmExternalWalletProvider resolvedSvm={resolvedSvm}>
        {children}
      </AomiSvmExternalWalletProvider>
    );
  }

  return (
    <AomiEvmExternalWalletProvider
      auth={auth}
      authPlugin={authPlugin}
      evmWallets={evmWallets}
      execution={execution}
      providers={providers}
      resolvedSvm={resolvedSvm}
      setSelectedSolanaNetworkId={setSelectedSolanaNetworkId}
    >
      {children}
    </AomiEvmExternalWalletProvider>
  );
}

export function AomiWalletKitProvider(input: AomiWalletKitProviderInput) {
  const props =
    detectProviderSugar(input) ?? (input as AomiWalletKitProviderProps);
  const authProvider =
    props.auth !== false && props.auth?.provider
      ? props.auth.provider
      : undefined;
  const authPlugin = authProvider
    ? requireWalletProvider(authProvider)
    : undefined;
  const presetProvider =
    props.preset && props.preset !== "wallets-only" ? props.preset : undefined;
  const provider =
    presetProvider ??
    (authProvider && authPlugin?.authMode !== "additive"
      ? authProvider
      : "none");
  if (provider !== "none") {
    requireWalletProvider(provider);
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
        <AomiExternalWalletProvider
          auth={props.auth}
          authPlugin={authPlugin}
          execution={props.execution}
          providers={props.providers}
          wallets={props.wallets}
        >
          {props.children}
        </AomiExternalWalletProvider>
      </ExtUserProvider>
    </AomiWalletNetworkPreferencesProvider>
  );
}

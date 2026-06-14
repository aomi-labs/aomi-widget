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
import { AomiAdapterComposer } from "../composer/AomiAdapterComposer";
import type { AuthRuntime, ExecutionRuntime } from "../composer/types";
import { resolveExternalWalletAAProviderState } from "../execution/aa-provider-state";
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
import { AomiParaProvider } from "../providers/para";
import { AomiPrivyProvider } from "../providers/privy";
import type { ParaSvmOptions } from "../providers/para/para-svm";
import type {
  AomiWalletKitProviderInput,
  AomiWalletKitProviderProps,
  AuthMethodId,
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

function toParaEnvironment(value?: "PROD" | "BETA") {
  if (!value) return undefined;
  return value;
}

function toParaOAuthMethods(
  methods: readonly AuthMethodId[] | undefined,
):
  | Array<"GOOGLE" | "APPLE" | "DISCORD" | "TWITTER" | "FARCASTER" | "TELEGRAM">
  | undefined {
  if (!methods) return undefined;
  const map = {
    google: "GOOGLE",
    apple: "APPLE",
    discord: "DISCORD",
    x: "TWITTER",
    farcaster: "FARCASTER",
    telegram: "TELEGRAM",
  } as const;
  return methods
    .map((method) => map[method as keyof typeof map])
    .filter((method): method is NonNullable<typeof method> => Boolean(method));
}

function isParaSugar(
  props: AomiWalletKitProviderInput,
): props is Extract<
  AomiWalletKitProviderInput,
  { auth: { provider: "para" } }
> {
  return (
    props.auth !== false &&
    props.auth?.provider === "para" &&
    "apiKey" in props.auth
  );
}

function isPrivySugar(
  props: AomiWalletKitProviderInput,
): props is Extract<
  AomiWalletKitProviderInput,
  { auth: { provider: "privy" } }
> {
  return (
    props.auth !== false &&
    props.auth?.provider === "privy" &&
    "appId" in props.auth
  );
}

function normalizeProps(
  input: AomiWalletKitProviderInput,
): AomiWalletKitProviderProps {
  if (isParaSugar(input)) {
    return {
      children: input.children,
      providers: {
        para: {
          apiKey: input.auth.apiKey,
          environment: input.auth.environment,
          appName: input.auth.appName,
          appDescription: input.auth.appDescription,
        },
      },
      auth: { provider: "para", methods: input.auth.methods },
    };
  }
  if (isPrivySugar(input)) {
    return {
      children: input.children,
      providers: {
        privy: {
          appId: input.auth.appId,
          appName: input.auth.appName,
        },
      },
      auth: { provider: "privy", methods: input.auth.methods },
    };
  }
  return input;
}

function toProviderSvmOptions(
  solana: WalletsConfig["solana"],
): ParaSvmOptions | undefined {
  if (solana === false) return { enabled: false };
  if (!solana) return undefined;
  return {
    networks: solana.networks,
    preferDirectSend: solana.preferDirectSend,
    wallets: resolveAomiSvmConfig(solana).wallets,
  };
}

function WalletsOnlyAdapterProvider({
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
      evm: {
        activeConnector: evmRuntime.activeConnector,
        capabilities: evmRuntime.capabilities,
        chainsById: evmRuntime.chainsById,
        currentChainId: evmRuntime.activeEvmConnection?.chainId,
        getWalletClientFor: evmRuntime.getWalletClientFor,
        sendCallsSyncAsync: evmRuntime.sendCallsSyncAsync,
        sendTransactionAsync: evmRuntime.sendTransactionAsync,
        shouldUseExternalSigner: evmRuntime.shouldUseExternalSigner,
        signMessageAsync: evmRuntime.signMessageAsync,
        signTypedDataAsync: evmRuntime.signTypedDataAsync,
        switchChainAsync: evmRuntime.switchChainAsync,
        walletClient: evmRuntime.walletClient,
        resolveAAProviderState: async (params, context) =>
          resolveExternalWalletAAProviderState({
            ...params,
            walletClient: context.walletClient,
            address: context.address,
          }),
      },
      svm: buildSvmTransactionMethods(svmWallet, svmRuntimeConfig),
    }),
    [evmRuntime, svmRuntimeConfig, svmWallet],
  );

  return (
    <AomiAdapterComposer
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
    </AomiAdapterComposer>
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
                <WalletsOnlyAdapterProvider
                  supportedChains={routing.routedChains}
                >
                  {children}
                </WalletsOnlyAdapterProvider>
              </FullTestnetWalletRouter>
            </WalletProvider>
          </ConnectionProvider>
        ) : (
          <FullTestnetWalletRouter
            enabled={routing.enabled}
            chains={routing.routedChains}
            routedChainIds={routing.routedChainIds}
          >
            <WalletsOnlyAdapterProvider supportedChains={routing.routedChains}>
              {children}
            </WalletsOnlyAdapterProvider>
          </FullTestnetWalletRouter>
        )}
      </AomiEvmRuntimeProvider>
    </QueryClientProvider>
  );
}

export function AomiWalletKitProvider(input: AomiWalletKitProviderInput) {
  const props = normalizeProps(input);
  const provider = props.auth
    ? props.auth.provider
    : props.preset === "para"
      ? "para"
      : props.preset === "privy"
        ? "privy"
        : "none";

  if (provider === "para") {
    const para =
      props.providers?.para === false ? undefined : props.providers?.para;
    const auth =
      props.auth !== false && props.auth?.provider === "para"
        ? props.auth
        : undefined;
    const evmWallets =
      props.wallets?.evm === false ? undefined : props.wallets?.evm;
    return (
      <AomiParaProvider
        apiKey={para?.apiKey}
        environment={toParaEnvironment(para?.environment)}
        appName={para?.appName}
        appDescription={para?.appDescription}
        appUrl={para?.appUrl}
        networks={evmWallets?.chains}
        walletConnectProjectId={evmWallets?.walletConnectProjectId}
        oAuthMethods={toParaOAuthMethods(auth?.methods)}
        svm={toProviderSvmOptions(props.wallets?.solana)}
      >
        {props.children}
      </AomiParaProvider>
    );
  }

  if (provider === "privy") {
    const privy =
      props.providers?.privy === false ? undefined : props.providers?.privy;
    const auth =
      props.auth !== false && props.auth?.provider === "privy"
        ? props.auth
        : undefined;
    const evmWallets =
      props.wallets?.evm === false ? undefined : props.wallets?.evm;
    return (
      <AomiPrivyProvider
        appId={privy?.appId}
        appName={privy?.appName}
        appLogoUrl={privy?.appLogoUrl}
        networks={evmWallets?.chains}
        walletConnectProjectId={evmWallets?.walletConnectProjectId}
        loginMethods={auth?.methods as never}
        solana={
          props.wallets?.solana === false ? undefined : props.wallets?.solana
        }
      >
        {props.children}
      </AomiPrivyProvider>
    );
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

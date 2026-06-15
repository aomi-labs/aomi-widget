"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Environment,
  ParaProvider,
  type TExternalWallet,
  type TOAuthMethod,
} from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Chain, Transport } from "viem";
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
import { ExtUserProvider } from "@aomi-labs/react";
import { monad, monadTestnet } from "@aomi-labs/client";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../../network-preferences";
import type { EvmWalletsConfig, ExecutionConfig } from "../../config/types";
import {
  FullTestnetWalletRouter,
  useFullTestnet,
} from "../../full-testnet-wallet-routing";
import { createAomiEvmConfig } from "../../catalog/evm-connector-catalog";
import { AomiEvmRuntimeProvider } from "../../runtime/evm/provider";
import type { EvmWalletId } from "../../catalog/wallet-ids";
import { normalizeSvmNetworkOptions } from "../../runtime/svm/networks";
import {
  ParaSvmWrapper,
  resolveParaSvmConfig,
  type ParaSvmOptions,
} from "./para-svm";
import {
  AomiParaPluginProvider,
  type AomiParaPluginProviderProps,
} from "./ParaPluginProvider";
import { defaultOAuthMethods } from "./para-auth";

export type { AomiParaPluginProviderProps };

export type AomiParaProviderProps = {
  children: ReactNode;
  appName?: string;
  appDescription?: string;
  appUrl?: string;
  apiKey?: string;
  environment?: Environment;
  networks?: readonly [Chain, ...Chain[]];
  wallets?: EvmWalletsConfig;
  /** @deprecated use `wallets.walletConnectProjectId` */
  walletConnectProjectId?: string;
  /** @deprecated use `wallets.wallets` with generic Aomi EVM wallet ids */
  externalWallets?: TExternalWallet[];
  oAuthMethods?: TOAuthMethod[];
  execution?: ExecutionConfig;
  svm?: ParaSvmOptions;
  /** @deprecated use `svm` */
  solana?: ParaSvmOptions;
};

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

function legacyParaExternalWalletsToEvmWalletIds(
  wallets: readonly TExternalWallet[],
): EvmWalletId[] {
  const ids: EvmWalletId[] = [];
  for (const wallet of wallets) {
    const id = (() => {
      switch (wallet) {
        case "WALLETCONNECT":
          return "walletconnect";
        case "METAMASK":
          return "metamask";
        case "COINBASE":
          return "coinbase";
        case "RAINBOW":
          return "rainbow";
        case "RABBY":
          return "rabby";
        default:
          return undefined;
      }
    })();
    if (id) ids.push(id);
  }
  return ids;
}

function AomiParaProviderInner({
  children,
  appName = "Aomi",
  appDescription = "Aomi widget",
  appUrl,
  apiKey = process.env.NEXT_PUBLIC_PARA_API_KEY,
  environment = (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as
    | Environment
    | undefined) ?? Environment.BETA,
  networks = defaultNetworks,
  wallets,
  walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    process.env.NEXT_PUBLIC_PROJECT_ID,
  externalWallets,
  oAuthMethods = defaultOAuthMethods,
  execution,
  svm,
  solana,
}: AomiParaProviderProps) {
  const svmOptions = svm ?? solana;
  const [queryClient] = useState(() => new QueryClient());
  const routing = useFullTestnet(networks);
  const { selectedSolanaNetworkId } = useAomiWalletNetworkPreferences();
  // Everything handed to <ParaProvider> must keep a stable identity across
  // re-renders. Para's SDK compares these props by reference and rebuilds
  // its wagmi config when they churn, which drops in-memory wallet state.
  const legacyWalletIds = useMemo(
    () =>
      externalWallets
        ? legacyParaExternalWalletsToEvmWalletIds(externalWallets)
        : undefined,
    [externalWallets],
  );
  const resolvedWalletConnectProjectId =
    wallets?.walletConnectProjectId ?? walletConnectProjectId;
  const paraClientConfig = useMemo(
    () => (apiKey ? { apiKey, env: environment } : null),
    [apiKey, environment],
  );
  const paraConfig = useMemo(() => ({ appName }), [appName]);
  const resolvedSvmConfig = useMemo(
    () => resolveParaSvmConfig(svmOptions, selectedSolanaNetworkId),
    [selectedSolanaNetworkId, svmOptions],
  );
  const transports = useMemo(
    () =>
      (wallets?.transports ?? routing.transports) as Record<number, Transport>,
    [routing.transports, wallets?.transports],
  );
  const paraModalConfig = useMemo(
    () => ({
      disableEmailLogin: false,
      oAuthMethods,
    }),
    [oAuthMethods],
  );
  const evmConfig = useMemo(
    () =>
      createAomiEvmConfig({
        chains: routing.routedChains,
        transports,
        walletConnectProjectId: resolvedWalletConnectProjectId,
        appName: wallets?.appName ?? appName,
        appLogoUrl: wallets?.appLogoUrl,
        wallets: wallets?.wallets ?? legacyWalletIds,
        ssr: true,
      }),
    [
      appName,
      legacyWalletIds,
      resolvedWalletConnectProjectId,
      routing.routedChains,
      transports,
      wallets?.appLogoUrl,
      wallets?.appName,
      wallets?.wallets,
    ],
  );
  const paraExternalWalletConfig = useMemo(
    () => ({
      appDescription,
      appUrl:
        appUrl ??
        (typeof window !== "undefined"
          ? window.location.origin
          : "https://aomi.dev"),
      wallets: [],
      walletConnect: undefined,
    }),
    [appDescription, appUrl],
  );

  const svmEnabled =
    resolvedSvmConfig.enabled && resolvedSvmConfig.wallets.length > 0;

  const svmProviderConfig = useMemo(
    () => ({
      wallets: resolvedSvmConfig.wallets,
      endpoint: resolvedSvmConfig.rpcHttpUrl,
      chain: resolvedSvmConfig.mobileChain,
      appIdentity: {
        name: appName,
        uri: appUrl,
      },
    }),
    [
      appName,
      appUrl,
      resolvedSvmConfig.mobileChain,
      resolvedSvmConfig.rpcHttpUrl,
      resolvedSvmConfig.wallets,
    ],
  );

  return (
    <ExtUserProvider>
      <QueryClientProvider client={queryClient}>
        {paraClientConfig ? (
          <ParaProvider
            paraClientConfig={paraClientConfig}
            config={paraConfig}
            paraModalConfig={paraModalConfig}
            externalWalletConfig={paraExternalWalletConfig}
          >
            <AomiEvmRuntimeProvider config={evmConfig}>
              <ParaSvmWrapper
                key={resolvedSvmConfig.activeNetwork.id}
                enabled={svmEnabled}
                config={svmProviderConfig}
              >
                <FullTestnetWalletRouter
                  enabled={routing.enabled}
                  chains={routing.routedChains}
                  routedChainIds={routing.routedChainIds}
                >
                  <AomiParaPluginProvider
                    execution={execution}
                    supportedChains={routing.routedChains}
                    svmConfig={resolvedSvmConfig}
                    oAuthMethods={oAuthMethods}
                  >
                    {children}
                  </AomiParaPluginProvider>
                </FullTestnetWalletRouter>
              </ParaSvmWrapper>
            </AomiEvmRuntimeProvider>
          </ParaProvider>
        ) : (
          <FullTestnetWalletRouter
            enabled={routing.enabled}
            chains={routing.routedChains}
            routedChainIds={routing.routedChainIds}
          >
            <AomiParaPluginProvider
              execution={execution}
              supportedChains={routing.routedChains}
              svmConfig={resolvedSvmConfig}
              oAuthMethods={oAuthMethods}
            >
              {children}
            </AomiParaPluginProvider>
          </FullTestnetWalletRouter>
        )}
      </QueryClientProvider>
    </ExtUserProvider>
  );
}

export function AomiParaProvider(props: AomiParaProviderProps) {
  const svmOptions = props.svm ?? props.solana;
  const supportedSolanaNetworks = useMemo(
    () => normalizeSvmNetworkOptions(svmOptions),
    [svmOptions],
  );

  return (
    <AomiWalletNetworkPreferencesProvider
      evmChains={props.networks ?? defaultNetworks}
      solanaNetworks={supportedSolanaNetworks}
      storageKey="para"
    >
      <AomiParaProviderInner {...props} />
    </AomiWalletNetworkPreferencesProvider>
  );
}

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
import {
  FullTestnetWalletRouter,
  useFullTestnet,
} from "../../full-testnet-wallet-routing";
import {
  AomiParaEvmRuntimeProvider,
  type AomiParaEvmRuntimeConfig,
} from "./para-evm-runtime";
import { normalizeSolanaNetworkOptions } from "../../runtime/solana/networks";
import {
  ParaSolanaWrapper,
  resolveParaSolanaConfig,
  type ParaSolanaOptions,
} from "./para-sol";
import {
  AomiParaAdapterProvider,
  type AomiParaAdapterProviderProps,
} from "./ParaPluginProvider";
import { defaultOAuthMethods } from "./para-auth";

export type { AomiParaAdapterProviderProps };

export type AomiParaProviderProps = {
  children: ReactNode;
  appName?: string;
  appDescription?: string;
  appUrl?: string;
  apiKey?: string;
  environment?: Environment;
  networks?: readonly [Chain, ...Chain[]];
  walletConnectProjectId?: string;
  externalWallets?: TExternalWallet[];
  oAuthMethods?: TOAuthMethod[];
  solana?: ParaSolanaOptions;
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

const defaultExternalWallets: TExternalWallet[] = [
  "WALLETCONNECT",
  "METAMASK",
  "COINBASE",
  "RAINBOW",
  "RABBY",
];

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
  walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    process.env.NEXT_PUBLIC_PROJECT_ID,
  externalWallets = defaultExternalWallets,
  oAuthMethods = defaultOAuthMethods,
  solana,
}: AomiParaProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const routing = useFullTestnet(networks);
  const { selectedSolanaNetworkId } = useAomiWalletNetworkPreferences();
  // Everything handed to <ParaProvider> must keep a stable identity across
  // re-renders. Para's SDK compares these props by reference and rebuilds
  // its wagmi config when they churn, which drops in-memory wallet state.
  const resolvedWallets = useMemo(
    () =>
      walletConnectProjectId
        ? externalWallets
        : externalWallets.filter((wallet) => wallet !== "WALLETCONNECT"),
    [externalWallets, walletConnectProjectId],
  );
  const paraClientConfig = useMemo(
    () => (apiKey ? { apiKey, env: environment } : null),
    [apiKey, environment],
  );
  const paraConfig = useMemo(() => ({ appName }), [appName]);
  const resolvedSolanaConfig = useMemo(
    () => resolveParaSolanaConfig(solana, selectedSolanaNetworkId),
    [selectedSolanaNetworkId, solana],
  );
  const transports = useMemo(
    () => routing.transports as Record<number, Transport>,
    [routing.transports],
  );
  const paraModalConfig = useMemo(
    () => ({
      disableEmailLogin: false,
      oAuthMethods,
    }),
    [oAuthMethods],
  );
  const paraExternalWalletConfig = useMemo(
    () => ({
      appDescription,
      appUrl:
        appUrl ??
        (typeof window !== "undefined"
          ? window.location.origin
          : "https://aomi.dev"),
      wallets: [] as TExternalWallet[],
    }),
    [appDescription, appUrl],
  );
  const evmRuntimeConfig = useMemo(
    () =>
      ({
        appName,
        appDescription,
        appUrl:
          appUrl ??
          (typeof window !== "undefined"
            ? window.location.origin
            : "https://aomi.dev"),
        wallets: resolvedWallets,
        projectId: walletConnectProjectId ?? "",
        chains: routing.routedChains,
        transports,
        ssr: true,
      }) satisfies AomiParaEvmRuntimeConfig,
    [
      appName,
      appDescription,
      appUrl,
      routing.routedChains,
      resolvedWallets,
      transports,
      walletConnectProjectId,
    ],
  );

  const solanaEnabled =
    resolvedSolanaConfig.enabled && resolvedSolanaConfig.wallets.length > 0;

  const solanaProviderConfig = useMemo(
    () => ({
      wallets: resolvedSolanaConfig.wallets,
      endpoint: resolvedSolanaConfig.rpcHttpUrl,
      chain: resolvedSolanaConfig.mobileChain,
      appIdentity: {
        name: appName,
        uri: appUrl,
      },
    }),
    [
      appName,
      appUrl,
      resolvedSolanaConfig.mobileChain,
      resolvedSolanaConfig.rpcHttpUrl,
      resolvedSolanaConfig.wallets,
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
            <AomiParaEvmRuntimeProvider config={evmRuntimeConfig}>
              <ParaSolanaWrapper
                key={resolvedSolanaConfig.activeNetwork.id}
                enabled={solanaEnabled}
                config={solanaProviderConfig}
              >
                <FullTestnetWalletRouter
                  enabled={routing.enabled}
                  chains={routing.routedChains}
                  routedChainIds={routing.routedChainIds}
                >
                  <AomiParaAdapterProvider
                    supportedChains={routing.routedChains}
                    solanaConfig={resolvedSolanaConfig}
                    oAuthMethods={oAuthMethods}
                  >
                    {children}
                  </AomiParaAdapterProvider>
                </FullTestnetWalletRouter>
              </ParaSolanaWrapper>
            </AomiParaEvmRuntimeProvider>
          </ParaProvider>
        ) : (
          <FullTestnetWalletRouter
            enabled={routing.enabled}
            chains={routing.routedChains}
            routedChainIds={routing.routedChainIds}
          >
            <AomiParaAdapterProvider
              supportedChains={routing.routedChains}
              solanaConfig={resolvedSolanaConfig}
              oAuthMethods={oAuthMethods}
            >
              {children}
            </AomiParaAdapterProvider>
          </FullTestnetWalletRouter>
        )}
      </QueryClientProvider>
    </ExtUserProvider>
  );
}

export function AomiParaProvider(props: AomiParaProviderProps) {
  const supportedSolanaNetworks = useMemo(
    () => normalizeSolanaNetworkOptions(props.solana),
    [props.solana],
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

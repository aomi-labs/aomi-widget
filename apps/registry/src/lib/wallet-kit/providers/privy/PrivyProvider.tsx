"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  PrivyProvider as PrivyAuthProvider,
  type PrivyClientConfig,
} from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Chain } from "viem";
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
import { createAomiEvmConfig } from "../../catalog/evm-connector-catalog";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../../network-preferences";
import {
  normalizeSvmNetworkOptions,
  resolveSelectedSvmNetwork,
} from "../../catalog/svm-networks";
import type { SvmNetworkOption } from "../../types";
import type { EvmWalletsConfig, ExecutionConfig } from "../../config/types";
import {
  AomiPrivyPluginProvider,
  type PrivySvmRuntimeConfig,
} from "./PrivyPluginProvider";

const defaultNetworks = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
] as const;

export type AomiPrivyProviderProps = {
  children: ReactNode;
  appId?: string;
  appName?: string;
  appLogoUrl?: string;
  networks?: readonly [Chain, ...Chain[]];
  wallets?: EvmWalletsConfig;
  loginMethods?: PrivyClientConfig["loginMethods"];
  walletConnectProjectId?: string;
  execution?: ExecutionConfig;
  solana?: {
    networks?: readonly SvmNetworkOption[];
    cluster?: PrivySvmRuntimeConfig["cluster"];
    rpcHttpUrl?: string;
    rpcWsUrl?: string;
    preferDirectSend?: boolean;
  };
};

function AomiPrivyProviderInner({
  children,
  appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  appName = "Aomi",
  appLogoUrl,
  networks = defaultNetworks,
  wallets,
  loginMethods,
  execution,
  walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  solana,
}: AomiPrivyProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const { selectedEvmChainId, selectedSolanaNetworkId } =
    useAomiWalletNetworkPreferences();
  const defaultEvmChain =
    networks.find((chain) => chain.id === selectedEvmChainId) ?? networks[0];
  const resolvedSvmConfig = useMemo<PrivySvmRuntimeConfig>(() => {
    const supportedNetworks = normalizeSvmNetworkOptions(solana);
    const activeNetwork = resolveSelectedSvmNetwork(
      supportedNetworks,
      selectedSolanaNetworkId,
    );
    return {
      networks: supportedNetworks,
      activeNetwork,
      cluster: activeNetwork.cluster,
      rpcHttpUrl: activeNetwork.rpcHttpUrl,
      rpcWsUrl: activeNetwork.rpcWsUrl,
      preferDirectSend: solana?.preferDirectSend ?? true,
    };
  }, [selectedSolanaNetworkId, solana]);
  const wagmiConfig = useMemo(
    () =>
      createAomiEvmConfig({
        chains: networks,
        preset: wallets?.preset,
        wallets: wallets?.wallets,
        connectors: wallets?.connectors,
        walletConnectProjectId,
        coinbase: wallets?.coinbase,
        appName,
        appLogoUrl,
        transports: wallets?.transports,
      }),
    [appLogoUrl, appName, networks, walletConnectProjectId, wallets],
  );

  const adapter = (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <SmartWalletsProvider>
          <AomiPrivyPluginProvider
            solanaConfig={resolvedSvmConfig}
            supportedChains={networks}
            loginMethods={loginMethods}
            execution={execution}
          >
            {children}
          </AomiPrivyPluginProvider>
        </SmartWalletsProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );

  if (!appId) return adapter;

  return (
    <PrivyAuthProvider
      appId={appId}
      config={
        {
          appearance: {
            walletList: ["detected_wallets", "metamask", "wallet_connect"],
            logo: appLogoUrl,
          },
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
            solana: { createOnLogin: "all-users" },
          },
          defaultChain: defaultEvmChain,
          supportedChains: networks as unknown as Chain[],
          loginMethods,
          ...(walletConnectProjectId
            ? { walletConnectCloudProjectId: walletConnectProjectId }
            : {}),
          appName,
        } as PrivyClientConfig
      }
    >
      {adapter}
    </PrivyAuthProvider>
  );
}

export function AomiPrivyProvider({
  networks = defaultNetworks,
  wallets,
  solana,
  ...rest
}: AomiPrivyProviderProps) {
  const supportedSolanaNetworks = useMemo(
    () => normalizeSvmNetworkOptions(solana),
    [solana],
  );

  return (
    <AomiWalletNetworkPreferencesProvider
      evmChains={networks}
      solanaNetworks={supportedSolanaNetworks}
      storageKey="privy"
    >
      <ExtUserProvider>
        <AomiPrivyProviderInner
          {...rest}
          networks={networks}
          wallets={wallets}
          solana={solana}
        />
      </ExtUserProvider>
    </AomiWalletNetworkPreferencesProvider>
  );
}

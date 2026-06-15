"use client";

import { type ReactNode, useMemo } from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import {
  registerWalletProvider,
  type WalletProviderPlugin,
} from "../plugin-registry";
import { AomiPrivyPluginProvider, AomiPrivyProvider } from "./privy";
import type { AuthConfig, ProvidersConfig } from "../../config/types";
import type { SvmNetworkOption } from "../../types";

function PrivyAuthLayer({
  auth,
  children,
  providers,
}: {
  auth?: AuthConfig;
  children: ReactNode;
  providers?: ProvidersConfig;
}) {
  const enabled = auth !== false && auth?.provider === "privy";
  const privy = providers?.privy === false ? undefined : providers?.privy;
  const appId = privy?.appId ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const config = useMemo(
    () =>
      ({
        appearance: {
          walletList: ["detected_wallets", "metamask", "wallet_connect"],
          logo: privy?.appLogoUrl,
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          solana: { createOnLogin: "all-users" },
        },
        loginMethods: enabled
          ? (auth?.methods as PrivyClientConfig["loginMethods"])
          : undefined,
        ...(privy?.appName ? { appName: privy.appName } : {}),
      }) as PrivyClientConfig,
    [auth, enabled, privy?.appLogoUrl, privy?.appName],
  );

  if (!enabled || !appId) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider appId={appId} config={config}>
      <SmartWalletsProvider>{children}</SmartWalletsProvider>
    </PrivyProvider>
  );
}

function fallbackSvmNetwork(network?: SvmNetworkOption): SvmNetworkOption {
  return (
    network ?? {
      id: "solana-mainnet",
      label: "Solana Mainnet",
      cluster: "solana:mainnet",
      rpcHttpUrl: "https://api.mainnet-beta.solana.com",
      isDefault: true,
    }
  );
}

export const privyPlugin: WalletProviderPlugin = {
  id: "privy",
  authMode: "additive",
  isAvailable: ({ auth, providers }) => {
    const enabled = auth !== false && auth?.provider === "privy";
    const privy = providers?.privy === false ? undefined : providers?.privy;
    return Boolean(
      enabled && (privy?.appId ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    );
  },
  wrap: (props) => <PrivyAuthLayer {...props} />,
  renderComposer: ({
    auth,
    children,
    execution,
    selectedSolanaNetwork,
    supportedChains,
  }) => (
    <AomiPrivyPluginProvider
      solanaConfig={{
        networks: [fallbackSvmNetwork(selectedSolanaNetwork)],
        activeNetwork: fallbackSvmNetwork(selectedSolanaNetwork),
        cluster: fallbackSvmNetwork(selectedSolanaNetwork).cluster,
        rpcHttpUrl: fallbackSvmNetwork(selectedSolanaNetwork).rpcHttpUrl,
        rpcWsUrl: fallbackSvmNetwork(selectedSolanaNetwork).rpcWsUrl,
        preferDirectSend: true,
      }}
      supportedChains={supportedChains}
      loginMethods={
        auth !== false && auth?.provider === "privy"
          ? (auth.methods as PrivyClientConfig["loginMethods"])
          : undefined
      }
      execution={execution}
    >
      {children}
    </AomiPrivyPluginProvider>
  ),
  /** @deprecated full provider render path retained for direct legacy imports. */
  render: (props) => {
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
        execution={props.execution}
        networks={evmWallets?.chains}
        wallets={evmWallets}
        walletConnectProjectId={evmWallets?.walletConnectProjectId}
        loginMethods={auth?.methods as never}
        solana={
          props.wallets?.solana === false ? undefined : props.wallets?.solana
        }
      >
        {props.children}
      </AomiPrivyProvider>
    );
  },
  detectSugar: (input) => {
    if (
      input.auth !== false &&
      input.auth?.provider === "privy" &&
      "appId" in input.auth
    ) {
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
    return null;
  },
};

export function registerAomiPrivyWalletProvider(): void {
  registerWalletProvider(privyPlugin);
}

registerAomiPrivyWalletProvider();

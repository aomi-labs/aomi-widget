"use client";

import { type ReactNode, useMemo } from "react";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import {
  registerWalletProvider,
  type WalletProviderPlugin,
} from "../plugin-registry";
import { AomiPrivyPluginProvider } from "./PrivyPluginProvider";
import { buildPrivyClientConfig } from "./privy-auth";
import type { AuthConfig, ProvidersConfig } from "../../config/types";

function isPrivyAuth(
  auth: AuthConfig | undefined,
): auth is Extract<AuthConfig, { provider: "privy" }> {
  return auth !== false && auth?.provider === "privy";
}

function PrivyAuthLayer({
  auth,
  children,
  providers,
}: {
  auth?: AuthConfig;
  children: ReactNode;
  providers?: ProvidersConfig;
}) {
  const enabled = isPrivyAuth(auth);
  const privy = providers?.privy === false ? undefined : providers?.privy;
  const appId = privy?.appId ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const config = useMemo(
    () =>
      buildPrivyClientConfig({
        appLogoUrl: privy?.appLogoUrl,
        appName: privy?.appName,
        loginMethods: enabled
          ? (auth?.methods as PrivyClientConfig["loginMethods"])
          : undefined,
      }),
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

export const privyPlugin: WalletProviderPlugin = {
  id: "privy",
  authMode: "additive",
  isAvailable: ({ auth, providers }) => {
    const enabled = isPrivyAuth(auth);
    const privy = providers?.privy === false ? undefined : providers?.privy;
    return Boolean(
      enabled && (privy?.appId ?? process.env.NEXT_PUBLIC_PRIVY_APP_ID),
    );
  },
  wrap: (props) => <PrivyAuthLayer {...props} />,
  renderComposer: ({
    account,
    auth,
    children,
    execution,
    solanaRuntimeConfig,
    supportedChains,
  }) => (
    <AomiPrivyPluginProvider
      supportedChains={supportedChains}
      loginMethods={
        isPrivyAuth(auth)
          ? (auth.methods as PrivyClientConfig["loginMethods"])
          : undefined
      }
      execution={execution}
      account={account}
      preferDirectSend={solanaRuntimeConfig?.preferDirectSend}
    >
      {children}
    </AomiPrivyPluginProvider>
  ),
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

"use client";

import { createElement, type ReactNode } from "react";
import type { Chain } from "viem";
import type { TExternalWallet, TOAuthMethod } from "@getpara/react-sdk";
import { AomiWalletKitProvider } from "../../config";
import type { AuthMethodId } from "../../config/types";
import type { EvmWalletId } from "../../catalog/wallet-ids";

export {
  AomiParaPluginProvider,
  type AomiParaPluginProviderProps,
} from "./ParaPluginProvider";
export { paraPlugin, registerAomiParaWalletProvider } from "./para-plugin";

export type AomiParaProviderProps = {
  children: ReactNode;
  appName?: string;
  appDescription?: string;
  appUrl?: string;
  apiKey?: string;
  environment?: "PROD" | "BETA";
  networks?: readonly [Chain, ...Chain[]];
  walletConnectProjectId?: string;
  externalWallets?: readonly TExternalWallet[];
  oAuthMethods?: readonly TOAuthMethod[];
};

const externalWalletMap: Partial<Record<TExternalWallet, EvmWalletId>> = {
  COINBASE: "coinbase",
  METAMASK: "metamask",
  RABBY: "rabby",
  RAINBOW: "rainbow",
  WALLETCONNECT: "walletconnect",
};

const oAuthMethodMap: Partial<Record<TOAuthMethod, AuthMethodId>> = {
  APPLE: "apple",
  DISCORD: "discord",
  FARCASTER: "farcaster",
  GOOGLE: "google",
  TELEGRAM: "telegram",
  TWITTER: "x",
};

/** @deprecated use AomiWalletKitProvider with auth={{ provider: "para" }}. */
export function AomiParaProvider({
  appDescription,
  appName,
  appUrl,
  apiKey,
  children,
  environment,
  externalWallets,
  networks,
  oAuthMethods,
  walletConnectProjectId,
}: AomiParaProviderProps) {
  const wallets = externalWallets
    ?.map((wallet) => externalWalletMap[wallet])
    .filter((wallet): wallet is EvmWalletId => Boolean(wallet));
  const methods = oAuthMethods
    ?.map((method) => oAuthMethodMap[method])
    .filter((method): method is AuthMethodId => Boolean(method));

  return createElement(AomiWalletKitProvider, {
    auth: { provider: "para", methods },
    providers: {
      para: {
        apiKey,
        appDescription,
        appName,
        appUrl,
        environment,
      },
    },
    wallets: {
      evm: {
        appName,
        chains: networks,
        walletConnectProjectId,
        wallets,
      },
    },
    children,
  });
}

export type AomiParaAdapterProviderProps = AomiParaProviderProps;

/** @deprecated use AomiParaProvider or AomiWalletKitProvider. */
export const AomiParaAdapterProvider = AomiParaProvider;

"use client";

import { AomiWalletKitProvider } from "../config";
import type { AomiWalletKitProviderInput } from "../config";
import type { SvmWalletsConfig } from "../config/types";
import type { Chain } from "viem";
import type { TExternalWallet, TOAuthMethod } from "@getpara/react-sdk";

export type AomiWalletProviderProps =
  | AomiWalletKitProviderInput
  | (AomiWalletKitProviderInput & {
      /** @deprecated use AomiWalletKitProvider preset/auth config. */
      provider?: "para" | "privy" | (string & {});
      apiKey?: string;
      environment?: "PROD" | "BETA" | (string & {});
      appName?: string;
      appDescription?: string;
      appUrl?: string;
      networks?: readonly [Chain, ...Chain[]];
      walletConnectProjectId?: string;
      externalWallets?: readonly TExternalWallet[];
      oAuthMethods?: readonly TOAuthMethod[];
      solana?: SvmWalletsConfig | false;
    });

/** @deprecated use AomiWalletKitProvider. */
export function AomiWalletProvider(props: AomiWalletProviderProps) {
  const { provider, ...rest } = props as AomiWalletProviderProps & {
    provider?: string;
  };
  if (!provider) return <AomiWalletKitProvider {...rest} />;
  return <AomiWalletKitProvider {...rest} preset={provider as never} />;
}

export { AomiWalletKitProvider };
export type { AomiWalletKitProviderInput };

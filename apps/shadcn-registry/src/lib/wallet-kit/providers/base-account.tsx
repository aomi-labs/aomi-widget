"use client";

import type { ReactNode } from "react";
import type { Chain } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import { AomiWalletKitProvider } from "../config";
import type { ExecutionConfig } from "../config/types";

export type BaseAccountSponsorshipOptions = ExecutionConfig["sponsorship"];

export type AomiBaseAccountProviderProps = {
  children: ReactNode;
  appName: string;
  appLogoUrl?: string | null;
  chains?: readonly [Chain, ...Chain[]];
  includeBaseSepolia?: boolean;
  sponsorship?: BaseAccountSponsorshipOptions;
};

/** @deprecated use AomiWalletKitProvider with wallets.evm.wallets=["baseAccount"]. */
export function AomiBaseAccountProvider({
  appLogoUrl,
  appName,
  chains,
  children,
  includeBaseSepolia,
  sponsorship,
}: AomiBaseAccountProviderProps) {
  const resolvedChains =
    chains ??
    (includeBaseSepolia ? ([base, baseSepolia] as const) : ([base] as const));

  return (
    <AomiWalletKitProvider
      wallets={{
        evm: {
          appLogoUrl,
          appName,
          chains: resolvedChains,
          coinbase: false,
          wallets: ["baseAccount"],
        },
        solana: false,
      }}
      execution={{
        aa: sponsorship?.mode === "required" ? "required" : "optional",
        modes: ["4337"],
        owner: "external-wallet",
        provider: "auto",
        sponsorship,
      }}
    >
      {children}
    </AomiWalletKitProvider>
  );
}

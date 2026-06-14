"use client";

import type { ReactNode } from "react";
import type { Chain } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import type { SponsorshipPaymasterServiceContext } from "@aomi-labs/react";
import { AomiWalletKitProvider } from "../../config/AomiWalletKitProvider";

export type BaseAccountSponsorshipOptions =
  | {
      mode?: "disabled";
    }
  | {
      mode: "optional";
      paymasterServiceContext?:
        | SponsorshipPaymasterServiceContext
        | ((chainId: number) => SponsorshipPaymasterServiceContext | undefined);
      paymasterServiceUrl?: string | ((chainId: number) => string | undefined);
      sendCallsTimeoutMs?: number;
    }
  | {
      mode: "required";
      paymasterServiceContext?:
        | SponsorshipPaymasterServiceContext
        | ((chainId: number) => SponsorshipPaymasterServiceContext | undefined);
      paymasterServiceUrl?: string | ((chainId: number) => string | undefined);
      sendCallsTimeoutMs?: number;
    };

export type AomiBaseAccountProviderProps = {
  children: ReactNode;
  appName: string;
  appLogoUrl?: string | null;
  chains?: readonly [Chain, ...Chain[]];
  includeBaseSepolia?: boolean;
  /**
   * @deprecated Base Account is now an explicit wallet in the shared EVM
   * catalog. Sponsorship should be configured by the connector/paymaster
   * runtime; this wrapper keeps the old prop shape for source compatibility.
   */
  sponsorship?: BaseAccountSponsorshipOptions;
};

/**
 * @deprecated Use `AomiWalletKitProvider` with
 * `wallets={{ evm: { wallets: ["baseAccount"] } }}`. This shim exists for the
 * registry/npm compatibility window and intentionally delegates to the shared
 * provider-plugin path instead of constructing a bespoke adapter.
 */
export function AomiBaseAccountProvider({
  children,
  appName,
  appLogoUrl,
  chains,
  includeBaseSepolia = false,
}: AomiBaseAccountProviderProps) {
  const preferredChains =
    chains ??
    (includeBaseSepolia ? ([base, baseSepolia] as const) : ([base] as const));

  return (
    <AomiWalletKitProvider
      preset="wallets-only"
      wallets={{
        evm: {
          chains: preferredChains,
          wallets: ["baseAccount"],
          coinbase: false,
          appName,
          appLogoUrl,
        },
        solana: false,
      }}
    >
      {children}
    </AomiWalletKitProvider>
  );
}

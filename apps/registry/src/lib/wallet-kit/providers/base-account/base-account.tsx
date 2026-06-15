"use client";

import type { ReactNode } from "react";
import type { Chain } from "viem";
import { base, baseSepolia } from "wagmi/chains";
import type { SponsorshipPaymasterServiceContext } from "@aomi-labs/react";
import { AomiWalletKitProvider } from "../../config/AomiWalletKitProvider";
import type { ExecutionConfig } from "../../config/types";

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

type EnabledBaseAccountSponsorshipOptions = Extract<
  BaseAccountSponsorshipOptions,
  { mode: "optional" | "required" }
>;

function isEnabledSponsorship(
  sponsorship: BaseAccountSponsorshipOptions | undefined,
): sponsorship is EnabledBaseAccountSponsorshipOptions {
  return sponsorship?.mode === "optional" || sponsorship?.mode === "required";
}

function toExecutionConfig(
  sponsorship: BaseAccountSponsorshipOptions | undefined,
): ExecutionConfig | undefined {
  if (!isEnabledSponsorship(sponsorship)) {
    return undefined;
  }

  return {
    aa: "optional",
    sponsorship: {
      mode: sponsorship.mode,
      paymasterServiceContext: sponsorship.paymasterServiceContext,
      paymasterServiceUrl: sponsorship.paymasterServiceUrl,
      sendCallsTimeoutMs: sponsorship.sendCallsTimeoutMs,
    },
  };
}

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
  sponsorship,
}: AomiBaseAccountProviderProps) {
  const preferredChains =
    chains ??
    (includeBaseSepolia ? ([base, baseSepolia] as const) : ([base] as const));

  return (
    <AomiWalletKitProvider
      preset="wallets-only"
      execution={toExecutionConfig(sponsorship)}
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

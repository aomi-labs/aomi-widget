"use client";

import { useMemo, type ReactNode } from "react";
import type { Chain, Transport } from "viem";
import type { Config } from "wagmi";
import type { WalletId } from "../../catalog/wallet-ids";
import { createAomiEvmConfig } from "../../catalog/evm-connector-catalog";
import { AomiEvmRuntimeProvider } from "../../runtime/evm/provider";

export type AomiParaEvmRuntimeConfig = {
  chains: readonly [Chain, ...Chain[]];
  transports?: Record<number, Transport>;
  ssr?: boolean;
  walletConnectProjectId?: string;
  appName?: string;
  appLogoUrl?: string | null;
  wallets?: readonly WalletId[];
};

function createPlainWagmiConfig(config: AomiParaEvmRuntimeConfig): Config {
  return createAomiEvmConfig({
    chains: config.chains,
    transports: config.transports,
    walletConnectProjectId: config.walletConnectProjectId,
    appName: config.appName,
    appLogoUrl: config.appLogoUrl,
    wallets: config.wallets,
    ssr: config.ssr ?? true,
  });
}

export function AomiParaEvmRuntimeProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: AomiParaEvmRuntimeConfig;
}) {
  const wagmiConfig = useMemo(() => createPlainWagmiConfig(config), [config]);

  return (
    <AomiEvmRuntimeProvider config={wagmiConfig}>
      {children}
    </AomiEvmRuntimeProvider>
  );
}

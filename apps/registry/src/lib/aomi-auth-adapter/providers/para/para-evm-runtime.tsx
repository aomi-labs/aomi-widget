"use client";

import { useMemo, type ReactNode } from "react";
import type { Chain, Transport } from "viem";
import { http } from "viem";
import { createConfig, type Config } from "wagmi";
import { injected } from "wagmi/connectors";
import { AomiEvmRuntimeProvider } from "../../runtime/evm/provider";

export type AomiParaEvmRuntimeConfig = {
  chains: readonly [Chain, ...Chain[]];
  transports?: Record<number, Transport>;
  ssr?: boolean;
};

function createPlainWagmiConfig(config: AomiParaEvmRuntimeConfig): Config {
  return createConfig({
    chains: config.chains,
    connectors: [
      injected({
        shimDisconnect: true,
      }),
    ],
    transports:
      config.transports ??
      Object.fromEntries(
        config.chains.map((chain) => [
          chain.id,
          http(chain.rpcUrls.default.http[0]),
        ]),
      ),
    multiInjectedProviderDiscovery: true,
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

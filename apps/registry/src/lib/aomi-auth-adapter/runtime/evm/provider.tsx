"use client";

import type { ReactNode } from "react";
import { WagmiProvider, type Config } from "wagmi";

export function AomiEvmRuntimeProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: Config;
}) {
  return (
    <WagmiProvider config={config} reconnectOnMount>
      {children}
    </WagmiProvider>
  );
}

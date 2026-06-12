"use client";

import { useMemo, type ReactNode } from "react";
import { useClient, type TExternalWallet } from "@getpara/react-sdk";
import {
  createParaWagmiConfig,
  type ParaEvmProviderConfig,
} from "@getpara/evm-wallet-connectors";
import type { Chain, Transport } from "viem";
import { AomiEvmRuntimeProvider } from "../../runtime/evm/provider";

export type AomiParaEvmRuntimeConfig = ParaEvmProviderConfig<
  readonly [Chain, ...Chain[]],
  Record<number, Transport>
> & {
  wallets: TExternalWallet[];
};

export function AomiParaEvmRuntimeProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: AomiParaEvmRuntimeConfig;
}) {
  const para = useClient();
  const paraReady = Boolean(para && (para as { isSetup?: boolean }).isSetup);

  const wagmiConfig = useMemo(() => {
    if (!para || !paraReady) return null;
    return createParaWagmiConfig(para, config);
  }, [config, para, paraReady]);

  if (!wagmiConfig) return null;

  return (
    <AomiEvmRuntimeProvider config={wagmiConfig}>
      {children}
    </AomiEvmRuntimeProvider>
  );
}

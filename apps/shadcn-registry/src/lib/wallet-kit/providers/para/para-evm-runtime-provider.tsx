"use client";

import { useMemo, type ReactNode } from "react";
import { paraConnector } from "@getpara/wagmi-v2-connector";
import type ParaWeb from "@getpara/react-sdk";
import {
  createAomiEvmConfig,
  type ResolvedEvmWalletsConfig,
} from "../../catalog/evm-connector-catalog";
import { AomiEvmRuntimeProvider } from "../../runtime/evm/provider";
import { useSafeParaClient } from "./para-auth";

export function createAomiParaEvmConfig(
  config: ResolvedEvmWalletsConfig,
  para: ParaWeb | null,
) {
  return createAomiEvmConfig({
    ...config,
    connectors: [
      ...(config.connectors ?? []),
      ...(para
        ? [
            paraConnector({
              para,
              chains: [...config.chains],
              disableModal: true,
              appName: config.appName ?? "Aomi",
              options: { shimDisconnect: true },
              transports: config.transports,
            }),
          ]
        : []),
    ],
  });
}

export function AomiParaEvmRuntimeProvider({
  children,
  config,
}: {
  children: ReactNode;
  config: ResolvedEvmWalletsConfig;
}) {
  const para = useSafeParaClient();
  const wagmiConfig = useMemo(
    () => createAomiParaEvmConfig(config, para),
    [config, para],
  );

  return (
    <AomiEvmRuntimeProvider config={wagmiConfig}>
      {children}
    </AomiEvmRuntimeProvider>
  );
}

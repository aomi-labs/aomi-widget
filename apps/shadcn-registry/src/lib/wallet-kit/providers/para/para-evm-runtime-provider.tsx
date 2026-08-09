"use client";

import { useMemo, type ReactNode } from "react";
import { paraConnector } from "@getpara/wagmi-v2-connector";
import type ParaWeb from "@getpara/react-sdk";
import type { Config } from "wagmi";
import {
  createAomiEvmConfig,
  type ResolvedEvmWalletsConfig,
} from "../../catalog/evm-connector-catalog";
import { AomiEvmRuntimeProvider } from "../../runtime/evm/provider";
import { useSafeParaClient } from "./para-auth";

export function createAomiParaEvmConfig(
  config: ResolvedEvmWalletsConfig,
  para: ParaWeb | null,
): Config {
  return createAomiEvmConfig({
    ...config,
    connectors: [
      ...(config.connectors ?? []),
      ...(para
        ? [
            paraConnector({
              // `@getpara/react-sdk`'s `ParaWeb` and the client type bundled in
              // `@getpara/wagmi-v2-connector` have drifted across versions, so
              // the `para` arg no longer structurally matches. `as never` is a
              // deliberate cross-package cast, not a masked local error.
              para: para as never,
              chains: [...config.chains],
              disableModal: true,
              appName: config.appName ?? "Aomi",
              options: { shimDisconnect: true },
              transports: config.transports,
            }),
          ]
        : []),
      // paraConnector()'s return type isn't assignable to wagmi's
      // `readonly CreateConnectorFn[]` under the current SDK versions.
    ] as ResolvedEvmWalletsConfig["connectors"],
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

"use client";

import type { Chain, Transport } from "viem";
import { http } from "viem";
import { createConfig, type Config, type CreateConnectorFn } from "wagmi";
import {
  baseAccount,
  coinbaseWallet,
  injected,
  walletConnect,
} from "wagmi/connectors";
import type { EvmWalletPreset, WalletId } from "./wallet-ids";
import { EVM_PRESETS } from "./wallet-ids";

export const AOMI_DEFAULT_WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_AOMI_WC_PROJECT_ID ??
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
  process.env.NEXT_PUBLIC_PROJECT_ID;

export type ResolvedEvmWalletsConfig = {
  chains: readonly [Chain, ...Chain[]];
  preset?: EvmWalletPreset;
  wallets?: readonly WalletId[];
  connectors?: readonly CreateConnectorFn[];
  walletConnectProjectId?: string;
  coinbase?: boolean;
  appName?: string;
  appLogoUrl?: string | null;
  transports?: Record<number, Transport>;
  ssr?: boolean;
  includeBaseAccount?: boolean;
};

function defaultHttpTransports(
  chains: readonly Chain[],
): Record<number, Transport> {
  return Object.fromEntries(
    chains.map((chain) => [chain.id, http(chain.rpcUrls.default.http[0])]),
  );
}

function connectorLooksLikeWalletConnect(
  connector: CreateConnectorFn,
): boolean {
  const meta = connector as unknown as {
    id?: string;
    name?: string;
    type?: string;
  };
  const text = [meta.id, meta.name, meta.type].filter(Boolean).join(" ");
  return /wallet\s*connect|walletconnect/i.test(text);
}

function warnDuplicateWalletConnect(): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    "[aomi-wallet-kit] wallets.evm.connectors included a WalletConnect-like connector. Aomi owns the WalletConnect connector; pass walletConnectProjectId instead.",
  );
}

export function createAomiEvmConfig(input: ResolvedEvmWalletsConfig): Config {
  const wanted = new Set(
    input.wallets ?? EVM_PRESETS[input.preset ?? "popular"],
  );
  const wcProjectId =
    input.walletConnectProjectId ?? AOMI_DEFAULT_WC_PROJECT_ID;
  const hostConnectors = (input.connectors ?? []).filter((connector) => {
    if (!connectorLooksLikeWalletConnect(connector)) return true;
    warnDuplicateWalletConnect();
    return false;
  });

  const connectors: CreateConnectorFn[] = [
    injected({ shimDisconnect: true }),
    ...(wanted.has("walletconnect") && wcProjectId
      ? [walletConnect({ projectId: wcProjectId, showQrModal: true })]
      : []),
    ...(input.coinbase !== false && wanted.has("coinbase")
      ? [
          coinbaseWallet({
            appName: input.appName ?? "Aomi",
            appLogoUrl: input.appLogoUrl ?? undefined,
          }),
        ]
      : []),
    ...(wanted.has("baseAccount") || input.includeBaseAccount
      ? [
          baseAccount({
            appName: input.appName ?? "Aomi",
            appLogoUrl: input.appLogoUrl ?? null,
            paymasterUrls: {},
          }),
        ]
      : []),
    ...hostConnectors,
  ];

  return createConfig({
    chains: input.chains,
    connectors,
    transports: input.transports ?? defaultHttpTransports(input.chains),
    multiInjectedProviderDiscovery: true,
    ssr: input.ssr ?? true,
  });
}

export { EVM_PRESETS };

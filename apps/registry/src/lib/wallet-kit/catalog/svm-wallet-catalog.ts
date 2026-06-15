"use client";

import {
  backpackWallet,
  glowWallet,
  phantomWallet,
  solflareWallet,
} from "@getpara/solana-wallet-connectors/connectors";
import type { SvmNetworkOption } from "../types";
import {
  normalizeSvmNetworkOptions,
  resolveSelectedSvmNetwork,
} from "../runtime/svm/networks";
import type { SvmWalletId, SvmWalletPreset } from "./wallet-ids";
import { SVM_PRESETS } from "./wallet-ids";

export type SvmWalletsConfig = {
  preset?: SvmWalletPreset;
  wallets?: readonly SvmWalletId[];
  networks?: readonly SvmNetworkOption[];
  preferDirectSend?: boolean;
  enabled?: boolean;
};

const SVM_WALLET_FACTORIES = {
  phantom: phantomWallet,
  solflare: solflareWallet,
  backpack: backpackWallet,
  glow: glowWallet,
} as const;

export const SVM_WALLET_ALLOWLIST = new Set<string>(SVM_PRESETS.popular);

type SolanaWalletList = Array<typeof phantomWallet>;

export function createAomiSvmWallets(
  input: Pick<SvmWalletsConfig, "preset" | "wallets"> = {},
): SolanaWalletList {
  const wanted = input.wallets ?? SVM_PRESETS[input.preset ?? "popular"];
  return wanted
    .map(
      (wallet) =>
        SVM_WALLET_FACTORIES[wallet as keyof typeof SVM_WALLET_FACTORIES],
    )
    .filter((wallet): wallet is SolanaWalletList[number] => Boolean(wallet));
}

export function resolveAomiSvmConfig(
  input: SvmWalletsConfig | false | undefined,
  selectedNetworkId?: string,
) {
  if (input === false) {
    return {
      enabled: false,
      networks: [],
      activeNetwork: undefined,
      cluster: undefined,
      rpcHttpUrl: undefined,
      rpcWsUrl: undefined,
      wallets: [] as SolanaWalletList,
      preferDirectSend: true,
    };
  }

  const networks = normalizeSvmNetworkOptions(input);
  const activeNetwork = resolveSelectedSvmNetwork(networks, selectedNetworkId);
  return {
    enabled: input?.enabled ?? true,
    networks,
    activeNetwork,
    cluster: activeNetwork.cluster,
    rpcHttpUrl: activeNetwork.rpcHttpUrl,
    rpcWsUrl: activeNetwork.rpcWsUrl,
    wallets: createAomiSvmWallets(input),
    preferDirectSend: input?.preferDirectSend ?? true,
  };
}

export { SVM_PRESETS };

"use client";

import { useRef, type ReactNode } from "react";
import { useClient as useParaClient } from "@getpara/react-sdk";
import {
  ParaSolanaProvider,
  phantomWallet,
  solflareWallet,
  backpackWallet,
  glowWallet,
  type ParaSolanaProviderConfig,
  type WalletList as SolanaWalletList,
} from "@getpara/solana-wallet-connectors";
import { Chain as SolanaMobileChain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import type { SvmCluster, SvmNetworkOption } from "../../types";
import {
  DEFAULT_SVM_CLUSTER,
  normalizeSvmNetworkOptions,
  resolveSelectedSvmNetwork,
} from "../../runtime/svm/networks";
import { walletDebug } from "../../wallet-debug";

export {
  connectPreferredSvmWallet,
  DEFAULT_SVM_ENDPOINT,
  detectSvmTransport,
  getSvmCapabilitySnapshot,
  useSafeSvmWallet,
  type SafeSvmWalletState,
  type SvmConnectAttempt,
} from "../../runtime/svm/wallet-runtime";
export { buildSvmTransactionMethods as buildParaSolanaMethods } from "../../runtime/svm/transactions";

export type ParaSvmOptions = {
  enabled?: boolean;
  networks?: readonly SvmNetworkOption[];
  cluster?: SvmCluster;
  rpcHttpUrl?: string;
  rpcWsUrl?: string;
  wallets?: SolanaWalletList;
  mobileChain?: SolanaMobileChain;
  preferDirectSend?: boolean;
};

export type ResolvedSvmConfig = {
  enabled: boolean;
  networks: readonly SvmNetworkOption[];
  activeNetwork: SvmNetworkOption;
  cluster: SvmCluster;
  rpcHttpUrl: string;
  rpcWsUrl?: string;
  wallets: SolanaWalletList;
  mobileChain: SolanaMobileChain;
  preferDirectSend: boolean;
};

export const DEFAULT_SVM_WALLETS: SolanaWalletList = [
  phantomWallet,
  solflareWallet,
  backpackWallet,
  glowWallet,
];

export function resolveParaSvmConfig(
  solana?: ParaSvmOptions,
  selectedNetworkId?: string,
): ResolvedSvmConfig {
  const networks = normalizeSvmNetworkOptions(solana);
  const activeNetwork = resolveSelectedSvmNetwork(networks, selectedNetworkId);
  const cluster = activeNetwork.cluster;
  return {
    enabled: solana?.enabled ?? true,
    networks,
    activeNetwork,
    cluster,
    rpcHttpUrl: activeNetwork.rpcHttpUrl,
    rpcWsUrl: activeNetwork.rpcWsUrl,
    wallets: solana?.wallets ?? DEFAULT_SVM_WALLETS,
    mobileChain: solana?.mobileChain ?? (cluster as SolanaMobileChain),
    preferDirectSend: solana?.preferDirectSend ?? true,
  };
}

export function ParaSvmWrapper({
  enabled,
  config,
  children,
}: {
  enabled: boolean;
  config: ParaSolanaProviderConfig;
  children: ReactNode;
}) {
  let para: unknown;
  try {
    para = useParaClient() ?? null;
  } catch {
    para = null;
  }
  // Hold on to the last non-null client: Para nulls it transiently during
  // logout/re-init, and switching to the providerless branch then would
  // unmount the adapter subtree and lose connection-recovery state.
  const lastParaRef = useRef(para);
  if (para) lastParaRef.current = para;
  const effectivePara = para ?? lastParaRef.current;
  const ready = enabled && Boolean(effectivePara);
  const lastReadyRef = useRef(ready);
  if (lastReadyRef.current !== ready) {
    lastReadyRef.current = ready;
    walletDebug("para:solana-wrapper", { ready });
  }
  if (!ready) {
    return <>{children}</>;
  }
  return (
    <ParaSolanaProvider
      config={config}
      internalConfig={{
        para: effectivePara as never,
        // External Solana wallets sign directly through wallet-adapter.
        // Keeping them connection-only avoids Para re-auth touching its
        // shared EVM wagmi config when Phantom/Solflare attach.
        walletsWithFullAuth: [],
        connectionOnly: true,
      }}
    >
      {children}
    </ParaSolanaProvider>
  );
}

export type ParaSolanaOptions = ParaSvmOptions;
export type ResolvedSolanaConfig = ResolvedSvmConfig;
export const DEFAULT_SOLANA_WALLETS = DEFAULT_SVM_WALLETS;
export const resolveParaSolanaConfig = resolveParaSvmConfig;
export const ParaSolanaWrapper = ParaSvmWrapper;

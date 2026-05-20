"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Chain } from "viem";
import type {
  AomiNetworkTarget,
  SolanaNetworkOption,
  WalletFamily,
} from "./types";
import { resolveSelectedSolanaNetwork } from "./solana-networks";

type NetworkPreferencesContextValue = {
  selectedFamily: WalletFamily;
  selectedEvmChainId?: number;
  selectedSolanaNetworkId?: string;
  supportedEvmChains: readonly Chain[];
  supportedSolanaNetworks: readonly SolanaNetworkOption[];
  selectedSolanaNetwork?: SolanaNetworkOption;
  setSelectedFamily: (family: WalletFamily) => void;
  setSelectedEvmChainId: (chainId: number | undefined) => void;
  setSelectedSolanaNetworkId: (networkId: string | undefined) => void;
  selectTarget: (target: AomiNetworkTarget) => void;
};

const NetworkPreferencesContext =
  createContext<NetworkPreferencesContextValue | null>(null);

function resolveInitialFamily(
  evmChains: readonly Chain[],
  solanaNetworks: readonly SolanaNetworkOption[],
): WalletFamily {
  if (evmChains.length > 0) {
    return "evm";
  }
  return solanaNetworks.length > 0 ? "solana" : "evm";
}

export function AomiWalletNetworkPreferencesProvider({
  children,
  evmChains,
  solanaNetworks,
}: {
  children: ReactNode;
  evmChains: readonly Chain[];
  solanaNetworks: readonly SolanaNetworkOption[];
}) {
  const [selectedFamily, setSelectedFamily] = useState<WalletFamily>(() =>
    resolveInitialFamily(evmChains, solanaNetworks),
  );
  const [selectedEvmChainId, setSelectedEvmChainId] = useState<number | undefined>(
    evmChains[0]?.id,
  );
  const [selectedSolanaNetworkId, setSelectedSolanaNetworkId] = useState<
    string | undefined
  >(() => resolveSelectedSolanaNetwork(solanaNetworks)?.id);

  useEffect(() => {
    if (!evmChains.length) {
      setSelectedEvmChainId(undefined);
      if (solanaNetworks.length) setSelectedFamily("solana");
      return;
    }
    setSelectedEvmChainId((current) =>
      evmChains.some((chain) => chain.id === current) ? current : evmChains[0]?.id,
    );
  }, [evmChains]);

  useEffect(() => {
    if (!solanaNetworks.length) {
      setSelectedSolanaNetworkId(undefined);
      if (evmChains.length) setSelectedFamily("evm");
      return;
    }
    setSelectedSolanaNetworkId((current) =>
      solanaNetworks.some((network) => network.id === current)
        ? current
        : resolveSelectedSolanaNetwork(solanaNetworks)?.id,
    );
  }, [evmChains.length, solanaNetworks]);

  const selectedSolanaNetwork = useMemo(
    () =>
      solanaNetworks.length
        ? resolveSelectedSolanaNetwork(solanaNetworks, selectedSolanaNetworkId)
        : undefined,
    [selectedSolanaNetworkId, solanaNetworks],
  );

  const value = useMemo<NetworkPreferencesContextValue>(
    () => ({
      selectedFamily,
      selectedEvmChainId,
      selectedSolanaNetworkId,
      supportedEvmChains: evmChains,
      supportedSolanaNetworks: solanaNetworks,
      selectedSolanaNetwork,
      setSelectedFamily,
      setSelectedEvmChainId,
      setSelectedSolanaNetworkId,
      selectTarget: (target: AomiNetworkTarget) => {
        if (target.family === "evm") {
          setSelectedFamily("evm");
          setSelectedEvmChainId(target.chainId);
          return;
        }
        setSelectedFamily("solana");
        setSelectedSolanaNetworkId(target.networkId);
      },
    }),
    [
      evmChains,
      selectedEvmChainId,
      selectedFamily,
      selectedSolanaNetwork,
      selectedSolanaNetworkId,
      solanaNetworks,
    ],
  );

  return (
    <NetworkPreferencesContext.Provider value={value}>
      {children}
    </NetworkPreferencesContext.Provider>
  );
}

export function useAomiWalletNetworkPreferences(): NetworkPreferencesContextValue {
  const context = useContext(NetworkPreferencesContext);
  if (!context) {
    throw new Error(
      "useAomiWalletNetworkPreferences must be used within AomiWalletNetworkPreferencesProvider",
    );
  }
  return context;
}

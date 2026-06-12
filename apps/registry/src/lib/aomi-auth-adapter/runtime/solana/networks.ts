"use client";

import type {
  SolanaCluster,
  SolanaNetworkConfigInput,
  SolanaNetworkOption,
} from "../../types";

export const DEFAULT_SOLANA_CLUSTER: SolanaCluster = "solana:mainnet";

export const DEFAULT_SOLANA_RPC_HTTP_URLS: Record<SolanaCluster, string> = {
  "solana:mainnet": "https://api.mainnet-beta.solana.com",
  "solana:devnet": "https://api.devnet.solana.com",
  "solana:testnet": "https://api.testnet.solana.com",
};

export function getDefaultSolanaNetworkLabel(cluster: SolanaCluster): string {
  switch (cluster) {
    case "solana:mainnet":
      return "Solana Mainnet";
    case "solana:testnet":
      return "Solana Testnet";
    case "solana:devnet":
    default:
      return "Solana Devnet";
  }
}

function buildLegacySolanaNetwork(
  config?: SolanaNetworkConfigInput,
): SolanaNetworkOption {
  const cluster = config?.cluster ?? DEFAULT_SOLANA_CLUSTER;
  return {
    id: cluster,
    label: getDefaultSolanaNetworkLabel(cluster),
    cluster,
    rpcHttpUrl:
      config?.rpcHttpUrl ?? DEFAULT_SOLANA_RPC_HTTP_URLS[cluster],
    rpcWsUrl: config?.rpcWsUrl,
    isDefault: true,
  };
}

export function normalizeSolanaNetworkOptions(
  config?: SolanaNetworkConfigInput,
): readonly SolanaNetworkOption[] {
  const rawNetworks = config?.networks;
  if (!rawNetworks || rawNetworks.length === 0) {
    return [buildLegacySolanaNetwork(config)];
  }

  return rawNetworks.map((network, index) => ({
    id: network.id,
    label: network.label || getDefaultSolanaNetworkLabel(network.cluster),
    cluster: network.cluster,
    rpcHttpUrl:
      network.rpcHttpUrl ?? DEFAULT_SOLANA_RPC_HTTP_URLS[network.cluster],
    rpcWsUrl: network.rpcWsUrl,
    isDefault:
      network.isDefault ?? (index === 0 && !rawNetworks.some((item) => item.isDefault)),
  }));
}

export function resolveSelectedSolanaNetwork(
  networks: readonly SolanaNetworkOption[],
  selectedNetworkId?: string,
): SolanaNetworkOption {
  return (
    networks.find((network) => network.id === selectedNetworkId) ??
    networks.find((network) => network.isDefault) ??
    networks[0]
  );
}

export function buildDefaultSolanaNetworkOptions(options?: {
  mainnetRpcHttpUrl?: string;
  mainnetRpcWsUrl?: string;
  devnetRpcHttpUrl?: string;
  devnetRpcWsUrl?: string;
  testnetRpcHttpUrl?: string;
  testnetRpcWsUrl?: string;
}): readonly SolanaNetworkOption[] {
  return [
    {
      id: "solana-mainnet",
      label: "Solana Mainnet",
      cluster: "solana:mainnet",
      rpcHttpUrl:
        options?.mainnetRpcHttpUrl ??
        DEFAULT_SOLANA_RPC_HTTP_URLS["solana:mainnet"],
      rpcWsUrl: options?.mainnetRpcWsUrl,
      isDefault: true,
    },
    {
      id: "solana-devnet",
      label: "Solana Devnet",
      cluster: "solana:devnet",
      rpcHttpUrl:
        options?.devnetRpcHttpUrl ?? DEFAULT_SOLANA_RPC_HTTP_URLS["solana:devnet"],
      rpcWsUrl: options?.devnetRpcWsUrl,
    },
    {
      id: "solana-testnet",
      label: "Solana Testnet",
      cluster: "solana:testnet",
      rpcHttpUrl:
        options?.testnetRpcHttpUrl ??
        DEFAULT_SOLANA_RPC_HTTP_URLS["solana:testnet"],
      rpcWsUrl: options?.testnetRpcWsUrl,
    },
  ];
}

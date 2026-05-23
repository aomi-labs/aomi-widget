import type { Chain } from "viem";
import { defineChain } from "viem";
import {
  mainnet,
  polygon,
  arbitrum,
  optimism,
  base,
  sepolia,
  foundry,
} from "viem/chains";

export const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://monadexplorer.com",
    },
  },
});

export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Monad",
    symbol: "MON",
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

export const SUPPORTED_CHAIN_IDS = [
  1, 137, 42161, 8453, 10, 11155111, 143, 10143, 31337,
] as const;

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
  42161: "Arbitrum One",
  8453: "Base",
  10: "Optimism",
  11155111: "Sepolia",
  143: "Monad",
  10143: "Monad Testnet",
  31337: "Anvil (local)",
};

/** Alchemy network slugs for proxy URL construction. */
export const ALCHEMY_CHAIN_SLUGS: Record<number, string> = {
  1: "eth-mainnet",
  137: "polygon-mainnet",
  42161: "arb-mainnet",
  8453: "base-mainnet",
  10: "opt-mainnet",
  11155111: "eth-sepolia",
};

export const CHAINS_BY_ID: Record<number, Chain> = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  10: optimism,
  8453: base,
  11155111: sepolia,
  143: monad,
  10143: monadTestnet,
  31337: foundry,
};

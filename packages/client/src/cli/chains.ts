export const SUPPORTED_CHAIN_IDS = [1, 137, 42161, 8453, 10, 11155111] as const;

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
  42161: "Arbitrum One",
  8453: "Base",
  10: "Optimism",
  11155111: "Sepolia",
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

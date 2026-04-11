export const SUPPORTED_CHAIN_IDS = [1, 137, 42161, 8453, 10, 11155111] as const;

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
  42161: "Arbitrum One",
  8453: "Base",
  10: "Optimism",
  11155111: "Sepolia",
};

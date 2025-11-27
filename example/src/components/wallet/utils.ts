/**
 * Format wallet address for display (0x1234...5678)
 */
export const formatAddress = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

/**
 * Get network name from chainId (for system messages - lowercase)
 */
export const getNetworkName = (chainId: number | string): string => {
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  switch (id) {
    case 1:
      return 'ethereum';
    case 137:
      return 'polygon';
    case 42161:
      return 'arbitrum';
    case 8453:
      return 'base';
    case 10:
      return 'optimism';
    case 11155111:
      return 'sepolia';
    case 1337:
    case 31337:
      return 'testnet';
    case 59140:
      return 'linea-sepolia';
    case 59144:
      return 'linea';
    default:
      return 'testnet';
  }
};

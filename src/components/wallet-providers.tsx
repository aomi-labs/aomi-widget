'use client'

import { useEffect, useRef } from 'react'
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { useRuntimeActions } from '@/components/assistant-ui/runtime'

// ============================================
// Re-exports from wallet libraries
// ============================================
export { mainnet, arbitrum, optimism, base, polygon } from '@reown/appkit/networks'

// ============================================
// Shared Utilities
// ============================================

/**
 * Format wallet address for display (0x1234...5678)
 */
export const formatAddress = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

/**
 * Get human-readable network name from chainId (for UI display - capitalized)
 */
export const getNetworkDisplayName = (chainId: number | string | undefined): string | null => {
  if (!chainId) return null;
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  switch (id) {
    case 1:
      return "Ethereum";
    case 137:
      return "Polygon";
    case 42161:
      return "Arbitrum";
    case 8453:
      return "Base";
    case 10:
      return "Optimism";
    case 11155111:
      return "Sepolia";
    case 1337:
    case 31337:
      return "Testnet";
    case 59140:
      return "Linea Sepolia";
    case 59144:
      return "Linea";
    default:
      return null;
  }
};

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

// ============================================
// WalletSystemMessenger Component
// ============================================

/**
 * Invisible component that sends system messages when wallet state changes
 * (connect, disconnect, network switch)
 */
export function WalletSystemMessenger() {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { sendSystemMessage } = useRuntimeActions();
  const lastWalletRef = useRef<{
    isConnected: boolean;
    address?: string;
    chainId?: number;
  }>({ isConnected: false });

  // Handle initial connect or address change
  useEffect(() => {
    const prev = lastWalletRef.current;
    const normalizedAddress = address?.toLowerCase();
    const numericChainId = typeof chainId === 'string' ? Number(chainId) : chainId;

    const shouldNotify =
      isConnected &&
      normalizedAddress &&
      numericChainId &&
      (!prev.isConnected || prev.address !== normalizedAddress);

    if (shouldNotify) {
      const networkName = getNetworkName(numericChainId as number);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${numericChainId}). Ready to help with transactions.`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId: numericChainId as number,
      };
    }
  }, [address, chainId, isConnected, sendSystemMessage]);

  // Handle disconnect
  useEffect(() => {
    const prev = lastWalletRef.current;
    if (!isConnected && prev.isConnected) {
      void sendSystemMessage('Wallet disconnected by user.');
      console.log('Wallet disconnected by user.');
      lastWalletRef.current = { isConnected: false };
    }
  }, [isConnected, sendSystemMessage]);

  // Handle network switch
  useEffect(() => {
    const prev = lastWalletRef.current;
    const normalizedAddress = address?.toLowerCase();
    const numericChainId = typeof chainId === 'string' ? Number(chainId) : chainId;

    if (
      isConnected &&
      normalizedAddress &&
      numericChainId &&
      prev.isConnected &&
      prev.address === normalizedAddress &&
      prev.chainId !== numericChainId
    ) {
      const networkName = getNetworkName(numericChainId);
      const message = `User switched wallet to ${networkName} network (Chain ID: ${numericChainId}).`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = {
        isConnected: true,
        address: normalizedAddress,
        chainId: numericChainId,
      };
    }
  }, [address, chainId, isConnected, sendSystemMessage]);

  return null;
}

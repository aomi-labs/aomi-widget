"use client";

import { useEffect, useRef } from "react";
import { useRuntimeActions } from "@/components/assistant-ui/runtime";
import { useNotification } from "@/lib/notification-context";

// ============================================
// Types
// ============================================

export type WalletButtonState = {
  address?: string;
  chainId?: number;
  isConnected: boolean;
  ensName?: string;
};

export type WalletFooterProps = {
  wallet: WalletButtonState;
  setWallet: (data: Partial<WalletButtonState>) => void;
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get network name from chainId
 */
export const getNetworkName = (chainId: number | string | undefined): string => {
  if (chainId === undefined) return "";
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  switch (id) {
    case 1:
      return "ethereum";
    case 137:
      return "polygon";
    case 42161:
      return "arbitrum";
    case 8453:
      return "base";
    case 10:
      return "optimism";
    case 11155111:
      return "sepolia";
    case 1337:
    case 31337:
      return "testnet";
    case 59140:
      return "linea-sepolia";
    case 59144:
      return "linea";
    default:
      return "testnet";
  }
};

/**
 * Format wallet address for display (0x1234...5678)
 */
export const formatAddress = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

// ============================================
// WalletSystemMessageEmitter
// ============================================

type WalletSystemMessageEmitterProps = {
  wallet: WalletButtonState;
};

/**
 * Internal component that watches wallet state and sends system messages
 * to the backend when wallet connects, disconnects, or switches networks.
 */
export function WalletSystemMessageEmitter({ wallet }: WalletSystemMessageEmitterProps) {
  const { sendSystemMessage } = useRuntimeActions();
  const { showNotification } = useNotification();
  const lastWalletRef = useRef<{
    isConnected: boolean;
    address?: string;
    chainId?: number;
  }>({ isConnected: false });

  useEffect(() => {
    const prev = lastWalletRef.current;
    const { address, chainId, isConnected } = wallet;
    const normalizedAddress = address?.toLowerCase();

    // Handle connect
    if (
      isConnected &&
      normalizedAddress &&
      chainId &&
      (!prev.isConnected || prev.address !== normalizedAddress)
    ) {
      const networkName = getNetworkName(chainId);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${chainId}). Ready to help with transactions.`;
      console.log(message);
      
      // Show notification
      showNotification({
        type: "success",
        iconType: "wallet",
        title: "Wallet Connected",
        message: `Connected to ${networkName} network (Chain ID: ${chainId})`,
      });
      
      // Still send to backend for state tracking
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
      return;
    }

    // Handle disconnect
    if (!isConnected && prev.isConnected) {
      const message = "Wallet disconnected by user.";
      console.log(message);
      
      // Show notification
      showNotification({
        type: "notice",
        iconType: "wallet",
        title: "Wallet Disconnected",
        message: "Wallet disconnected by user.",
      });
      
      // Still send to backend for state tracking
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: false };
      return;
    }

    // Handle network switch
    if (
      isConnected &&
      normalizedAddress &&
      chainId &&
      prev.isConnected &&
      prev.address === normalizedAddress &&
      prev.chainId !== chainId
    ) {
      const networkName = getNetworkName(chainId);
      const message = `User switched wallet to ${networkName} network (Chain ID: ${chainId}).`;
      console.log(message);
      
      // Show notification
      showNotification({
        type: "notice",
        iconType: "network",
        title: "Network Switched",
        message: `Switched to ${networkName} network (Chain ID: ${chainId})`,
      });
      
      // Still send to backend for state tracking
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
    }
  }, [wallet, sendSystemMessage, showNotification]);

  return null;
}

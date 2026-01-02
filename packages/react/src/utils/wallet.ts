"use client";

import { useEffect, useRef } from "react";

import { useRuntimeActions } from "../runtime/hooks";

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

export const formatAddress = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

type WalletSystemMessageEmitterProps = {
  wallet: WalletButtonState;
};

export function WalletSystemMessageEmitter({ wallet }: WalletSystemMessageEmitterProps) {
  const { sendSystemMessage } = useRuntimeActions();
  const lastWalletRef = useRef<{
    isConnected: boolean;
    address?: string;
    chainId?: number;
  }>({ isConnected: false });

  useEffect(() => {
    const prev = lastWalletRef.current;
    const { address, chainId, isConnected } = wallet;
    const normalizedAddress = address?.toLowerCase();

    if (
      isConnected &&
      normalizedAddress &&
      chainId &&
      (!prev.isConnected || prev.address !== normalizedAddress)
    ) {
      const networkName = getNetworkName(chainId);
      const message = `User connected wallet with address ${normalizedAddress} on ${networkName} network (Chain ID: ${chainId}). Ready to help with transactions.`;
      console.log(message);
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
      return;
    }

    if (!isConnected && prev.isConnected) {
      void sendSystemMessage("Wallet disconnected by user.");
      console.log("Wallet disconnected by user.");
      lastWalletRef.current = { isConnected: false };
      return;
    }

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
      void sendSystemMessage(message);
      lastWalletRef.current = { isConnected: true, address: normalizedAddress, chainId };
    }
  }, [wallet, sendSystemMessage]);

  return null;
}

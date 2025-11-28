"use client";

import { useEffect, useRef } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useEnsName } from "wagmi";
import { useRuntimeActions, useWalletButtonState } from "@aomi-labs/widget-lib";
import { getNetworkName } from "./wallet-footer";

/**
 * Invisible component that sends system messages when wallet state changes
 * (connect, disconnect, network switch)
 */
export function WalletSystemMessenger() {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { data: ensName } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: 1,
    query: { enabled: Boolean(address) },
  });
  const { sendSystemMessage } = useRuntimeActions();
  const { setWallet } = useWalletButtonState();
  const lastWalletRef = useRef<{
    isConnected: boolean;
    address?: string;
    chainId?: number;
  }>({ isConnected: false });

  // Handle initial connect or address change
  useEffect(() => {
    const prev = lastWalletRef.current;
    const normalizedAddress = address?.toLowerCase();
    const numericChainId = typeof chainId === "string" ? Number(chainId) : chainId;

    setWallet({ isConnected, address, chainId: numericChainId, ensName: ensName ?? undefined });

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
  }, [address, chainId, isConnected, sendSystemMessage, setWallet, ensName]);

  // Handle disconnect
  useEffect(() => {
    const prev = lastWalletRef.current;

    setWallet({ isConnected, address: undefined, chainId: undefined, ensName: undefined });

    if (!isConnected && prev.isConnected) {
      void sendSystemMessage("Wallet disconnected by user.");
      console.log("Wallet disconnected by user.");
      lastWalletRef.current = { isConnected: false };
    }
  }, [isConnected, sendSystemMessage, setWallet]);

  // Update ENS name once it resolves without resending system messages
  useEffect(() => {
    if (!address) return;
    setWallet({ ensName: ensName ?? undefined });
  }, [address, ensName, setWallet]);

  // Handle network switch
  useEffect(() => {
    const prev = lastWalletRef.current;
    const normalizedAddress = address?.toLowerCase();
    const numericChainId = typeof chainId === "string" ? Number(chainId) : chainId;

    setWallet({ isConnected, address, chainId: numericChainId, ensName: ensName ?? undefined });

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
  }, [address, chainId, isConnected, sendSystemMessage, setWallet, ensName]);

  return null;
}

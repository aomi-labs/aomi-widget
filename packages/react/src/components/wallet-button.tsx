"use client";

import type { FC } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { formatAddress } from "../runtime/utils";
import { useUser } from "../contexts/user-context";
import { useEffect } from "react";

// =============================================================================
// Types
// =============================================================================

export type WalletButtonProps = {
  className?: string;
  /** Text to show when disconnected */
  connectLabel?: string;
  /** Called when connection state changes */
  onConnectionChange?: (connected: boolean) => void;
};

// =============================================================================
// Component
// =============================================================================

export const WalletButton: FC<WalletButtonProps> = ({
  className,
  connectLabel = "Connect Wallet",
  onConnectionChange,
}) => {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { setUser } = useUser();

  // Sync wallet state to UserContext
  useEffect(() => {
    setUser({
      address: address ?? undefined,
      chainId: chainId ?? undefined,
      isConnected,
    });
    onConnectionChange?.(isConnected);
  }, [address, chainId, isConnected, setUser, onConnectionChange]);

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      // Use the first available connector
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      aria-label={isConnected ? "Disconnect wallet" : "Connect wallet"}
    >
      {isConnected && address ? formatAddress(address) : connectLabel}
    </button>
  );
};

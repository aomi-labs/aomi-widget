"use client";

import { useEffect, type FC } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { cn, formatAddress, getNetworkName, useUser } from "@aomi-labs/react";

export type WalletConnectProps = {
  className?: string;
  connectLabel?: string;
  onConnectionChange?: (connected: boolean) => void;
};

export const WalletConnect: FC<WalletConnectProps> = ({
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
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    }
  };

  const networkName = getNetworkName(chainId);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium",
        "rounded-full px-5 py-2.5",
        "bg-neutral-900 text-white",
        "hover:bg-neutral-800",
        "dark:bg-neutral-900 dark:text-white",
        "dark:hover:bg-neutral-800",
        "transition-colors",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      aria-label={isConnected ? "Disconnect wallet" : "Connect wallet"}
    >
      <span>
        {isConnected && address ? formatAddress(address) : connectLabel}
      </span>
      {isConnected && networkName && (
        <>
          <span className="opacity-50">•</span>
          <span className="opacity-50">{networkName}</span>
        </>
      )}
    </button>
  );
};

"use client";

import { useEffect, type FC } from "react";
import { cn, formatAddress, getChainInfo } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { formatWalletProvider } from "../../lib/aomi-auth-adapter";

export type ConnectButtonProps = {
  className?: string;
  connectLabel?: string;
  onConnectionChange?: (connected: boolean) => void;
};

export const ConnectButton: FC<ConnectButtonProps> = ({
  className,
  connectLabel = "Connect Account",
  onConnectionChange,
}) => {
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;

  useEffect(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);

  const handleClick = () => {
    if (identity.isConnected && adapter.canOpenAccountUI && adapter.openAccountUI) {
      void adapter.openAccountUI();
      return;
    }
    if (identity.isConnected && adapter.canDisconnect && adapter.disconnect) {
      void adapter.disconnect();
      return;
    }
    if (adapter.canConnect) {
      void adapter.connect();
    }
  };

  const ticker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;
  const walletProviderLabel = formatWalletProvider(identity.walletProvider);
  const visibleAddress = identity.address ?? identity.svmAddress;
  const connectedPrimary =
    formatAddress(visibleAddress) ??
    walletProviderLabel ??
    (identity.isConnected ? "Connected" : connectLabel);
  const primaryLabel =
    identity.status === "disconnected" ? connectLabel : connectedPrimary;
  const secondaryLabel = identity.isConnected
    ? (walletProviderLabel ?? ticker)
    : undefined;
  const ariaLabel = identity.isConnected
    ? adapter.canOpenAccountUI
      ? "Manage account"
      : adapter.canDisconnect
        ? "Disconnect account"
        : "Connected account"
    : "Connect account";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium",
        "rounded-3xl px-5 py-2.5",
        "bg-primary text-primary-foreground",
        "hover:bg-primary/90",
        "transition-colors",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      aria-label={ariaLabel}
      disabled={
        !adapter.canOpenAccountUI &&
        !adapter.canDisconnect &&
        !adapter.canConnect
      }
    >
      <span className="max-w-[180px] truncate">{primaryLabel}</span>
      {identity.isConnected && secondaryLabel && (
        <span className="opacity-50">{secondaryLabel}</span>
      )}
    </button>
  );
};

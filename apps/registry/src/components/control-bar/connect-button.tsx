"use client";

import { useEffect, type FC } from "react";
import { cn, getChainInfo } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { useAomiAuthIdentity } from "../../lib/auth-identity";

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
  const identity = useAomiAuthIdentity();
  const isBooting = identity.status === "booting" || !adapter.isReady;
  const isConnected = identity.status === "connected";

  useEffect(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);

  const handleClick = () => {
    const action =
      identity.status === "connected" ? adapter.disconnect : adapter.connect;

    void action().catch((error) => {
      console.error("[ConnectButton] Wallet action failed:", error);
    });
  };

  const ticker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;
  const secondaryLabel = isConnected
    ? (identity.secondaryLabel ?? ticker)
    : undefined;
  const primaryLabel = isBooting
    ? "Loading Wallet..."
    : isConnected
      ? identity.primaryLabel
      : connectLabel;
  const ariaLabel = isBooting
    ? "Wallet loading"
    : isConnected
      ? "Wallet connected"
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
        isBooting
        || (identity.status === "disconnected" && !adapter.canConnect)
      }
    >
      <span className="max-w-[180px] truncate">{primaryLabel}</span>
      {isConnected && secondaryLabel && (
        <span className="opacity-50">{secondaryLabel}</span>
      )}
    </button>
  );
};

"use client";

import { useEffect, type FC } from "react";
import { cn, getChainInfo, useUser } from "@aomi-labs/react";
import { useWalletAdapter } from "../../lib/aomi-wallet-adapter";
import { useAccountIdentity } from "../../lib/account-identity";

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
  const adapter = useWalletAdapter();
  const { setUser } = useUser();
  const identity = useAccountIdentity();

  useEffect(() => {
    setUser({
      address: identity.address ?? undefined,
      chainId: identity.chainId ?? undefined,
      isConnected: identity.isConnected,
    });
    onConnectionChange?.(identity.isConnected);
  }, [
    identity.address,
    identity.chainId,
    identity.isConnected,
    setUser,
    onConnectionChange,
  ]);

  const handleClick = () => {
    const action = identity.isConnected ? adapter.manageAccount : adapter.connect;
    void action().catch((error) => {
      console.error("[ConnectButton] Wallet action failed:", error);
    });
  };

  const ticker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;
  const secondaryLabel =
    identity.kind === "social" ? identity.secondaryLabel : ticker;
  const primaryLabel =
    identity.kind === "disconnected" ? connectLabel : identity.primaryLabel;
  const ariaLabel = identity.isConnected ? "Manage account" : "Connect account";

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
        identity.isConnected ? !adapter.canManageAccount : !adapter.canConnect
      }
    >
      <span className="max-w-[180px] truncate">{primaryLabel}</span>
      {identity.isConnected && secondaryLabel && (
        <span className="opacity-50">{secondaryLabel}</span>
      )}
    </button>
  );
};

/** @deprecated Use {@link ConnectButton} */
export const WalletConnect = ConnectButton;
/** @deprecated Use {@link ConnectButtonProps} */
export type WalletConnectProps = ConnectButtonProps;

"use client";

import { useEffect, type FC } from "react";
import { useModal } from "@getpara/react-sdk";
import { cn, getChainInfo, useUser } from "@aomi-labs/react";
import { useAccountIdentity } from "../../lib/use-account-identity";

export type WalletConnectProps = {
  className?: string;
  connectLabel?: string;
  onConnectionChange?: (connected: boolean) => void;
};

export const WalletConnect: FC<WalletConnectProps> = ({
  className,
  connectLabel = "Connect Account",
  onConnectionChange,
}) => {
  const { openModal } = useModal();
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
    if (identity.isConnected) {
      openModal({ step: "ACCOUNT_MAIN" });
      return;
    }

    openModal({ step: "AUTH_MAIN" });
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
    >
      <span className="max-w-[180px] truncate">{primaryLabel}</span>
      {identity.isConnected && secondaryLabel && (
        <span className="opacity-50">{secondaryLabel}</span>
      )}
    </button>
  );
};

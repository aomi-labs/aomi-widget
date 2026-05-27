"use client";

import { useEffect, type FC } from "react";
import { WalletIcon } from "lucide-react";
import { cn, formatAddress, getChainInfo } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { formatWalletProvider } from "../../lib/aomi-auth-adapter";
import {
  normalizeWalletProviderId,
  useWalletPicker,
} from "./wallet-picker-context";

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
  const {
    isAvailable: hasWalletPicker,
    openPicker,
    providers,
  } = useWalletPicker();

  useEffect(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);

  const handleClick = () => {
    if (hasWalletPicker) {
      openPicker();
      return;
    }
    if (
      identity.isConnected &&
      adapter.canOpenAccountUI &&
      adapter.openAccountUI
    ) {
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
  const disabled =
    !hasWalletPicker &&
    !adapter.canOpenAccountUI &&
    !adapter.canDisconnect &&
    !adapter.canConnect;

  if (!identity.isConnected) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Connect account"
        disabled={disabled}
        className={cn(
          "inline-flex w-full items-center justify-center whitespace-nowrap rounded-3xl px-6 py-2 text-sm font-medium",
          "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          className,
        )}
      >
        {connectLabel}
      </button>
    );
  }

  const activeProviderId = normalizeWalletProviderId(identity.walletProvider);
  const activeProvider = activeProviderId
    ? providers.find((p) => p.id === activeProviderId)
    : undefined;
  const ActiveIcon = activeProvider?.icon ?? WalletIcon;

  const visibleAddress = identity.address ?? identity.svmAddress;
  const formattedAddress = formatAddress(visibleAddress);
  const chainTicker = identity.chainId
    ? getChainInfo(identity.chainId)?.ticker
    : undefined;
  const walletProviderLabel = formatWalletProvider(identity.walletProvider);
  const secondaryLabel = walletProviderLabel ?? chainTicker;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Manage account"
      disabled={disabled}
      className={cn(
        "inline-flex w-full items-center justify-start gap-2 whitespace-nowrap",
        "border-border/70 bg-card rounded-3xl border py-2 pl-1.5 pr-4",
        "text-card-foreground text-sm font-medium transition-colors",
        "hover:bg-accent/40",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      <span className="bg-primary/10 text-primary flex size-7 shrink-0 items-center justify-center rounded-full">
        <ActiveIcon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-left">
        {formattedAddress ?? "Connected"}
      </span>
      {secondaryLabel && (
        <span className="text-muted-foreground/80 shrink-0 text-xs">
          {secondaryLabel}
        </span>
      )}
    </button>
  );
};

"use client";

import { type FC } from "react";
import { cn, getChainInfo } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { formatAddress } from "../../lib/aomi-auth-adapter/identity";
import { Skeleton } from "../ui/skeleton";

export type WalletFamilySlotProps = {
  family: "evm" | "solana";
  className?: string;
};

function solanaClusterLabel(cluster?: string): string | undefined {
  if (!cluster) return undefined;
  if (cluster === "solana:mainnet") return "Mainnet";
  if (cluster === "solana:devnet") return "Devnet";
  if (cluster === "solana:testnet") return "Testnet";
  return cluster.replace("solana:", "");
}

export const WalletFamilySlot: FC<WalletFamilySlotProps> = ({ family, className }) => {
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;

  if (identity.status === "booting") {
    return <Skeleton className="h-10 w-full rounded-3xl" />;
  }

  const connected =
    family === "evm" ? !!identity.address : !!identity.svmAddress;

  const addressLabel =
    family === "evm"
      ? formatAddress(identity.address)
      : formatAddress(identity.svmAddress);

  const networkLabel =
    family === "evm"
      ? (identity.chainId ? (getChainInfo(identity.chainId)?.ticker ?? undefined) : undefined)
      : solanaClusterLabel(identity.solanaCluster);

  const connectLabel = family === "evm" ? "Connect EVM" : "Connect Solana";
  const primaryLabel = connected ? addressLabel : connectLabel;

  const handleClick = () => {
    // Connect path comes first: a slot for a family that isn't connected
    // yet should always offer "Connect <family>", even if the OTHER
    // family is already connected (otherwise `canOpenAccountUI` would
    // intercept and re-open the existing connection's account UI).
    if (!connected && adapter.canConnect) {
      void adapter.connect({ family });
      return;
    }
    // Connected slots offer the Para account modal if available
    // (which itself surfaces Disconnect / Switch options). Falling back
    // to a direct adapter.disconnect() keeps the slot useful for adapter
    // implementations that don't expose an account modal.
    if (connected && adapter.canOpenAccountUI && adapter.openAccountUI) {
      void adapter.openAccountUI({ family });
      return;
    }
    if (connected && adapter.canDisconnect && adapter.disconnect) {
      void adapter.disconnect({ family });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium",
        "rounded-3xl px-5 py-2.5 transition-all duration-200 w-full",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        connected
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-muted text-muted-foreground border border-dashed border-border hover:bg-muted/80",
        className,
      )}
      disabled={!adapter.canOpenAccountUI && !adapter.canDisconnect && !adapter.canConnect}
    >
      <span className="max-w-[180px] truncate">{primaryLabel}</span>
      {connected && networkLabel && (
        <span className="opacity-50">{networkLabel}</span>
      )}
    </button>
  );
};

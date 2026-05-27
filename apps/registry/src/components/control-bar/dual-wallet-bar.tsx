"use client";

import { useEffect, useMemo, useState, type FC } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { useAomiWalletNetworkPreferences } from "../../lib/aomi-auth-adapter/network-preferences";
import { formatAddress } from "../../lib/aomi-auth-adapter/identity";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { WalletFamilySlot } from "./wallet-family-slot";

export type DualWalletBarProps = {
  families: Array<"evm" | "solana">;
  className?: string;
  onConnectionChange?: (connected: boolean) => void;
};

function solanaClusterLabel(cluster?: string): string | undefined {
  if (!cluster) return undefined;
  if (cluster === "solana:mainnet") return "Mainnet";
  if (cluster === "solana:devnet") return "Devnet";
  if (cluster === "solana:testnet") return "Testnet";
  return cluster.replace("solana:", "");
}

function familyLabel(family: "evm" | "solana"): string {
  return family === "solana" ? "Solana" : "EVM";
}

export const DualWalletBar: FC<DualWalletBarProps> = ({
  families,
  className,
  onConnectionChange,
}) => {
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const { selectedFamily } = useAomiWalletNetworkPreferences();
  const [open, setOpen] = useState(false);

  // The collapsed button follows the network-select's family preference so
  // the wallet shown always matches the currently active chain family.
  const activeFamily: "evm" | "solana" = useMemo(() => {
    const preferred = adapter.activeFamily ?? selectedFamily;
    if (preferred && families.includes(preferred)) return preferred;
    return families[0] ?? "evm";
  }, [adapter.activeFamily, families, selectedFamily]);

  const connected =
    activeFamily === "evm" ? !!identity.address : !!identity.svmAddress;

  const addressLabel =
    activeFamily === "evm"
      ? formatAddress(identity.address)
      : formatAddress(identity.svmAddress);

  const networkLabel =
    activeFamily === "evm"
      ? identity.chainId
        ? (getChainInfo(identity.chainId)?.ticker ?? undefined)
        : undefined
      : solanaClusterLabel(identity.solanaCluster);

  const primaryLabel = connected
    ? addressLabel
    : `Connect ${familyLabel(activeFamily)}`;

  useEffect(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-between gap-2 whitespace-nowrap text-sm font-medium",
            "rounded-3xl px-5 py-2.5 transition-all duration-200 w-full",
            "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            connected
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground border border-dashed border-border hover:bg-muted/80",
            className,
          )}
          aria-label="Manage wallets"
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="max-w-[180px] truncate">{primaryLabel}</span>
            {connected && networkLabel && (
              <span className="opacity-50">{networkLabel}</span>
            )}
          </span>
          <ChevronDownIcon className="h-3 w-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[280px] rounded-xl p-2"
      >
        <div className="mb-2 px-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Wallets
        </div>
        <div className="flex flex-col gap-2">
          {families.map((family) => (
            <WalletFamilySlot key={family} family={family} />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

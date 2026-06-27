"use client";

import { useEffect, type FC } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { formatAddress } from "../../lib/aomi-auth-adapter/identity";
import { WalletPicker } from "./wallet-picker";
import { WalletPickerProvider, useWalletPicker } from "./wallet-picker-context";

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

const DualWalletBarInner: FC<DualWalletBarProps> = ({
  families,
  className,
  onConnectionChange,
}) => {
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const { openPicker } = useWalletPicker();

  const connected = Boolean(identity.address || identity.svmAddress);

  useEffect(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "inline-flex items-center justify-between gap-2 whitespace-nowrap text-sm font-medium",
          "w-full rounded-3xl px-5 py-2.5 transition-all duration-200",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          connected
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground border-border hover:bg-muted/80 border border-dashed",
          className,
        )}
        aria-label="Manage wallets"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {families.map((family) => {
            const address =
              family === "evm" ? identity.address : identity.svmAddress;
            const network =
              family === "evm"
                ? identity.chainId
                  ? getChainInfo(identity.chainId)?.ticker
                  : undefined
                : solanaClusterLabel(identity.solanaCluster);
            return (
              <span
                key={family}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px]",
                  address ? "bg-background/20" : "bg-background/10 opacity-70",
                )}
              >
                {family === "evm" ? "EVM" : "SOL"}{" "}
                {address ? formatAddress(address) : "Connect"}
                {address && network ? ` ${network}` : ""}
              </span>
            );
          })}
        </span>
        <ChevronDownIcon className="h-3 w-3 shrink-0 opacity-60" />
      </button>
      <WalletPicker />
    </>
  );
};

export const DualWalletBar: FC<DualWalletBarProps> = (props) => {
  return (
    <WalletPickerProvider>
      <DualWalletBarInner {...props} />
    </WalletPickerProvider>
  );
};

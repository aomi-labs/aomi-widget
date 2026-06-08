"use client";

import { useEffect, type FC } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@aomi-labs/react";
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

function connectedWalletLabel({
  walletName,
  address,
  network,
}: {
  walletName?: string;
  address?: string;
  network?: string;
}): string | undefined {
  if (!address) return undefined;
  return [walletName, formatAddress(address), network]
    .filter(Boolean)
    .join(" ");
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
  const activeEvmAccount = adapter.accounts.find(
    (account) => account.family === "evm" && account.active,
  );
  const activeSolanaAccount = adapter.accounts.find(
    (account) => account.family === "solana" && account.active,
  );
  const labels = families
    .map((family) =>
      family === "evm"
        ? connectedWalletLabel({
            walletName: activeEvmAccount?.walletName,
            address: identity.address,
          })
        : connectedWalletLabel({
            walletName:
              activeSolanaAccount?.walletName ?? identity.solanaWalletName,
            address: identity.svmAddress,
            network: solanaClusterLabel(identity.solanaCluster),
          }),
    )
    .filter((label): label is string => Boolean(label));

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
        <span className="min-w-0 truncate">
          {labels.length ? labels.join(" / ") : "Connect wallet"}
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

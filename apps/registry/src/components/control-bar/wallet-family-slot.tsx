"use client";

import { useState, type FC } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import { useAomiAuthAdapter } from "../../lib/aomi-auth-adapter";
import { formatAddress } from "../../lib/aomi-auth-adapter/identity";
import type { SolanaWalletDescriptor } from "../../lib/aomi-auth-adapter/types";
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

function sortSolanaWallets(
  wallets: readonly SolanaWalletDescriptor[],
): readonly SolanaWalletDescriptor[] {
  return [...wallets].sort((a, b) => {
    if (a.installed !== b.installed) return a.installed ? -1 : 1;
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

const SolanaWalletPicker: FC<{
  wallets: readonly SolanaWalletDescriptor[];
  onConnect: (name: string) => void;
  pendingName?: string;
}> = ({ wallets, onConnect, pendingName }) => {
  if (wallets.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground">
        No Solana wallets detected. Install Phantom or Solflare to continue.
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      {wallets.map((wallet) => {
        const isPending = pendingName === wallet.name;
        return (
          <button
            key={wallet.name}
            type="button"
            onClick={() => onConnect(wallet.name)}
            disabled={isPending}
            className={cn(
              "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-wait disabled:opacity-60",
            )}
          >
            <span className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-medium uppercase">
                {wallet.name.slice(0, 2)}
              </span>
              <span className="truncate">{wallet.name}</span>
            </span>
            <span className="text-muted-foreground text-[10px] uppercase tracking-wide">
              {isPending
                ? "Connecting…"
                : wallet.installed
                  ? "Detected"
                  : wallet.ready
                    ? "Install"
                    : "Unavailable"}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export const WalletFamilySlot: FC<WalletFamilySlotProps> = ({
  family,
  className,
}) => {
  const adapter = useAomiAuthAdapter();
  const identity = adapter.identity;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<string | undefined>();

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
      ? identity.chainId
        ? (getChainInfo(identity.chainId)?.ticker ?? undefined)
        : undefined
      : solanaClusterLabel(identity.solanaCluster);

  // Action handlers — connect/disconnect are independent per family.
  // EVM connect goes through the adapter's `connect({family:"evm"})`
  // which opens whatever the provider's modal is (Para AUTH modal,
  // Privy login, etc.). Solana connect uses the inline picker so the
  // user explicitly chooses Phantom/Solflare/etc instead of auto-pick.
  const handleConnectEvm = () => {
    void adapter.connect({ family: "evm" });
  };

  const handleConnectSolanaWallet = async (walletName: string) => {
    if (!adapter.connectSolanaWallet) {
      // Fall back to whatever the adapter's default connect path is
      // (e.g. Privy's login modal which then provisions Solana).
      void adapter.connect({ family: "solana" });
      return;
    }
    setPendingWallet(walletName);
    try {
      await adapter.connectSolanaWallet(walletName);
    } catch (error) {
      console.warn("[wallet-family-slot] Solana connect failed", error);
    } finally {
      setPendingWallet(undefined);
    }
  };

  const handleDisconnect = () => {
    if (adapter.canOpenAccountUI && adapter.openAccountUI) {
      void adapter.openAccountUI({ family });
      return;
    }
    if (adapter.canDisconnect && adapter.disconnect) {
      void adapter.disconnect({ family });
    }
  };

  // Disconnected EVM: simple button. Connect modal handled by adapter.
  if (!connected && family === "evm") {
    return (
      <button
        type="button"
        onClick={handleConnectEvm}
        disabled={!adapter.canConnect}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-3xl px-5 py-2.5 text-sm font-medium",
          "border border-dashed border-border bg-muted text-muted-foreground hover:bg-muted/80",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        Connect EVM
      </button>
    );
  }

  // Disconnected Solana: collapsed pill that expands into an inline
  // wallet picker. We don't rely on identity-level `canConnect` here
  // since the user is choosing a wallet directly through
  // `connectSolanaWallet`, which is the actual operation gate.
  if (!connected && family === "solana") {
    const wallets = sortSolanaWallets(adapter.solanaWallets ?? []);
    return (
      <div className={cn("flex w-full flex-col gap-2", className)}>
        <button
          type="button"
          onClick={() => setPickerOpen((prev) => !prev)}
          className={cn(
            "inline-flex w-full items-center justify-between gap-2 whitespace-nowrap rounded-3xl px-5 py-2.5 text-sm font-medium",
            "border border-dashed border-border bg-muted text-muted-foreground hover:bg-muted/80",
            "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          )}
          aria-expanded={pickerOpen}
        >
          <span>Connect Solana</span>
          {pickerOpen ? (
            <ChevronUpIcon className="h-3 w-3 opacity-60" />
          ) : (
            <ChevronDownIcon className="h-3 w-3 opacity-60" />
          )}
        </button>
        {pickerOpen && (
          <SolanaWalletPicker
            wallets={wallets}
            onConnect={handleConnectSolanaWallet}
            pendingName={pendingWallet}
          />
        )}
      </div>
    );
  }

  // Connected — show address + family-specific disconnect.
  return (
    <button
      type="button"
      onClick={handleDisconnect}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-3xl px-5 py-2.5 text-sm font-medium",
        "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
        "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        className,
      )}
    >
      <span className="max-w-[180px] truncate">{addressLabel}</span>
      {networkLabel && <span className="opacity-50">{networkLabel}</span>}
    </button>
  );
};

"use client";

import { Fragment, useEffect, type FC } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn, getChainInfo } from "@aomi-labs/react";
import { useAomiWalletKit, formatWalletAddress } from "../../lib/wallet-kit";
import { WalletIconSlot } from "./wallet-icon-slot";
import { WalletPicker } from "./wallet-picker";
import { WalletPickerProvider, useWalletPicker } from "./wallet-picker-context";

export type DualWalletBarProps = {
  families: Array<"evm" | "solana">;
  className?: string;
  onConnectionChange?: (connected: boolean) => void;
};

type ConnectedWallet = {
  family: "evm" | "solana";
  walletName?: string;
  address: string;
  detail?: string;
};

const AVATAR_SIZE = 28;

/** Longer middle-truncated address, revealed when the bar has room to grow. */
function longAddress(address: string): string {
  if (address.length <= 20) return address;
  return `${address.slice(0, 12)}..${address.slice(-8)}`;
}

function solanaClusterLabel(cluster?: string): string | undefined {
  if (!cluster) return undefined;
  const name = cluster.replace("solana:", "");
  if (!name) return undefined;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const DualWalletBarInner: FC<DualWalletBarProps> = ({
  families,
  className,
  onConnectionChange,
}) => {
  const adapter = useAomiWalletKit();
  const identity = adapter.identity;
  const { openPicker } = useWalletPicker();

  const connected = Boolean(identity.address || identity.svmAddress);
  const activeEvmAccount = adapter.accounts.find(
    (account) => account.family === "evm" && account.active,
  );
  const activeSolanaAccount = adapter.accounts.find(
    (account) => account.family === "svm" && account.active,
  );
  const connectedWallets = families
    .map((family): ConnectedWallet | null =>
      family === "evm"
        ? identity.address
          ? {
              family,
              walletName: activeEvmAccount?.walletName,
              address: identity.address,
              detail: getChainInfo(activeEvmAccount?.chainId ?? identity.chainId)
                ?.name,
            }
          : null
        : identity.svmAddress
          ? {
              family,
              walletName:
                activeSolanaAccount?.walletName ??
                identity.svmWalletName,
              address: identity.svmAddress,
              detail: solanaClusterLabel(identity.svmCluster),
            }
          : null,
    )
    .filter((wallet): wallet is ConnectedWallet => wallet !== null);
  const singleWallet = connectedWallets.length === 1;

  useEffect(() => {
    onConnectionChange?.(identity.isConnected);
  }, [identity.isConnected, onConnectionChange]);

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          "@container inline-flex items-center justify-between gap-2 whitespace-nowrap text-sm font-medium",
          "w-full rounded-3xl px-3.5 py-2 transition-all duration-200",
          "border-border bg-muted text-foreground hover:bg-muted/70 border",
          "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          className,
        )}
        aria-label="Manage wallets"
      >
        {connected && connectedWallets.length ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex shrink-0 items-center">
              {connectedWallets.map((wallet, index) => (
                <WalletIconSlot
                  key={wallet.family}
                  label={
                    wallet.walletName ??
                    (wallet.family === "solana" ? "Solana" : "Ethereum")
                  }
                  size={AVATAR_SIZE}
                  className={cn(
                    "ring-border bg-muted rounded-full ring-1",
                    index > 0 && "-ml-2",
                  )}
                />
              ))}
            </span>
            <span className="min-w-0 truncate">
              {connectedWallets.map((wallet, index) => (
                <Fragment key={wallet.family}>
                  {index > 0 ? (
                    <span className="text-muted-foreground/40">{" / "}</span>
                  ) : null}
                  {singleWallet ? (
                    <>
                      <span className="@[15rem]:hidden">
                        {formatWalletAddress(wallet.address)}
                      </span>
                      <span className="hidden @[15rem]:inline">
                        {longAddress(wallet.address)}
                      </span>
                    </>
                  ) : (
                    <span>{formatWalletAddress(wallet.address)}</span>
                  )}
                  {wallet.detail ? (
                    <span
                      className={cn(
                        "text-muted-foreground hidden",
                        singleWallet ? "@[12rem]:inline" : "@[20rem]:inline",
                      )}
                    >
                      {` · ${wallet.detail}`}
                    </span>
                  ) : null}
                </Fragment>
              ))}
            </span>
          </span>
        ) : (
          // h-7 matches AVATAR_SIZE so the button keeps the same height (and
          // text colour) whether or not the avatar stack is rendered.
          <span className="flex h-7 min-w-0 items-center">
            <span className="truncate">Connect wallet</span>
          </span>
        )}
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

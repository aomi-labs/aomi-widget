"use client";

import { useEffect } from "react";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useEnsName } from "wagmi";
import {
  Button,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  formatAddress,
  getNetworkName,
  type WalletFooterProps,
} from "@aomi-labs/widget-lib";

export function WalletFooter({ wallet, setWallet }: WalletFooterProps) {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { data: ensName } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: 1,
    query: { enabled: Boolean(address) },
  });
  const { open } = useAppKit();

  useEffect(() => {
    const numericChainId = typeof chainId === "string" ? Number(chainId) : chainId;
    setWallet({
      address,
      chainId: numericChainId,
      isConnected,
      ensName: ensName ?? undefined,
    });
  }, [address, chainId, isConnected, ensName, setWallet]);

  const networkName = getNetworkName(wallet.chainId);

  const handleClick = () => {
    if (wallet.isConnected) {
      void open({ view: "Account" });
    } else {
      void open({ view: "Connect" });
    }
  };

  const label = wallet.isConnected
    ? wallet.ensName ?? formatAddress(wallet.address)
    : "Connect Wallet";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Button
            className="w-full justify-center rounded-full text-white dark:text-black shadow-lg hover:bg-[var(--muted-foreground)] hover:text-white dark:hover:bg-[var(--muted-foreground)] dark:hover:text-black"
            onClick={handleClick}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm dark:text-black/70">{label}</span>
              {networkName ? (
                <span className="text-[11px] text-white/80 dark:text-black/70">• {networkName}</span>
              ) : null}
            </div>
          </Button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

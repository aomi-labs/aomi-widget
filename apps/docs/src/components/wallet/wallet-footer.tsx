"use client";

import { useEffect } from "react";
import {
  useAppKit,
  useAppKitAccount,
  useAppKitNetwork,
} from "@reown/appkit/react";
import { useEnsName } from "wagmi";
import { Button } from "@aomi-labs/widget-lib/components/ui/button";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@aomi-labs/widget-lib/components/ui/sidebar";
import {
  formatAddress,
  getNetworkName,
  type UserConfig,
} from "@aomi-labs/react";

export function WalletFooter({ user, setUser }: UserConfig) {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const { data: ensName } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: 1,
    query: { enabled: Boolean(address) },
  });
  const { open } = useAppKit();

  // Sync AppKit state → lib
  useEffect(() => {
    const numericChainId =
      typeof chainId === "string" ? Number(chainId) : chainId;
    setUser({
      address,
      chainId: numericChainId,
      isConnected,
      ensName: ensName ?? undefined,
    });
  }, [address, chainId, isConnected, ensName, setUser]);

  const networkName = getNetworkName(user.chainId);

  const handleClick = () => {
    if (user.isConnected) {
      void open({ view: "Account" });
    } else {
      void open({ view: "Connect" });
    }
  };

  const label = user.isConnected
    ? (user.ensName ?? formatAddress(user.address))
    : "Connect Wallet";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" asChild>
          <Button
            className="w-full justify-center rounded-full text-white shadow-lg hover:bg-[var(--muted-foreground)] hover:text-white"
            onClick={handleClick}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm">{label}</span>
              {networkName ? (
                <span className="text-[11px] text-white/80">
                  • {networkName}
                </span>
              ) : null}
            </div>
          </Button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

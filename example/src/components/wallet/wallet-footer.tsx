"use client";

import * as React from "react";
import { useAppKit } from "@reown/appkit/react";
import {
  Button,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useWalletButtonState,
} from "@aomi-labs/widget-lib";
import { formatAddress, getNetworkName } from "./utils";

export function WalletFooter() {
  const { address, chainId, isConnected, ensName } = useWalletButtonState();
  const { open } = useAppKit();

  const networkName = getNetworkName(chainId as number);

  const handleClick = () => {
    if (isConnected) {
      void open({ view: "Account" });
    } else {
      void open({ view: "Connect" });
    }
  };

  const label = isConnected ? ensName ?? formatAddress(address) : "Connect Wallet";

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
                <span className="text-[11px] text-white/80">• {networkName}</span>
              ) : null}
            </div>
          </Button>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

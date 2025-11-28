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


/**
 * Format wallet address for display (0x1234...5678)
 */
export const formatAddress = (addr?: string): string =>
  addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

/**
 * Get network name from chainId (for system messages - lowercase)
 */
export const getNetworkName = (chainId: number | string): string => {
  const id = typeof chainId === "string" ? Number(chainId) : chainId;
  switch (id) {
    case 1:
      return 'ethereum';
    case 137:
      return 'polygon';
    case 42161:
      return 'arbitrum';
    case 8453:
      return 'base';
    case 10:
      return 'optimism';
    case 11155111:
      return 'sepolia';
    case 1337:
    case 31337:
      return 'testnet';
    case 59140:
      return 'linea-sepolia';
    case 59144:
      return 'linea';
    default:
      return 'testnet';
  }
};

"use client";

import * as React from "react";
import Link from "next/link";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { useEnsName } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/assistant-ui/thread-list";

// h-full min-h-full border-r border-sidebar-border bg-sidebar
export function ThreadListSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();

  const { data: ensName } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: 1,
    query: { enabled: Boolean(address) },
  });

  const formatAddress = (addr?: string) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "Connect Wallet";

  const networkName = isConnected
    ? (() => {
      switch (typeof chainId === "string" ? Number(chainId) : chainId) {
        case 1:
          return "Ethereum";
        case 137:
          return "Polygon";
      case 42161:
        return "Arbitrum";
      case 8453:
        return "Base";
        case 10:
          return "Optimism";
        default:
          return null;
      }
    })()
    : null;

  const handleClick = () => {
    if (isConnected) {
      void open({ view: "Account" });
    } else {
      void open({ view: "Connect" });
    }
  };

  const label = isConnected ? ensName ?? formatAddress(address) : "Connect Wallet";

  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      className="relative"
      {...props}
    >
      <SidebarHeader className="aomi-sidebar-header">
        <div className="aomi-sidebar-header-content flex items-center justify-between">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link
                  href="https://aomi.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="aomi-sidebar-header-icon-wrapper flex aspect-square size-8 items-center justify-center rounded-lg bg-white">
                    <img
                      src="/assets/images/a.svg"
                      alt="Logo"
                      className="aomi-sidebar-header-icon size-7 ml-3"
                    />
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>
      <SidebarContent className="aomi-sidebar-content">
        <ThreadList />
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter className="aomi-sidebar-footer border-t border-sm py-4">
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
      </SidebarFooter>
    </Sidebar>
  );
}

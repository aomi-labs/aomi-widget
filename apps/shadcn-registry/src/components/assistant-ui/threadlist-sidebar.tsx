"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { ConnectButton } from "@/components/control-bar/connect-button";
import { AomiMark } from "@/components/aomi-mark";

type ThreadListSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Position of the wallet button: "header" (top), "footer" (bottom), or null (hidden) */
  walletPosition?: "header" | "footer" | null;
  walletFamilies?: Array<"evm" | "solana">;
};

export function ThreadListSidebar({
  walletPosition = "footer",
  walletFamilies,
  ...props
}: ThreadListSidebarProps) {
  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      className="bg-aomi-surface border-aomi-border relative border-r"
      {...props}
    >
      <SidebarHeader className="aomi-sidebar-header">
        <div className="aomi-sidebar-header-content mb-3 ml-4 mt-4 flex items-center justify-between">
          {/* Brand lockup: mark · aomi · chevron */}
          <a
            href="https://aomi.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <AomiMark className="aomi-sidebar-header-icon size-6" />
            <span className="aomi-brand-wordmark text-[15px] font-bold tracking-[-0.01em]">
              aomi
            </span>
            <ChevronDown className="text-aomi-muted size-3.5" />
          </a>
          {walletPosition === "header" && (
            <ConnectButton families={walletFamilies} />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="aomi-sidebar-content">
        <ThreadList />
      </SidebarContent>
      <SidebarRail />
      {walletPosition === "footer" && (
        <SidebarFooter className="aomi-sidebar-footer mx-3 mb-4 border-0 pt-1">
          <div className="border-aomi-border mx-2 mb-1 border-t" />
          <ConnectButton className="w-full" families={walletFamilies} />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

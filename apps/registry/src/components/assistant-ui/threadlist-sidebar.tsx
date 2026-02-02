"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
import { WalletConnect } from "@/components/control-bar/wallet-connect";

type ThreadListSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Position of the wallet button: "header" (top), "footer" (bottom), or null (hidden) */
  walletPosition?: "header" | "footer" | null;
};

export function ThreadListSidebar({
  walletPosition = "footer",
  ...props
}: ThreadListSidebarProps) {
  return (
    <Sidebar
      collapsible="offcanvas"
      variant="inset"
      className="relative"
      {...props}
    >
      <SidebarHeader className="aomi-sidebar-header">
        <div className="aomi-sidebar-header-content mt-5 mb-5 ml-5 flex items-center justify-between">
          <Link
            href="https://aomi.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center"
          >
            <Image
              src="/assets/images/bubble.svg"
              alt="Logo"
              width={25}
              height={25}
              className="aomi-sidebar-header-icon size-6"
              priority
            />
          </Link>
          {walletPosition === "header" && <WalletConnect />}
        </div>
      </SidebarHeader>
      <SidebarContent className="aomi-sidebar-content">
        <ThreadList />
      </SidebarContent>
      <SidebarRail />
      {walletPosition === "footer" && (
        <SidebarFooter className="aomi-sidebar-footer border-0 mx-5 mb-5">
          <WalletConnect className="w-full" />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

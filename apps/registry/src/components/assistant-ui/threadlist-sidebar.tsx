"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { WalletButton, cn } from "@aomi-labs/react";
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
                    <Image
                      src="/assets/images/bubble.svg"
                      alt="Logo"
                      width={28}
                      height={28}
                      className="aomi-sidebar-header-icon ml-3 size-7"
                      priority
                    />
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          {walletPosition === "header" && (
            <WalletButton
              className={cn(
                "inline-flex items-center justify-center rounded-md text-sm font-medium",
                "ring-offset-background transition-colors",
                "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                "hover:bg-accent hover:text-accent-foreground",
                "h-8 px-3",
              )}
            />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="aomi-sidebar-content">
        <ThreadList />
      </SidebarContent>
      <SidebarRail />
      {walletPosition === "footer" && (
        <SidebarFooter className="aomi-sidebar-footer border-t py-4">
          <WalletButton
            className={cn(
              "inline-flex w-full items-center justify-center rounded-md text-sm font-medium",
              "ring-offset-background transition-colors",
              "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "border-input bg-background hover:bg-accent hover:text-accent-foreground border",
              "h-10 px-4",
            )}
          />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

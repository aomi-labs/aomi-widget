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

type ThreadListSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Optional footer component (e.g., WalletFooter from consumer app) */
  footer?: React.ReactNode;
};

export function ThreadListSidebar({
  footer,
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
                      src="/assets/images/a.svg"
                      alt="Logo"
                      width={28}
                      height={28}
                      className="aomi-sidebar-header-icon size-7 ml-3"
                      priority
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
      {footer && (
        <SidebarFooter className="aomi-sidebar-footer border-t border-sm py-4">
          {footer}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}

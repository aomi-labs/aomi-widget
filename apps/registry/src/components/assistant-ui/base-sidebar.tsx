"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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

type BaseSidebarProps = React.ComponentProps<typeof Sidebar> & {
  /** Label to display on the footer button */
  footerLabel?: string;
  /** Secondary label (e.g., network name) */
  footerSecondaryLabel?: string;
  /** Click handler for footer button */
  onFooterClick?: () => void;
  /** Logo URL (defaults to aomi logo) */
  logoUrl?: string;
  /** Logo link href */
  logoHref?: string;
};

export function BaseSidebar({
  footerLabel = "Connect Wallet",
  footerSecondaryLabel,
  onFooterClick,
  logoUrl = "/assets/images/a.svg",
  logoHref = "https://aomi.dev",
  ...props
}: BaseSidebarProps) {
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
                  href={logoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="aomi-sidebar-header-icon-wrapper flex aspect-square size-8 items-center justify-center rounded-lg bg-white">
                    <Image
                      src={logoUrl}
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
      <SidebarFooter className="aomi-sidebar-footer border-t border-sm py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Button
                className="w-full justify-center rounded-full text-white shadow-lg hover:bg-[var(--muted-foreground)] hover:text-white"
                onClick={onFooterClick}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{footerLabel}</span>
                  {footerSecondaryLabel ? (
                    <span className="text-[11px] text-white/80">• {footerSecondaryLabel}</span>
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

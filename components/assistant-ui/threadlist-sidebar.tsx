import * as React from "react";
import { Github, MessagesSquare} from "lucide-react";
import Link from "next/link";
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
                  {/* <div className="aomi-sidebar-header-heading mr-6 flex flex-col gap-0.5 leading-none">
                    <span className="aomi-sidebar-header-title font-semibold">
                      assistant-ui
                    </span>
                  </div> */}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarHeader>
      <SidebarContent className="aomi-sidebar-content px-2">
        <ThreadList />
      </SidebarContent>
      <SidebarRail />
      <SidebarFooter className="aomi-sidebar-footer border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                href="https://github.com/assistant-ui/assistant-ui"
                target="_blank"
              >
                <div className="aomi-sidebar-footer-icon-wrapper flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Github className="aomi-sidebar-footer-icon size-4" />
                </div>
                <div className="aomi-sidebar-footer-heading flex flex-col gap-0.5 leading-none">
                  <span className="aomi-sidebar-footer-title font-semibold">
                    GitHub
                  </span>
                  <span>View Source</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
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
import { Skeleton } from "@/components/ui/skeleton";

type HistorySession = {
  session_id: string;
  main_topic: string;
};

// h-full min-h-full border-r border-sidebar-border bg-sidebar
export function ThreadListSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const [historySessions, setHistorySessions] = React.useState<HistorySession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = React.useState(false);
  const [sessionError, setSessionError] = React.useState<string | null>(null);
  const backendUrl = React.useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080",
    [],
  );

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

  React.useEffect(() => {
    const fetchSessions = async () => {
      if (!address) {
        setHistorySessions([]);
        setSessionError(null);
        return;
      }

      setIsLoadingSessions(true);
      setSessionError(null);
      try {
        const res = await fetch(
          `${backendUrl}/api/sessions?public_key=${encodeURIComponent(address)}`,
        );
        if (!res.ok) {
          throw new Error(`Failed to load sessions: ${res.status}`);
        }
        const data = (await res.json()) as HistorySession[];
        setHistorySessions(data);
      } catch (error) {
        console.error(error);
        setSessionError("Could not load sessions");
        setHistorySessions([]);
      } finally {
        setIsLoadingSessions(false);
      }
    };

    void fetchSessions();
  }, [address, backendUrl]);

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
        {/* <div className="mb-2 px-2 text-xs font-semibold uppercase text-sidebar-foreground/70">
          Recent Sessions
        </div> */}
        <SidebarMenu className="mb-3">
          {isLoadingSessions ? (
            Array.from({ length: 3 }, (_, idx) => (
              <SidebarMenuItem key={`session-skel-${idx}`}>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-10" />
                </div>
              </SidebarMenuItem>
            ))
          ) : sessionError ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                variant="outline"
                className="justify-between text-xs text-red-500"
                disabled
              >
                {sessionError}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : historySessions.length > 0 ? (
            historySessions.map((session) => (
              <SidebarMenuItem key={session.session_id}>
                <SidebarMenuButton
                  variant="outline"
                  className="justify-between text-xs"
                >
                  <span className="truncate">{session.main_topic || "Untitled"}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {session.session_id.slice(0, 6)}…
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton
                variant="outline"
                className="justify-start text-xs text-muted-foreground"
                disabled
              >
                {address ? "No sessions yet" : "Connect wallet to load sessions"}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
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

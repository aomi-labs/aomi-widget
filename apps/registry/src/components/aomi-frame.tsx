"use client";

import { type CSSProperties, type ReactNode } from "react";
import {
  AomiRuntimeProvider,
  cn,
  useAomiRuntime,
  type UserConfig,
} from "@aomi-labs/react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// =============================================================================
// Types
// =============================================================================

type AomiFrameProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  /** Render prop for wallet footer - receives user state and setter from UserContext */
  walletFooter?: (props: UserConfig) => ReactNode;
  /** Additional content to render inside the frame */
  children?: ReactNode;
};

// =============================================================================
// AomiFrame Component
// =============================================================================

export const AomiFrame = ({
  width = "100%",
  height = "80vh",
  className,
  style,
  walletFooter,
  children,
}: AomiFrameProps) => {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

  return (
    <AomiRuntimeProvider backendUrl={backendUrl}>
      <AomiFrameShell
        width={width}
        height={height}
        className={className}
        style={style}
        walletFooter={walletFooter}
      >
        {children}
      </AomiFrameShell>
    </AomiRuntimeProvider>
  );
};

// =============================================================================
// Internal Shell Component (uses hooks from providers)
// =============================================================================

type AomiFrameShellProps = {
  width: CSSProperties["width"];
  height: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  walletFooter?: (props: UserConfig) => ReactNode;
  children?: ReactNode;
};

const AomiFrameShell = ({
  width,
  height,
  className,
  style,
  walletFooter,
  children,
}: AomiFrameShellProps) => {
  const { user, setUser, currentThreadId, threadViewKey, getThreadMetadata } =
    useAomiRuntime();
  const currentTitle = getThreadMetadata(currentThreadId)?.title ?? "New Chat";

  const frameStyle: CSSProperties = { width, height, ...style };

  return (
    <SidebarProvider>
      {children}
      <div
        className={cn(
          "flex h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-950",
          className,
        )}
        style={frameStyle}
      >
        <ThreadListSidebar footer={walletFooter?.({ user, setUser })} />
        <SidebarInset className="relative">
          <header className="mt-1 flex h-14 shrink-0 items-center gap-2 border-b px-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  {currentTitle}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
              </BreadcrumbList>
            </Breadcrumb>
          </header>
          <div className="flex-1 overflow-hidden">
            <Thread key={`${currentThreadId}-${threadViewKey}`} />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

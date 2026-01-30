"use client";

import { type CSSProperties, type ReactNode, type FC } from "react";
import { AomiRuntimeProvider, cn, useAomiRuntime } from "@aomi-labs/react";
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
} from "@/components/ui/breadcrumb";
import { ControlBar, type ControlBarProps } from "@/components/control-bar";

// =============================================================================
// Types
// =============================================================================

type RootProps = {
  children?: ReactNode;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  /** Position of the wallet button in the sidebar */
  walletPosition?: "header" | "footer" | null;
  /** Backend URL for the Aomi runtime */
  backendUrl?: string;
};

type HeaderProps = {
  children?: ReactNode;
  /** Show the control bar in the header */
  withControl?: boolean;
  /** Props to pass to the ControlBar when withControl is true */
  controlBarProps?: Omit<ControlBarProps, "children">;
  className?: string;
};

type ComposerProps = {
  children?: ReactNode;
  /** Show the control bar above the composer */
  withControl?: boolean;
  /** Props to pass to the ControlBar when withControl is true */
  controlBarProps?: Omit<ControlBarProps, "children">;
  className?: string;
};

type FrameControlBarProps = ControlBarProps;

// =============================================================================
// Compound Components
// =============================================================================

/**
 * Root component - provides all context and layout container
 */
const Root: FC<RootProps> = ({
  children,
  width = "100%",
  height = "80vh",
  className,
  style,
  walletPosition = "footer",
  backendUrl,
}) => {
  const resolvedBackendUrl =
    backendUrl ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://localhost:8080";
  const frameStyle: CSSProperties = { width, height, ...style };

  return (
    <AomiRuntimeProvider backendUrl={resolvedBackendUrl}>
      <SidebarProvider>
        <div
          className={cn(
            "flex h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-950",
            className,
          )}
          style={frameStyle}
        >
          <ThreadListSidebar walletPosition={walletPosition} />
          <SidebarInset className="relative flex flex-col">
            {children}
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AomiRuntimeProvider>
  );
};

/**
 * Header component - renders the header with optional control bar
 */
const Header: FC<HeaderProps> = ({
  children,
  withControl = true,
  controlBarProps,
  className,
}) => {
  const { currentThreadId, getThreadMetadata } = useAomiRuntime();
  const currentTitle = getThreadMetadata(currentThreadId)?.title ?? "New Chat";

  return (
    <header
      className={cn(
        "mt-1 flex h-14 shrink-0 items-center gap-2 border-b px-3",
        className,
      )}
    >
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      {withControl && <ControlBar {...controlBarProps} />}
      <Breadcrumb className="ml-auto">
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            {currentTitle}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      {children}
    </header>
  );
};

/**
 * Composer component - renders the thread with optional control bar above
 */
const Composer: FC<ComposerProps> = ({
  children,
  withControl = false,
  controlBarProps,
  className,
}) => {
  const { currentThreadId, threadViewKey } = useAomiRuntime();

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden", className)}>
      {withControl && (
        <div className="border-b px-4 py-2">
          <ControlBar {...controlBarProps} />
        </div>
      )}
      <Thread key={`${currentThreadId}-${threadViewKey}`} />
      {children}
    </div>
  );
};

/**
 * ControlBar component - wrapper for the control bar with frame styling
 */
const FrameControlBar: FC<FrameControlBarProps> = (props) => {
  return <ControlBar {...props} />;
};

// =============================================================================
// Default Layout Component (Simple API)
// =============================================================================

type DefaultLayoutProps = Omit<RootProps, "children">;

/**
 * Default layout with ControlBar in header
 * Usage: <AomiFrame /> or <AomiFrame walletPosition="header" />
 */
const DefaultLayout: FC<DefaultLayoutProps> = (props) => {
  return (
    <Root {...props}>
      <Header withControl />
      <Composer />
    </Root>
  );
};

// =============================================================================
// Export Compound Component
// =============================================================================

export const AomiFrame = Object.assign(DefaultLayout, {
  Root,
  Header,
  Composer,
  ControlBar: FrameControlBar,
});

// Re-export types for consumers
export type {
  RootProps as AomiFrameRootProps,
  HeaderProps as AomiFrameHeaderProps,
  ComposerProps as AomiFrameComposerProps,
  FrameControlBarProps as AomiFrameControlBarProps,
};

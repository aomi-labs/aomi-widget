"use client";

import {
  type CSSProperties,
  type ReactNode,
  type FC,
  createContext,
  useContext,
} from "react";
import { AomiRuntimeProvider, cn, useAomiRuntime } from "@aomi-labs/react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { NotificationToaster } from "@/components/ui/notification";
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
// Composer Control Context - signals Thread to show inline controls
// =============================================================================

const ComposerControlContext = createContext<boolean>(false);

export const useComposerControl = () => useContext(ComposerControlContext);

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
  /** Show inline controls in the composer input area */
  withControl?: boolean;
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
            "rounded-4xl flex h-full w-full overflow-hidden bg-white shadow-2xl dark:bg-neutral-950",
            className,
          )}
          style={frameStyle}
        >
          <ThreadListSidebar walletPosition={walletPosition} />
          <SidebarInset className="relative flex flex-col">
            {children}
          </SidebarInset>
          <NotificationToaster />
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
  withControl,
  controlBarProps,
  className,
}) => {
  const { currentThreadId, getThreadMetadata } = useAomiRuntime();
  const currentTitle = getThreadMetadata(currentThreadId)?.title ?? "New Chat";

  return (
    <header
      className={cn(
        "mt-1 flex h-14 shrink-0 items-center gap-2 px-3",
        className,
      )}
    >
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            {currentTitle}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        {withControl && <ControlBar {...controlBarProps} />}
        {children}
      </div>
    </header>
  );
};

/**
 * Composer component - renders the thread with optional inline controls
 * When withControl={true}, controls appear inline in the composer input area
 */
const Composer: FC<ComposerProps> = ({
  children,
  withControl = false,
  className,
}) => {
  const { currentThreadId, threadViewKey } = useAomiRuntime();

  return (
    <ComposerControlContext.Provider value={withControl}>
      <div className={cn("flex flex-1 flex-col overflow-hidden", className)}>
        <Thread key={`${currentThreadId}-${threadViewKey}`} />
        {children}
      </div>
    </ComposerControlContext.Provider>
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
 * Default layout - controls are inline in the composer input area
 * Usage: <AomiFrame /> or <AomiFrame walletPosition="header" />
 */
const DefaultLayout: FC<DefaultLayoutProps> = ({
  walletPosition = "footer",
  ...props
}) => {
  // Hide wallet in ControlBar when it's shown in sidebar
  const hideWalletInControlBar = walletPosition !== null;

  return (
    <Root walletPosition={walletPosition} {...props}>
      <Header
        withControl
        controlBarProps={{ hideWallet: hideWalletInControlBar }}
      />
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

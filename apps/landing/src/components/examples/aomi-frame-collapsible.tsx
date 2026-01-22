"use client";

/**
 * AomiFrameCollapsible - Example of building custom frame UI with headless mode
 *
 * This demonstrates how consumers can use AomiRuntimeProvider directly
 * and build their own custom UI with the provided hooks.
 */

import { type CSSProperties, type ReactNode } from "react";
import {
  AomiRuntimeProvider,
  cn,
  useAomiRuntime,
  type UserConfig,
} from "@aomi-labs/react";
import { Separator } from "@aomi-labs/widget-lib/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@aomi-labs/widget-lib/components/ui/breadcrumb";
import { Thread } from "@aomi-labs/widget-lib/components/assistant-ui/thread";
import { ThreadListCollapsible } from "./threadlist-collapsible";

// =============================================================================
// Types
// =============================================================================

type AomiFrameCollapsibleProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  /** Render prop for wallet footer - receives user state and setter from UserContext */
  walletFooter?: (props: UserConfig) => ReactNode;
  /** Additional content to render inside the frame */
  children?: ReactNode;
  /** Default open state for collapsible */
  defaultOpen?: boolean;
};

// =============================================================================
// AomiFrameCollapsible Component
// =============================================================================

export const AomiFrameCollapsible = ({
  width = "100%",
  height = "80vh",
  className,
  style,
  walletFooter,
  children,
  defaultOpen = false,
}: AomiFrameCollapsibleProps) => {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

  return (
    <AomiRuntimeProvider backendUrl={backendUrl}>
      <AomiFrameCollapsibleContent
        width={width}
        height={height}
        className={className}
        style={style}
        walletFooter={walletFooter}
        defaultOpen={defaultOpen}
      >
        {children}
      </AomiFrameCollapsibleContent>
    </AomiRuntimeProvider>
  );
};

// =============================================================================
// Internal Content Component (uses hooks from providers)
// =============================================================================

type AomiFrameCollapsibleContentProps = {
  width: CSSProperties["width"];
  height: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  walletFooter?: (props: UserConfig) => ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
};

const AomiFrameCollapsibleContent = ({
  width,
  height,
  className,
  style,
  walletFooter,
  children,
  defaultOpen = false,
}: AomiFrameCollapsibleContentProps) => {
  const { user, setUser, currentThreadId, threadViewKey, getThreadMetadata } =
    useAomiRuntime();
  const currentTitle = getThreadMetadata(currentThreadId)?.title ?? "New Chat";

  const frameStyle: CSSProperties = { width, height, ...style };

  return (
    <>
      {children}
      <div
        className={cn(
          "flex h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-950",
          className,
        )}
        style={frameStyle}
      >
        <ThreadListCollapsible
          footer={walletFooter?.({ user, setUser })}
          defaultOpen={defaultOpen}
        />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <header className="mt-1 flex h-14 shrink-0 items-center gap-2 border-b px-3">
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
        </div>
      </div>
    </>
  );
};

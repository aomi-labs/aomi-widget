"use client";

import { type CSSProperties, type ReactNode } from "react";
import {
  AomiRuntimeProvider,
  ThreadContextProvider,
  cn,
  useUser,
  type WalletFooterProps,
  useCurrentThreadMetadata,
  useThreadContext,
} from "@aomi-labs/react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListCollapsible } from "@/components/assistant-ui/threadlist-collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { NotificationToaster } from "@/components/ui/notification";

type AomiFrameCollapsibleProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  /** Render prop for wallet footer - receives wallet state and setter from UserContext */
  walletFooter?: (props: WalletFooterProps) => ReactNode;
  /** Additional content to render inside the frame */
  children?: ReactNode;
  /** Default open state for collapsible */
  defaultOpen?: boolean;
};

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
  const frameStyle: CSSProperties = { width, height, ...style };

  return (
    <ThreadContextProvider>
      <AomiRuntimeProvider backendUrl={backendUrl}>
        <NotificationToaster />
        <FrameShellCollapsible
          className={className}
          frameStyle={frameStyle}
          walletFooter={walletFooter}
          defaultOpen={defaultOpen}
        >
          {children}
        </FrameShellCollapsible>
      </AomiRuntimeProvider>
    </ThreadContextProvider>
  );
};

type FrameShellCollapsibleProps = {
  className?: string;
  frameStyle: CSSProperties;
  walletFooter?: (props: WalletFooterProps) => ReactNode;
  children?: ReactNode;
  defaultOpen?: boolean;
};

const FrameShellCollapsible = ({
  className,
  frameStyle,
  walletFooter,
  children,
  defaultOpen = false,
}: FrameShellCollapsibleProps) => {
  const currentTitle = useCurrentThreadMetadata()?.title ?? "New Chat";
  const { currentThreadId, threadViewKey } = useThreadContext();
  const { user, setUser } = useUser();

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
          footer={walletFooter?.({ wallet: user, setWallet: setUser })}
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

"use client";

import { useState, useCallback, type CSSProperties, type ReactNode } from "react";
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
import { cn } from "@/lib/utils";
import { AomiRuntimeProvider } from "@/components/assistant-ui/runtime";
import { ThreadContextProvider, useCurrentThreadMetadata, useThreadContext } from "@/lib/thread-context";
import {
  WalletSystemMessageEmitter,
  type WalletButtonState,
  type WalletFooterProps,
} from "@/utils/wallet";
import type { WalletTxRequestHandler } from "@/lib/wallet-tx";
import { NotificationProvider } from "@/lib/notification-context";
import { NotificationContainer } from "@/components/assistant-ui/notification";

type AomiFrameProps = {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  /**
   * Optional wallet transaction handler (recommended for Reown/Wagmi/WalletConnect).
   * When provided, the widget will call this instead of `window.ethereum` so the tx
   * is signed by the wallet that your app connected.
   */
  onWalletTxRequest?: WalletTxRequestHandler;
  /** Render prop for wallet footer - receives wallet state and setter from lib */
  walletFooter?: (props: WalletFooterProps) => ReactNode;
  /** Additional content to render inside the frame */
  children?: ReactNode;
};

export const AomiFrame = ({
  width = "100%",
  height = "80vh",
  className,
  style,
  onWalletTxRequest,
  walletFooter,
  children,
}: AomiFrameProps) => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";
  const frameStyle: CSSProperties = { width, height, ...style };

  // Local wallet state (replaces Zustand)
  const [wallet, setWalletState] = useState<WalletButtonState>({
    isConnected: false,
    address: undefined,
    chainId: undefined,
    ensName: undefined,
  });

  const setWallet = useCallback((data: Partial<WalletButtonState>) => {
    setWalletState((prev) => ({ ...prev, ...data }));
  }, []);

  return (
    <ThreadContextProvider>
      <NotificationProvider>
        <AomiRuntimeProvider
          backendUrl={backendUrl}
          publicKey={wallet.address}
          onWalletTxRequest={onWalletTxRequest}
        >
          {/* Internal: watches wallet state and sends system messages */}
          <WalletSystemMessageEmitter wallet={wallet} />
          <NotificationContainer />
          <FrameShell
            className={className}
            frameStyle={frameStyle}
            walletFooter={walletFooter}
            wallet={wallet}
            setWallet={setWallet}
          >
            {children}
          </FrameShell>
        </AomiRuntimeProvider>
      </NotificationProvider>
    </ThreadContextProvider>
  );
};

type FrameShellProps = {
  className?: string;
  frameStyle: CSSProperties;
  walletFooter?: (props: WalletFooterProps) => ReactNode;
  wallet: WalletButtonState;
  setWallet: (data: Partial<WalletButtonState>) => void;
  children?: ReactNode;
};

const FrameShell = ({
  className,
  frameStyle,
  walletFooter,
  wallet,
  setWallet,
  children,
}: FrameShellProps) => {
  const currentTitle = useCurrentThreadMetadata()?.title ?? "New Chat";
  const { currentThreadId, threadViewKey } = useThreadContext();

  return (
    <SidebarProvider>
      {children}
      <div
        className={cn(
          "flex h-full w-full overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-950",
          className
        )}
        style={frameStyle}
      >
        <ThreadListSidebar footer={walletFooter?.({ wallet, setWallet })} />
        <SidebarInset className="relative">
          <header className="flex h-14 mt-1 shrink-0 items-center gap-2 border-b px-3">
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

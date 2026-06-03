"use client";

import {
  type CSSProperties,
  type ReactNode,
  type FC,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  AomiClient,
  AomiRuntimeProvider,
  cn,
  useAomiRuntime,
  type AomiClientOptions,
} from "@aomi-labs/react";
import { Thread } from "@/components/assistant-ui/thread";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import { NotificationToaster } from "@/components/ui/notification";
import { RuntimeTxHandler } from "@/components/runtime-tx-handler";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { ControlBar, type ControlBarProps } from "@/components/control-bar";
import { useAomiAuthAdapter } from "@/lib/aomi-auth-adapter";
import { toWireWalletFamily } from "@/lib/aomi-auth-adapter/wallet-family";
import type { AomiAccount } from "@/lib/aomi-auth-adapter/types";

// =============================================================================
// Composer Control Context - signals Thread to show inline controls
// =============================================================================

type ComposerControlContextValue = {
  enabled: boolean;
  controlBarProps?: Omit<ControlBarProps, "children">;
};

const ComposerControlContext = createContext<ComposerControlContextValue>({
  enabled: false,
});

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
  /** Which wallet families to show as dual slots (omit for single-family mode) */
  walletFamilies?: Array<"evm" | "solana">;
  /** Whether to show the thread list sidebar (default: true) */
  showSidebar?: boolean;
  /** Backend URL for the Aomi runtime */
  backendUrl?: string;
  /** Optional runtime client overrides. */
  clientOptions?: Omit<AomiClientOptions, "baseUrl">;
};

type HeaderProps = {
  children?: ReactNode;
  /** Show the control bar in the header */
  withControl?: boolean;
  /** Props to pass to the ControlBar when withControl is true */
  controlBarProps?: Omit<ControlBarProps, "children">;
  /** Whether to show the sidebar toggle button (default: true) */
  showSidebarTrigger?: boolean;
  className?: string;
};

type ComposerProps = {
  children?: ReactNode;
  /** Show inline controls in the composer input area */
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
  walletFamilies,
  showSidebar = true,
  backendUrl,
  clientOptions,
}) => {
  const resolvedBackendUrl =
    backendUrl ??
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    "http://127.0.0.1:8080";
  const frameStyle: CSSProperties = { width, height, ...style };

  return (
    <AomiRuntimeProvider
      backendUrl={resolvedBackendUrl}
      clientOptions={clientOptions}
    >
      <WalletContextSync
        backendUrl={resolvedBackendUrl}
        clientOptions={clientOptions}
      />
      <SidebarProvider className="min-h-0! h-full">
        <div
          className={cn(
            "rounded-4xl flex h-full w-full overflow-hidden bg-white shadow-2xl dark:bg-neutral-950",
            className,
          )}
          style={frameStyle}
        >
          {showSidebar && (
            <ThreadListSidebar
              walletPosition={walletPosition}
              walletFamilies={walletFamilies}
            />
          )}
          <SidebarInset className="relative flex min-h-0 flex-col">
            {children}
          </SidebarInset>
          <NotificationToaster />
          <RuntimeTxHandler />
        </div>
      </SidebarProvider>
    </AomiRuntimeProvider>
  );
};

function walletContextKey(
  threadId: string,
  account: AomiAccount,
  networkId?: string | null,
) {
  return [
    threadId,
    toWireWalletFamily(account.family),
    account.identityWalletId,
    networkId ?? "",
  ].join(":");
}

function isWalletContextError(error: unknown): error is {
  status: number;
  code: string;
  currentContext?: {
    identity_wallet_id: number;
    network_id?: string | null;
    version: number;
  } | null;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { status?: unknown }).status === "number" &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

function WalletContextSync({
  backendUrl,
  clientOptions,
}: {
  backendUrl: string;
  clientOptions?: Omit<AomiClientOptions, "baseUrl">;
}) {
  const runtime = useAomiRuntime();
  const adapter = useAomiAuthAdapter();
  const client = useMemo(
    () => new AomiClient({ ...clientOptions, baseUrl: backendUrl }),
    [backendUrl, clientOptions],
  );
  const committedKeysRef = useRef(new Set<string>());
  const versionsRef = useRef(new Map<string, number>());

  useEffect(() => {
    if (!adapter.identity.isConnected) return;

    const accounts = adapter.accounts.filter(
      (account) => account.active && account.identityWalletId !== undefined,
    );
    if (accounts.length === 0) return;

    let cancelled = false;

    const commitAccount = async (account: AomiAccount) => {
      const family = toWireWalletFamily(account.family);
      const networkId =
        account.family === "evm"
          ? adapter.identity.chainId?.toString()
          : adapter.identity.solanaCluster;
      const key = walletContextKey(runtime.currentThreadId, account, networkId);
      if (committedKeysRef.current.has(key)) return;

      const versionKey = `${runtime.currentThreadId}:${family}`;
      const request = {
        family,
        identity_wallet_id: account.identityWalletId!,
        network_id: networkId ?? null,
        expected_version: versionsRef.current.get(versionKey) ?? null,
      };

      try {
        const context = await client.putSessionWalletContext(
          runtime.currentThreadId,
          request,
        );
        if (cancelled) return;
        versionsRef.current.set(versionKey, context.version);
        committedKeysRef.current.add(key);
      } catch (error) {
        if (cancelled || !isWalletContextError(error)) return;
        if (
          error.code !== "wallet_context_version_mismatch" ||
          !error.currentContext
        ) {
          if (error.code !== "wallet_context_locked") {
            console.warn("[AomiFrame] wallet context sync failed", error);
          }
          return;
        }

        versionsRef.current.set(versionKey, error.currentContext.version);
        const serverStillMatchesIntent =
          error.currentContext.identity_wallet_id ===
            account.identityWalletId &&
          (error.currentContext.network_id ?? null) === (networkId ?? null);
        if (!serverStillMatchesIntent) return;

        try {
          const retryContext = await client.putSessionWalletContext(
            runtime.currentThreadId,
            {
              ...request,
              expected_version: error.currentContext.version,
            },
          );
          if (cancelled) return;
          versionsRef.current.set(versionKey, retryContext.version);
          committedKeysRef.current.add(key);
        } catch (retryError) {
          if (!cancelled) {
            console.warn("[AomiFrame] wallet context retry failed", retryError);
          }
        }
      }
    };

    void Promise.all(accounts.map(commitAccount)).catch((error) => {
      if (!cancelled) {
        console.warn("[AomiFrame] wallet context sync failed", error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    adapter.accounts,
    adapter.identity.chainId,
    adapter.identity.isConnected,
    adapter.identity.solanaCluster,
    client,
    runtime.currentThreadId,
  ]);

  return null;
}

/**
 * Header component - renders the header with optional control bar
 */
const Header: FC<HeaderProps> = ({
  children,
  withControl,
  controlBarProps,
  showSidebarTrigger = true,
  className,
}) => {
  const { currentThreadId, getThreadMetadata } = useAomiRuntime();
  const meta = getThreadMetadata(currentThreadId);
  const currentTitle =
    meta?.title && meta.title !== "New Chat" ? meta.title : null;

  return (
    <>
      <header
        className={cn(
          "mt-1 flex h-14 shrink-0 items-center gap-2 px-3",
          className,
        )}
      >
        {showSidebarTrigger && (
          <>
            <SidebarTrigger />
            {currentTitle && <div className="bg-border/50 mr-2 h-3.5 w-px" />}
          </>
        )}
        <Breadcrumb>
          <BreadcrumbList>
            {currentTitle && (
              <BreadcrumbItem className="hidden md:block">
                {currentTitle}
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto flex items-center gap-2">
          {withControl && <ControlBar {...controlBarProps} />}
          {children}
        </div>
      </header>
      <div className="pointer-events-none relative z-10 -mb-4 h-4 shrink-0 bg-gradient-to-b from-white/80 to-transparent dark:from-neutral-950/80" />
    </>
  );
};

/**
 * Composer component - renders the thread with optional inline controls
 * When withControl={true}, controls appear inline in the composer input area
 */
const Composer: FC<ComposerProps> = ({
  children,
  withControl = false,
  controlBarProps,
  className,
}) => {
  const { currentThreadId, threadViewKey } = useAomiRuntime();

  return (
    <ComposerControlContext.Provider
      value={{ enabled: withControl, controlBarProps }}
    >
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
  walletFamilies,
  showSidebar = true,
  ...props
}) => {
  // Hide wallet in ControlBar when it's shown in sidebar
  const hideWalletInControlBar = walletPosition !== null;

  return (
    <Root
      walletPosition={walletPosition}
      walletFamilies={walletFamilies}
      showSidebar={showSidebar}
      {...props}
    >
      <Header
        withControl
        showSidebarTrigger={showSidebar}
        controlBarProps={{
          hideWallet: hideWalletInControlBar,
          hideNetwork: false,
        }}
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

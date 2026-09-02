"use client";

import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { GetAccountBearer } from "@aomi-labs/client";
import type { AomiClientOptions } from "@aomi-labs/react";
import { AomiFrame, type AomiFrameControlBarProps } from "./aomi-frame";
import { AomiWalletKitProvider, useAomiWalletKit } from "../lib/wallet-kit";
import type {
  AuthConfig,
  ProvidersConfig,
  WalletsConfig,
} from "../lib/wallet-kit/config/types";
import { BackendAaProvider } from "../lib/wallet-kit/execution/backend-aa-context";
import { BackendAaProvisioner } from "./backend-aa-provisioner";

export type CrossOriginWidgetAuth =
  | { kind: "browser_wallet" }
  | {
      kind: "embedded_wallet";
      provider: "para";
      environment: string;
      /** Para public project key. Cross-origin hosts must pass it here; only
       * Next-style hosts that inline `NEXT_PUBLIC_PARA_API_KEY` may omit it. */
      apiKey?: string;
    }
  | {
      kind: "embedded_wallet";
      provider: "privy";
      environment?: string;
      /** Privy public app ID. Same contract as Para's `apiKey`. */
      appId?: string;
    };

export type WalletPresentationConfig = WalletsConfig;

export type AomiWidgetProps = {
  children?: ReactNode;
  applicationId: string;
  apiUrl: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
  style?: CSSProperties;
  walletPosition?: "header" | "footer" | null;
  walletFamilies?: Array<"evm" | "solana">;
  showSidebar?: boolean;
  showHeader?: boolean;
  controlBarProps?: Omit<AomiFrameControlBarProps, "children">;
  clientOptions?: Omit<AomiClientOptions, "baseUrl" | "getAccountBearer">;
  persistThread?: boolean;
  threadPersistenceKey?: string;
  threadPersistenceScope?: string | null;
  initialThreadId?: string;
  auth: CrossOriginWidgetAuth;
  wallets?: WalletPresentationConfig;
};

export function AomiWidget(props: AomiWidgetProps) {
  const resolvedApiUrl = props.apiUrl.replace(/\/+$/, "");
  const resolved = resolveWidgetAuth(props.auth);
  const account = {
    mode: "aomi-backend" as const,
    baseUrl: resolvedApiUrl,
    widgetAuth:
      props.auth.kind === "embedded_wallet"
        ? {
            mode: "provider" as const,
            provider: props.auth.provider,
            // Privy's exchange accepts only PROD; Para carries its own value.
            environment: props.auth.environment ?? "PROD",
          }
        : { mode: "wallet" as const },
  };

  return (
    <AomiWalletKitProvider
      auth={resolved.auth}
      providers={resolved.providers}
      wallets={props.wallets}
      execution={{ aa: "off", sponsorship: { mode: "disabled" } }}
      account={account}
    >
      <WidgetFrame
        apiUrl={resolvedApiUrl}
        applicationId={props.applicationId}
        width={props.width}
        height={props.height}
        className={props.className}
        style={props.style}
        walletPosition={props.walletPosition}
        walletFamilies={props.walletFamilies}
        showSidebar={props.showSidebar}
        showHeader={props.showHeader}
        controlBarProps={props.controlBarProps}
        clientOptions={props.clientOptions}
        persistThread={props.persistThread}
        threadPersistenceKey={props.threadPersistenceKey}
        threadPersistenceScope={props.threadPersistenceScope}
        initialThreadId={props.initialThreadId}
      />
      {props.children}
    </AomiWalletKitProvider>
  );
}

type WidgetFrameProps = Pick<
  AomiWidgetProps,
  | "width"
  | "height"
  | "className"
  | "style"
  | "walletPosition"
  | "walletFamilies"
  | "showSidebar"
  | "showHeader"
  | "controlBarProps"
  | "clientOptions"
  | "persistThread"
  | "threadPersistenceKey"
  | "threadPersistenceScope"
  | "initialThreadId"
> & { apiUrl: string; applicationId: string };

function WidgetFrame({
  apiUrl,
  applicationId,
  width = "100%",
  height = "80vh",
  className,
  style,
  walletPosition = "footer",
  walletFamilies = ["evm", "solana"],
  showSidebar = true,
  showHeader = true,
  controlBarProps,
  clientOptions,
  persistThread,
  threadPersistenceKey,
  threadPersistenceScope,
  initialThreadId,
}: WidgetFrameProps) {
  const walletKit = useAomiWalletKit();
  const getAccountBearer = useDelegatingAccountBearer(
    walletKit.getAccountBearer,
  );
  const runtimeClientOptions = useMemo(
    () => ({
      ...clientOptions,
      getAccountBearer,
    }),
    [clientOptions, getAccountBearer],
  );
  return (
    <BackendAaProvider value={{ apiUrl, getAccountBearer }}>
      <AomiFrame.Root
        backendUrl={apiUrl}
        applicationId={applicationId}
        accountSessionAvailable={Boolean(walletKit.accountUser)}
        clientOptions={runtimeClientOptions}
        width={width}
        height={height}
        className={className}
        style={style}
        walletPosition={walletPosition}
        walletFamilies={walletFamilies}
        showSidebar={showSidebar}
        persistThread={persistThread}
        threadPersistenceKey={threadPersistenceKey}
        threadPersistenceScope={threadPersistenceScope}
        initialThreadId={initialThreadId}
      >
        <BackendAaProvisioner applicationId={applicationId} />
        {showHeader ? (
          <AomiFrame.Header showSidebarTrigger={showSidebar} />
        ) : null}
        <AomiFrame.Composer
          withControl
          controlBarProps={{
            hideApiKey: true,
            hideNetwork: false,
            ...controlBarProps,
          }}
        />
      </AomiFrame.Root>
    </BackendAaProvider>
  );
}

/** Keep the AomiClient and every live thread session on one bearer function.
 * The delegate appears after login and can rotate later without replacing the
 * client captured by an already-running session. */
function useDelegatingAccountBearer(
  delegate: GetAccountBearer | undefined,
): GetAccountBearer {
  const delegateRef = useRef(delegate);
  delegateRef.current = delegate;
  const listenersRef = useRef(new Set<() => void>());
  const provider = useMemo(() => {
    const getBearer: GetAccountBearer = (options) =>
      delegateRef.current?.(options) ?? Promise.resolve(undefined);
    Object.defineProperty(getBearer, "required", {
      configurable: false,
      get: () => delegateRef.current?.required === true,
    });
    getBearer.subscribe = (listener) => {
      listenersRef.current.add(listener);
      return () => listenersRef.current.delete(listener);
    };
    return getBearer;
  }, []);

  useEffect(() => {
    const unsubscribe = delegate?.subscribe?.(() => {
      for (const listener of listenersRef.current) listener();
    });
    for (const listener of listenersRef.current) listener();
    return unsubscribe;
  }, [delegate]);

  return provider;
}

function resolveWidgetAuth(auth: CrossOriginWidgetAuth): {
  auth: AuthConfig;
  providers?: ProvidersConfig;
} {
  if (auth.kind === "browser_wallet") return { auth: false };
  if (auth.provider === "para") {
    return {
      auth: { provider: "para" },
      providers: {
        para: {
          apiKey: auth.apiKey,
          environment:
            auth.environment.toUpperCase() === "PROD" ? "PROD" : "BETA",
        },
      },
    };
  }
  return {
    auth: { provider: "privy" },
    providers: { privy: { appId: auth.appId } },
  };
}

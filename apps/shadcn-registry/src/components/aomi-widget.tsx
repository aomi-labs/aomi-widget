"use client";

import type { CSSProperties, ReactNode } from "react";
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
      provider: "para" | "privy";
      environment: string;
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
            environment: props.auth.environment,
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
}: WidgetFrameProps) {
  const walletKit = useAomiWalletKit();
  return (
    <BackendAaProvider
      value={{ apiUrl, getAccountBearer: walletKit.getAccountBearer }}
    >
      <AomiFrame.Root
        key={walletKit.accountUser?.id ?? "anonymous"}
        backendUrl={apiUrl}
        applicationId={applicationId}
        accountSessionAvailable={Boolean(walletKit.accountUser)}
        clientOptions={{
          ...clientOptions,
          getAccountBearer: walletKit.getAccountBearer,
        }}
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

function resolveWidgetAuth(auth: CrossOriginWidgetAuth): {
  auth: AuthConfig;
  providers?: ProvidersConfig;
} {
  if (auth.kind === "browser_wallet") return { auth: false };
  return {
    auth: { provider: auth.provider },
    providers:
      auth.provider === "para"
        ? {
            para: {
              environment:
                auth.environment.toUpperCase() === "PROD" ? "PROD" : "BETA",
            },
          }
        : { privy: {} },
  };
}

"use client";

import type { CSSProperties, ReactNode } from "react";
import type { AomiClientOptions } from "@aomi-labs/react";
import { AomiFrame, type AomiFrameControlBarProps } from "./aomi-frame";
import { AomiWalletKitProvider, useAomiWalletKit } from "../lib/wallet-kit";
import type {
  AccountConfig,
  AomiWidgetAuthConfig,
  AuthConfig,
  ExecutionConfig,
  ProvidersConfig,
  WalletsConfig,
} from "../lib/wallet-kit/config/types";

export type { AomiWidgetAuthConfig } from "../lib/wallet-kit/config/types";

export type AomiWidgetProps = {
  children?: ReactNode;
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
  auth?: AomiWidgetAuthConfig;
  providers?: ProvidersConfig;
  wallets?: WalletsConfig;
  execution?: ExecutionConfig;
  account?: AccountConfig;
};

export function AomiWidget(props: AomiWidgetProps) {
  const resolvedApiUrl = props.apiUrl.replace(/\/+$/, "");
  const resolved = resolveWidgetAuth(props.auth, props.providers);
  const account =
    props.account === undefined
      ? {
          mode: "aomi-backend" as const,
          baseUrl: resolvedApiUrl,
          widgetAuth: props.auth
            ? {
                mode: "provider" as const,
                provider: props.auth.provider,
                environment: props.auth.environment,
              }
            : { mode: "wallet" as const },
        }
      : props.account;

  return (
    <AomiWalletKitProvider
      auth={resolved.auth}
      providers={resolved.providers}
      wallets={props.wallets}
      execution={
        props.execution ?? {
          aa: "optional",
          provider: "auto",
          modes: ["4337"],
          owner: "external-wallet",
        }
      }
      account={account}
    >
      <WidgetFrame {...props} apiUrl={resolvedApiUrl} />
      {props.children}
    </AomiWalletKitProvider>
  );
}

function WidgetFrame({
  apiUrl,
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
}: AomiWidgetProps) {
  const walletKit = useAomiWalletKit();
  return (
    <AomiFrame.Root
      backendUrl={apiUrl}
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
  );
}

function resolveWidgetAuth(
  auth: AomiWidgetAuthConfig | undefined,
  providers: ProvidersConfig | undefined,
): { auth: AuthConfig; providers?: ProvidersConfig } {
  if (!auth) return { auth: false, providers };
  return {
    auth: { provider: auth.provider, methods: auth.methods },
    providers: { ...providers, ...auth.providers },
  };
}

"use client";

import type { CSSProperties } from "react";
import type { AomiClientOptions } from "@aomi-labs/react";
import { AomiFrame, type AomiFrameControlBarProps } from "./aomi-frame";
import { AomiWalletKitProvider } from "../lib/wallet-kit/config";
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
  /** Portal/BFF URL used for auth, accounts, threads, and chat traffic. */
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
  clientOptions?: Omit<AomiClientOptions, "baseUrl">;
  persistThread?: boolean;
  threadPersistenceKey?: string;
  threadPersistenceScope?: string | null;
  /** Provider auth is optional; omit it for external-wallet/SIWE-only use. */
  auth?: AomiWidgetAuthConfig;
  providers?: ProvidersConfig;
  wallets?: WalletsConfig;
  execution?: ExecutionConfig;
  account?: AccountConfig;
};

/**
 * Complete Aomi chat widget with wallet/auth defaults.
 *
 * Choose provider auth with a lightweight helper such as `paraAuth(...)` or
 * `privyAuth(...)`, or omit it for an external-wallet/SIWE-only integration.
 */
export function AomiWidget({
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
  auth,
  providers,
  wallets,
  execution,
  account,
}: AomiWidgetProps) {
  const resolvedApiUrl = apiUrl.replace(/\/+$/, "");
  const resolved = resolveWidgetAuth(auth, providers);

  return (
    <AomiWalletKitProvider
      auth={resolved.auth}
      providers={resolved.providers}
      wallets={wallets}
      execution={
        execution ?? {
          aa: "optional",
          provider: "auto",
          modes: ["4337"],
          owner: "external-wallet",
        }
      }
      account={
        account === undefined
          ? { mode: "aomi-backend", baseUrl: resolvedApiUrl }
          : account
      }
    >
      <AomiFrame.Root
        backendUrl={resolvedApiUrl}
        clientOptions={{ credentials: "include", ...clientOptions }}
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
    </AomiWalletKitProvider>
  );
}

function resolveWidgetAuth(
  auth: AomiWidgetAuthConfig | undefined,
  providers: ProvidersConfig | undefined,
): {
  auth: AuthConfig;
  providers?: ProvidersConfig;
} {
  if (!auth) {
    return {
      auth: false as const,
      providers,
    };
  }
  return {
    auth: { provider: auth.provider, methods: auth.methods },
    providers: { ...providers, ...auth.providers },
  };
}

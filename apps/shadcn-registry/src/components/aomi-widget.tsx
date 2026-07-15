"use client";

import {
  createWidgetSessionProvider,
  type AomiClientOptions,
} from "@aomi-labs/client";
import { useMemo, type CSSProperties } from "react";
import { AomiFrame, type AomiFrameControlBarProps } from "./aomi-frame";
import { useAomiWalletKit } from "../lib/wallet-kit/context";
import { AomiWalletKitProvider } from "../lib/wallet-kit/config";
import type {
  ExecutionConfig,
  WalletsConfig,
} from "../lib/wallet-kit/config/types";

type WidgetClientOptions = Omit<
  AomiClientOptions,
  "authorization" | "baseUrl" | "credentials" | "getAccountBearer"
>;

export type AomiWidgetProps = {
  /** Aomi Portal/BFF URL. The browser never talks to the Rust backend directly. */
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
  clientOptions?: WidgetClientOptions;
  persistThread?: boolean;
  threadPersistenceKey?: string;
  threadPersistenceScope?: string | null;
  wallets?: WalletsConfig;
  execution?: ExecutionConfig;
};

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
  wallets,
  execution,
}: AomiWidgetProps) {
  return (
    <AomiWalletKitProvider
      auth={false}
      wallets={wallets}
      execution={execution ?? defaultExecution}
      account={false}
    >
      <WidgetFrame
        apiUrl={apiUrl}
        width={width}
        height={height}
        className={className}
        style={style}
        walletPosition={walletPosition}
        walletFamilies={walletFamilies}
        showSidebar={showSidebar}
        showHeader={showHeader}
        controlBarProps={controlBarProps}
        clientOptions={clientOptions}
        persistThread={persistThread}
        threadPersistenceKey={threadPersistenceKey}
        threadPersistenceScope={threadPersistenceScope}
      />
    </AomiWalletKitProvider>
  );
}

type WidgetFrameProps = Omit<AomiWidgetProps, "execution" | "wallets">;

function WidgetFrame({
  apiUrl,
  width,
  height,
  className,
  style,
  walletPosition,
  walletFamilies,
  showSidebar,
  showHeader,
  controlBarProps,
  clientOptions,
  persistThread,
  threadPersistenceKey,
  threadPersistenceScope,
}: WidgetFrameProps) {
  const wallet = useAomiWalletKit();
  const address = wallet.identity.address;
  const chainId = wallet.identity.chainId;
  const walletKind = wallet.identity.walletKind;
  const walletSource = wallet.identity.walletSource;
  const signMessage = wallet.signMessage;
  const resolvedApiUrl = apiUrl.replace(/\/+$/, "");
  const widgetSession = useMemo(
    () =>
      createWidgetSessionProvider({
        baseUrl: resolvedApiUrl,
        getSigner: async () => {
          if (walletKind === "smart-account") {
            throw new Error("Smart-account widget SIWE is not supported yet");
          }
          if (walletSource === "embedded") {
            throw new Error("Embedded-wallet widget auth is not supported yet");
          }
          if (!address || !chainId || !signMessage) {
            throw new Error("Connect an EVM wallet before authenticating");
          }
          return {
            address,
            chainId,
            signMessage: async (message) =>
              (await signMessage({ non_typed_data: message })).signature,
          };
        },
      }),
    [address, chainId, resolvedApiUrl, signMessage, walletKind, walletSource],
  );
  const runtimeOptions = useMemo<Omit<AomiClientOptions, "baseUrl">>(
    () => ({
      ...clientOptions,
      authorization: widgetSession,
      credentials: "omit",
    }),
    [clientOptions, widgetSession],
  );

  return (
    <AomiFrame.Root
      backendUrl={resolvedApiUrl}
      clientOptions={runtimeOptions}
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

const defaultExecution: ExecutionConfig = {
  aa: "optional",
  provider: "auto",
  modes: ["4337"],
  owner: "external-wallet",
};

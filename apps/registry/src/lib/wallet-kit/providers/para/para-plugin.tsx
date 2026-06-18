"use client";

import { useMemo, type ReactNode } from "react";
import {
  Environment,
  ParaProvider,
  type TOAuthMethod,
} from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import type {
  AuthConfig,
  AuthMethodId,
  ProvidersConfig,
} from "../../config/types";
import {
  registerWalletProvider,
  type WalletProviderPlugin,
} from "../plugin-registry";
import { AomiParaPluginProvider } from "./ParaPluginProvider";
import { defaultOAuthMethods } from "./para-auth";

function toParaEnvironment(value?: "PROD" | "BETA") {
  if (!value) return Environment.BETA;
  return value === "PROD" ? Environment.PROD : Environment.BETA;
}

function toParaOAuthMethods(
  methods: readonly AuthMethodId[] | undefined,
): TOAuthMethod[] {
  if (!methods) return defaultOAuthMethods;
  const map = {
    google: "GOOGLE",
    apple: "APPLE",
    discord: "DISCORD",
    x: "TWITTER",
    farcaster: "FARCASTER",
    telegram: "TELEGRAM",
  } as const satisfies Partial<Record<AuthMethodId, TOAuthMethod>>;
  const resolved = methods
    .map((method) => map[method as keyof typeof map])
    .filter((method): method is NonNullable<typeof method> => Boolean(method));
  return resolved.length ? resolved : defaultOAuthMethods;
}

function isParaAuth(auth: AuthConfig | undefined): boolean {
  return auth !== false && auth?.provider === "para";
}

function ParaAuthLayer({
  auth,
  children,
  providers,
}: {
  auth?: AuthConfig;
  children: ReactNode;
  providers?: ProvidersConfig;
}) {
  const enabled = isParaAuth(auth);
  const para = providers?.para === false ? undefined : providers?.para;
  const apiKey = para?.apiKey ?? process.env.NEXT_PUBLIC_PARA_API_KEY;
  const paraClientConfig = useMemo(
    () =>
      apiKey
        ? {
            apiKey,
            env: toParaEnvironment(para?.environment),
          }
        : null,
    [apiKey, para?.environment],
  );
  const paraConfig = useMemo(
    () => ({ appName: para?.appName ?? "Aomi" }),
    [para?.appName],
  );
  const paraModalConfig = useMemo(
    () => ({
      disableEmailLogin: false,
      oAuthMethods: toParaOAuthMethods(
        enabled && auth !== false && auth?.provider === "para"
          ? auth.methods
          : undefined,
      ),
    }),
    [auth, enabled],
  );
  const externalWalletConfig = useMemo(
    () => ({
      appDescription: para?.appDescription ?? "Aomi widget",
      appUrl:
        para?.appUrl ??
        (typeof window !== "undefined"
          ? window.location.origin
          : "https://aomi.dev"),
      wallets: [],
      walletConnect: undefined,
    }),
    [para?.appDescription, para?.appUrl],
  );

  if (!enabled || !paraClientConfig) {
    return <>{children}</>;
  }

  return (
    <ParaProvider
      paraClientConfig={paraClientConfig}
      config={paraConfig}
      paraModalConfig={paraModalConfig}
      externalWalletConfig={externalWalletConfig}
    >
      {children}
    </ParaProvider>
  );
}

export const paraPlugin: WalletProviderPlugin = {
  id: "para",
  authMode: "additive",
  isAvailable: ({ auth, providers }) => {
    const enabled = isParaAuth(auth);
    const para = providers?.para === false ? undefined : providers?.para;
    return Boolean(
      enabled && (para?.apiKey ?? process.env.NEXT_PUBLIC_PARA_API_KEY),
    );
  },
  wrap: (props) => <ParaAuthLayer {...props} />,
  renderComposer: ({
    account,
    auth,
    children,
    execution,
    selectedSolanaNetwork,
    setSelectedSolanaNetworkId,
    solanaRuntimeConfig,
    supportedChains,
    supportedSolanaNetworks,
  }) => (
    <AomiParaPluginProvider
      account={account}
      execution={execution}
      oAuthMethods={toParaOAuthMethods(
        auth !== false && auth?.provider === "para" ? auth.methods : undefined,
      )}
      selectedSolanaNetwork={selectedSolanaNetwork}
      setSelectedSolanaNetworkId={setSelectedSolanaNetworkId}
      supportedChains={supportedChains}
      supportedSolanaNetworks={supportedSolanaNetworks}
      svmConfig={solanaRuntimeConfig}
    >
      {children}
    </AomiParaPluginProvider>
  ),
  detectSugar: (input) => {
    if (
      input.auth !== false &&
      input.auth?.provider === "para" &&
      "apiKey" in input.auth
    ) {
      return {
        children: input.children,
        providers: {
          para: {
            apiKey: input.auth.apiKey,
            environment: input.auth.environment,
            appName: input.auth.appName,
            appDescription: input.auth.appDescription,
          },
        },
        auth: { provider: "para", methods: input.auth.methods },
      };
    }
    return null;
  },
};

export function registerAomiParaWalletProvider(): void {
  registerWalletProvider(paraPlugin);
}

registerAomiParaWalletProvider();

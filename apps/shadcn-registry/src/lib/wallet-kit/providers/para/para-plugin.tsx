"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

const PARA_STARTUP_TIMEOUT_MS = 4_000;

function ParaReadyChildren({
  children,
  onReady,
}: {
  children: ReactNode;
  onReady: () => void;
}) {
  useEffect(onReady, [onReady]);
  return <>{children}</>;
}

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
  const [startupAttempt, setStartupAttempt] = useState(0);
  const [startupTimedOut, setStartupTimedOut] = useState(false);
  const [providerReady, setProviderReady] = useState(false);
  const para = providers?.para === false ? undefined : providers?.para;
  const apiKey =
    para?.apiKey ??
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_PARA_API_KEY
      : undefined);
  const paraClientConfig = useMemo(
    () =>
      apiKey
        ? {
            apiKey,
            env: toParaEnvironment(para?.environment),
            opts: para?.disableWorkers ? { disableWorkers: true } : undefined,
          }
        : null,
    [apiKey, para?.disableWorkers, para?.environment],
  );
  const paraConfig = useMemo(
    () => ({
      appName: para?.appName ?? "Aomi",
      disableAutoSessionKeepAlive: true,
    }),
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
  const markProviderReady = useCallback(() => {
    setProviderReady(true);
    setStartupTimedOut(false);
  }, []);
  useEffect(() => {
    if (!enabled || !paraClientConfig) return;
    setProviderReady(false);
    setStartupTimedOut(false);
    const timeout = window.setTimeout(
      () => setStartupTimedOut(true),
      PARA_STARTUP_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [enabled, paraClientConfig, startupAttempt]);

  if (!enabled || !paraClientConfig) {
    return <>{children}</>;
  }

  if (startupTimedOut && !providerReady) {
    return (
      <>
        <div
          role="alert"
          style={{
            alignItems: "center",
            background: "#2a1818",
            border: "1px solid #713838",
            borderRadius: 8,
            color: "#ffd5d5",
            display: "flex",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontSize: 14,
            gap: 12,
            justifyContent: "space-between",
            marginBottom: 12,
            padding: "10px 12px",
          }}
        >
          <span>
            Para authentication could not start. Check the API key environment
            and allowed browser origin.
          </span>
          <button
            type="button"
            onClick={() => setStartupAttempt((attempt) => attempt + 1)}
            style={{
              background: "transparent",
              border: "1px solid currentColor",
              borderRadius: 6,
              color: "inherit",
              cursor: "pointer",
              padding: "6px 10px",
            }}
          >
            Retry
          </button>
        </div>
        {children}
      </>
    );
  }

  return (
    <ParaProvider
      key={startupAttempt}
      paraClientConfig={paraClientConfig}
      config={paraConfig}
      paraModalConfig={paraModalConfig}
      externalWalletConfig={externalWalletConfig}
    >
      <ParaReadyChildren onReady={markProviderReady}>
        {children}
      </ParaReadyChildren>
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
      enabled &&
      (para?.apiKey ??
        (typeof process !== "undefined"
          ? process.env.NEXT_PUBLIC_PARA_API_KEY
          : undefined)),
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
            disableWorkers: input.auth.disableWorkers,
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

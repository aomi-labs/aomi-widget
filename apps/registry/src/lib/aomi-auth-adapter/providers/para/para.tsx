"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Environment,
  ParaProvider,
  useAccount as useParaAccount,
  useClient as useParaClient,
  useIssueJwt,
  useLogout,
  useModal,
  type TExternalWallet,
  type TOAuthMethod,
} from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Chain, Transport } from "viem";
import {
  arbitrum,
  base,
  linea,
  lineaSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from "wagmi/chains";
import { ExtUserProvider } from "@aomi-labs/react";
import { monad, monadTestnet } from "@aomi-labs/client";
import type ParaWeb from "@getpara/react-sdk";
import { AomiAdapterComposer } from "../../composer/AomiAdapterComposer";
import type {
  AuthRuntime,
  ExecutionRuntime,
  SolanaWalletRuntime,
} from "../../composer/types";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../../network-preferences";
import { inferAuthMethod } from "../../identity";
import {
  FullTestnetWalletRouter,
  useFullTestnet,
} from "../../full-testnet-wallet-routing";
import {
  useEvmWalletRuntime,
  type EvmWalletRuntimeProviderHooks,
} from "../../runtime/evm/wallet-runtime";
import {
  canonicalWalletKey,
  toSocialLoginOption,
} from "../../runtime/evm/brands";
import { walletDebug } from "../../wallet-debug";
import type {
  AomiAccount,
  AomiAccountCredential,
  AomiAuthMethod,
} from "../../types";
import { resolveParaAAProviderState, resolveParaSponsorship } from "./para-aa";
import {
  AomiParaEvmRuntimeProvider,
  type AomiParaEvmRuntimeConfig,
} from "./para-evm-runtime";
import {
  DEFAULT_SOLANA_CLUSTER,
  normalizeSolanaNetworkOptions,
} from "../../runtime/solana/networks";
import { REGISTRY_STORAGE_KEY } from "../../registry/types";
import { useParaSessionSource } from "./sources/para-session-source";
import { useSolanaRegistrySource } from "../../runtime/solana/registry-source";
import {
  connectPreferredSolanaWallet,
  DEFAULT_SOLANA_ENDPOINT,
  ParaSolanaWrapper,
  resolveParaSolanaConfig,
  useSafeSolanaWallet,
  type ParaSolanaOptions,
  type ResolvedSolanaConfig,
} from "./para-sol";

type AdapterSolanaRuntimeConfig = Pick<
  ResolvedSolanaConfig,
  "cluster" | "rpcHttpUrl" | "rpcWsUrl" | "preferDirectSend"
>;

type ParaAccountShape = {
  isLoading: boolean;
  isConnected: boolean;
  embedded: {
    email?: string;
    farcasterUsername?: string;
    telegramUserId?: string;
    authMethods?: Set<unknown>;
    wallets?: Array<{ address?: string }>;
  };
  external: {
    evm?: {
      address?: string;
      chainId?: number | string;
    };
  };
};

export type AomiParaProviderProps = {
  children: ReactNode;
  appName?: string;
  appDescription?: string;
  appUrl?: string;
  apiKey?: string;
  environment?: Environment;
  networks?: readonly [Chain, ...Chain[]];
  walletConnectProjectId?: string;
  externalWallets?: TExternalWallet[];
  oAuthMethods?: TOAuthMethod[];
  solana?: ParaSolanaOptions;
};

const DISCONNECTED_PARA_ACCOUNT: ParaAccountShape = {
  isLoading: false,
  isConnected: false,
  embedded: {},
  external: {},
};
const defaultNetworks = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
  monad,
  monadTestnet,
] as const;

const defaultExternalWallets: TExternalWallet[] = [
  "WALLETCONNECT",
  "METAMASK",
  "COINBASE",
  "RAINBOW",
  "RABBY",
];

// Shared default so the fallback keeps a stable identity across renders —
// a fresh array per render would churn memos keyed on `oAuthMethods`.
const defaultOAuthMethods: TOAuthMethod[] = ["GOOGLE"];

function useSafeParaAccount(): ParaAccountShape {
  try {
    return useParaAccount() as ParaAccountShape;
  } catch {
    return DISCONNECTED_PARA_ACCOUNT;
  }
}

function useSafeParaModal(): {
  openModal: (args?: { step?: string }) => void;
} | null {
  try {
    return useModal() as { openModal: (args?: { step?: string }) => void };
  } catch {
    return null;
  }
}

function useSafeParaClient(): ParaWeb | null {
  try {
    return useParaClient() ?? null;
  } catch {
    return null;
  }
}

function useSafeIssueJwt():
  | (() => Promise<AomiAccountCredential | null>)
  | null {
  try {
    const { issueJwtAsync } = useIssueJwt();
    return async () => {
      const result = await issueJwtAsync();
      const token = result?.token?.trim();
      return token
        ? {
            provider: "para",
            providerToken: token,
          }
        : null;
    };
  } catch {
    return null;
  }
}

function useSafeLogout(): (() => Promise<void>) | null {
  try {
    const { logoutAsync } = useLogout();
    return async () => {
      await logoutAsync();
    };
  } catch {
    return null;
  }
}

export type AomiParaAdapterProviderProps = {
  children: ReactNode;
  supportedChains?: readonly Chain[];
  solanaConfig?: ResolvedSolanaConfig;
  oAuthMethods?: readonly TOAuthMethod[];
};

export function AomiParaAdapterProvider({
  children,
  supportedChains: configuredChains,
  solanaConfig,
  oAuthMethods = defaultOAuthMethods,
}: AomiParaAdapterProviderProps) {
  const paraAccount = useSafeParaAccount();
  const paraSession = useSafeParaClient();
  const issueJwt = useSafeIssueJwt();
  const paraLogout = useSafeLogout();
  const paraModal = useSafeParaModal();
  const solanaWallet = useSafeSolanaWallet();
  const logoutParaSession = useCallback(async () => {
    if (paraLogout) {
      try {
        walletDebug("para:logout", { via: "useLogout" });
        await paraLogout();
        walletDebug("para:logout", { result: "ok" });
        return;
      } catch (error) {
        walletDebug("para:logout", { failed: String(error) });
        console.warn("[aomi-auth-adapter] Para logout failed", error);
      }
    }

    const clientLogout = (
      paraSession as unknown as {
        logout?: (args?: unknown) => Promise<unknown>;
      } | null
    )?.logout;
    if (typeof clientLogout !== "function") {
      walletDebug("para:logout", {
        skip: paraLogout ? "hook-failed-no-client-fallback" : "no-path",
      });
      return;
    }
    try {
      walletDebug("para:logout", { via: "client" });
      await clientLogout.call(paraSession);
      walletDebug("para:logout", { result: "ok" });
    } catch (error) {
      walletDebug("para:logout", { failed: String(error) });
      console.warn("[aomi-auth-adapter] Para logout failed", error);
    }
  }, [paraLogout, paraSession]);
  const {
    selectedEvmChainId,
    selectedSolanaNetwork,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks,
  } = useAomiWalletNetworkPreferences();
  const resolvedAdapterSolanaConfig = useMemo<AdapterSolanaRuntimeConfig>(
    () => ({
      cluster: solanaConfig?.cluster ?? DEFAULT_SOLANA_CLUSTER,
      rpcHttpUrl:
        solanaConfig?.rpcHttpUrl ??
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
        DEFAULT_SOLANA_ENDPOINT,
      rpcWsUrl:
        solanaConfig?.rpcWsUrl ??
        process.env.NEXT_PUBLIC_SOLANA_RPC_WS_URL ??
        undefined,
      preferDirectSend: solanaConfig?.preferDirectSend ?? true,
    }),
    [solanaConfig],
  );
  const providerHooks = useMemo<EvmWalletRuntimeProviderHooks>(
    () => ({
      providerLogout: logoutParaSession,
      isProviderInternalConnector: (connector) =>
        connector.id === "para" ||
        canonicalWalletKey(connector.name ?? "") === "para",
      onProviderReconnectRequested: (store) => {
        store.dispatch({
          type: "user/para-reconnect-requested",
          now: Date.now(),
        });
      },
      onConnectFallback: (store) => {
        store.dispatch({
          type: "para/auth-flow-started",
          reason: "para-evm-connect-fallback",
          now: Date.now(),
        });
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      onAccountDisconnectPlanned: (disconnectPlan) => {
        if (
          disconnectPlan.isParaAccount &&
          disconnectPlan.otherConnectionsRemain
        ) {
          walletDebug("para:detach", {
            address: disconnectPlan.targetAddress,
            reason: "preserve-external-wallets",
          });
        }
      },
    }),
    [logoutParaSession, paraModal],
  );
  const evmRuntime = useEvmWalletRuntime({
    configuredChains,
    selectedEvmChainId,
    setSelectedEvmChainId,
    storageKey: REGISTRY_STORAGE_KEY,
    providerHooks,
  });
  const { registryStore, registryState } = evmRuntime;
  useParaSessionSource(registryStore, { paraAccount });
  useSolanaRegistrySource(registryStore, { solanaWallet });
  const startParaAuthFlow = useCallback(
    (reason: string) => {
      registryStore.dispatch({
        type: "para/auth-flow-started",
        reason,
        now: Date.now(),
      });
    },
    [registryStore],
  );
  const registryDetachedParaAddresses = registryState.intents.paraDetached
    ? registryState.intents.droppedAddresses
    : [];
  const paraSessionLocallyDetached = Boolean(
    paraAccount.isConnected && registryState.intents.paraDetached,
  );
  const exposeParaSession = Boolean(
    paraAccount.isConnected && !paraSessionLocallyDetached,
  );
  const embeddedPrimary = exposeParaSession
    ? (paraAccount.embedded.email ??
      paraAccount.embedded.farcasterUsername ??
      paraAccount.embedded.telegramUserId ??
      undefined)
    : undefined;
  const paraAuthMethod = inferAuthMethod(paraAccount.embedded.authMethods);
  const authRuntime = useMemo<AuthRuntime>(
    () => ({
      provider: "para",
      status: paraAccount.isLoading
        ? "booting"
        : exposeParaSession
          ? "authenticated"
          : "unauthenticated",
      primaryLabel: embeddedPrimary,
      authMethod: embeddedPrimary ? paraAuthMethod : undefined,
      authValue: embeddedPrimary
        ? resolveParaAuthValue(paraAccount.embedded, paraAuthMethod)
        : undefined,
      methods: paraModal
        ? Array.from(oAuthMethods).map(toSocialLoginOption)
        : [],
      canOpenModal: Boolean(paraModal),
      startFlow: startParaAuthFlow,
      login: async (reason: string, step = "AUTH_MAIN") => {
        registryStore.dispatch({
          type: "user/para-reconnect-requested",
          now: Date.now(),
        });
        startParaAuthFlow(reason);
        paraModal?.openModal({ step });
      },
      openAccountUI: async (reason: string, step = "ACCOUNT_MAIN") => {
        startParaAuthFlow(reason);
        paraModal?.openModal({ step });
      },
      getCredential: exposeParaSession ? (issueJwt ?? undefined) : undefined,
    }),
    [
      embeddedPrimary,
      exposeParaSession,
      issueJwt,
      oAuthMethods,
      paraAccount.embedded,
      paraAccount.isLoading,
      paraAuthMethod,
      paraModal,
      registryStore,
      startParaAuthFlow,
    ],
  );
  const solanaRuntime = useMemo<SolanaWalletRuntime>(
    () => ({
      wallet: solanaWallet,
      config: resolvedAdapterSolanaConfig,
      supportedNetworks: supportedSolanaNetworks,
      selectedNetwork: selectedSolanaNetwork,
      setSelectedNetworkId: setSelectedSolanaNetworkId,
    }),
    [
      resolvedAdapterSolanaConfig,
      selectedSolanaNetwork,
      setSelectedSolanaNetworkId,
      solanaWallet,
      supportedSolanaNetworks,
    ],
  );
  const transformEvmIdentity = useCallback(
    (identity: ReturnType<typeof evmRuntime.selectEvmIdentity>) => {
      if (
        paraSessionLocallyDetached &&
        identity.address &&
        registryDetachedParaAddresses.includes(identity.address.toLowerCase())
      ) {
        return {};
      }
      return identity;
    },
    [paraSessionLocallyDetached, registryDetachedParaAddresses],
  );
  const transformAccounts = useCallback(
    (accounts: AomiAccount[]) =>
      accounts.filter((account) => {
        if (!paraSessionLocallyDetached) return true;
        if (account.family !== "evm") return true;
        const address = account.address.toLowerCase();
        if (registryDetachedParaAddresses.includes(address)) return false;
        return canonicalWalletKey(account.walletName ?? "") !== "para";
      }),
    [paraSessionLocallyDetached, registryDetachedParaAddresses],
  );
  const canManageParaAccount = useCallback(
    (account: AomiAccount) =>
      Boolean(paraModal) &&
      exposeParaSession &&
      canonicalWalletKey(account.walletName ?? "") === "para",
    [exposeParaSession, paraModal],
  );
  const sponsorship = useMemo(() => resolveParaSponsorship(), []);
  const executionRuntime = useMemo<ExecutionRuntime>(
    () => ({
      sponsorship,
      evm: {
        activeConnector: evmRuntime.activeConnector,
        capabilities: evmRuntime.capabilities,
        chainsById: evmRuntime.chainsById,
        currentChainId: evmRuntime.activeEvmConnection?.chainId,
        getWalletClientFor: evmRuntime.getWalletClientFor,
        sendCallsSyncAsync: evmRuntime.sendCallsSyncAsync,
        sendTransactionAsync: evmRuntime.sendTransactionAsync,
        shouldUseExternalSigner: evmRuntime.shouldUseExternalSigner,
        signMessageAsync: evmRuntime.signMessageAsync,
        signTypedDataAsync: evmRuntime.signTypedDataAsync,
        switchChainAsync: evmRuntime.switchChainAsync,
        walletClient: evmRuntime.walletClient,
        resolveAAProviderState: async (params, context) =>
          resolveParaAAProviderState({
            ...params,
            paraSession,
            walletClient: context.walletClient,
            address: context.address,
          }),
      },
    }),
    [evmRuntime, paraSession, sponsorship],
  );

  return (
    <AomiAdapterComposer
      auth={authRuntime}
      evm={evmRuntime}
      solana={solanaRuntime}
      execution={executionRuntime}
      transformEvmIdentity={transformEvmIdentity}
      transformAccounts={transformAccounts}
      canManageAccount={canManageParaAccount}
      supportedChains={evmRuntime.supportedChains}
    >
      {children}
    </AomiAdapterComposer>
  );
}

function AomiParaProviderInner({
  children,
  appName = "Aomi",
  appDescription = "Aomi widget",
  appUrl,
  apiKey = process.env.NEXT_PUBLIC_PARA_API_KEY,
  environment = (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as
    | Environment
    | undefined) ?? Environment.BETA,
  networks = defaultNetworks,
  walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ??
    process.env.NEXT_PUBLIC_PROJECT_ID,
  externalWallets = defaultExternalWallets,
  oAuthMethods = defaultOAuthMethods,
  solana,
}: AomiParaProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const routing = useFullTestnet(networks);
  const { selectedSolanaNetworkId } = useAomiWalletNetworkPreferences();
  // Everything handed to <ParaProvider> must keep a stable identity across
  // re-renders (we re-render on every network-preference change). Para's SDK
  // compares these props by reference and on change pushes them into its
  // store, where a new `wallets` array makes @getpara/evm-wallet-connectors
  // rebuild the wagmi config from scratch — dropping every in-memory wallet
  // connection. That is what froze/flashed the wallet UI after an EVM
  // network switch.
  const resolvedWallets = useMemo(
    () =>
      walletConnectProjectId
        ? externalWallets
        : externalWallets.filter((wallet) => wallet !== "WALLETCONNECT"),
    [externalWallets, walletConnectProjectId],
  );
  const paraClientConfig = useMemo(
    () => (apiKey ? { apiKey, env: environment } : null),
    [apiKey, environment],
  );
  const paraConfig = useMemo(() => ({ appName }), [appName]);
  const resolvedSolanaConfig = useMemo(
    () => resolveParaSolanaConfig(solana, selectedSolanaNetworkId),
    [selectedSolanaNetworkId, solana],
  );
  const transports = useMemo(
    () => routing.transports as Record<number, Transport>,
    [routing.transports],
  );
  const paraModalConfig = useMemo(
    () => ({
      disableEmailLogin: false,
      oAuthMethods,
    }),
    [oAuthMethods],
  );
  const paraExternalWalletConfig = useMemo(
    () => ({
      appDescription,
      appUrl:
        appUrl ??
        (typeof window !== "undefined"
          ? window.location.origin
          : "https://aomi.dev"),
      wallets: [] as TExternalWallet[],
    }),
    [appDescription, appUrl],
  );
  const evmRuntimeConfig = useMemo(
    () =>
      ({
        appName,
        appDescription,
        appUrl:
          appUrl ??
          (typeof window !== "undefined"
            ? window.location.origin
            : "https://aomi.dev"),
        wallets: resolvedWallets,
        projectId: walletConnectProjectId ?? "",
        chains: routing.routedChains,
        transports,
        ssr: true,
      }) satisfies AomiParaEvmRuntimeConfig,
    [
      appName,
      appDescription,
      appUrl,
      routing.routedChains,
      resolvedWallets,
      transports,
      walletConnectProjectId,
    ],
  );

  // Solana branch: opt out via `solana.enabled = false` or an empty
  // `solana.wallets` list. When opted out, `useSolanaWallet` inside the
  // adapter throws (no <WalletProvider> mounted) and the safe wrapper
  // returns "no Solana".
  const solanaEnabled =
    resolvedSolanaConfig.enabled && resolvedSolanaConfig.wallets.length > 0;

  const solanaProviderConfig = useMemo(
    () =>
      ({
        wallets: resolvedSolanaConfig.wallets,
        endpoint: resolvedSolanaConfig.rpcHttpUrl,
        chain: resolvedSolanaConfig.mobileChain,
        appIdentity: {
          name: appName,
          uri: appUrl,
        },
      }) satisfies {
        wallets: typeof resolvedSolanaConfig.wallets;
        endpoint: string;
        chain: typeof resolvedSolanaConfig.mobileChain;
        appIdentity: {
          name: string;
          uri: string | undefined;
        };
      },
    [
      appName,
      appUrl,
      resolvedSolanaConfig.mobileChain,
      resolvedSolanaConfig.rpcHttpUrl,
      resolvedSolanaConfig.wallets,
    ],
  );

  return (
    <ExtUserProvider>
      <QueryClientProvider client={queryClient}>
        {paraClientConfig ? (
          <ParaProvider
            paraClientConfig={paraClientConfig}
            config={paraConfig}
            paraModalConfig={paraModalConfig}
            externalWalletConfig={paraExternalWalletConfig}
          >
            {/* The adapter renders in BOTH wrapper states (the wrapper only
                adds the Solana context when Para's client is ready) — it must
                never unmount when the client blips during logout/re-init, or
                all connection-recovery state is lost mid-session. The safe
                Solana hooks already degrade when the context is absent. */}
            <AomiParaEvmRuntimeProvider config={evmRuntimeConfig}>
              <ParaSolanaWrapper
                key={resolvedSolanaConfig.activeNetwork.id}
                enabled={solanaEnabled}
                config={solanaProviderConfig}
              >
                <FullTestnetWalletRouter
                  enabled={routing.enabled}
                  chains={routing.routedChains}
                  routedChainIds={routing.routedChainIds}
                >
                  <AomiParaAdapterProvider
                    supportedChains={routing.routedChains}
                    solanaConfig={resolvedSolanaConfig}
                    oAuthMethods={oAuthMethods}
                  >
                    {children}
                  </AomiParaAdapterProvider>
                </FullTestnetWalletRouter>
              </ParaSolanaWrapper>
            </AomiParaEvmRuntimeProvider>
          </ParaProvider>
        ) : (
          <FullTestnetWalletRouter
            enabled={routing.enabled}
            chains={routing.routedChains}
            routedChainIds={routing.routedChainIds}
          >
            <AomiParaAdapterProvider
              supportedChains={routing.routedChains}
              solanaConfig={resolvedSolanaConfig}
              oAuthMethods={oAuthMethods}
            >
              {children}
            </AomiParaAdapterProvider>
          </FullTestnetWalletRouter>
        )}
      </QueryClientProvider>
    </ExtUserProvider>
  );
}

function resolveParaAuthValue(
  embedded: ParaAccountShape["embedded"],
  authMethod: AomiAuthMethod | undefined,
): string | undefined {
  if (authMethod === "telegram") {
    return embedded.telegramUserId;
  }
  if (authMethod === "farcaster") {
    return embedded.farcasterUsername;
  }
  if (!authMethod || authMethod === "wagmi") {
    return undefined;
  }
  return embedded.email;
}

export function AomiParaProvider(props: AomiParaProviderProps) {
  const supportedSolanaNetworks = useMemo(
    () => normalizeSolanaNetworkOptions(props.solana),
    [props.solana],
  );

  return (
    <AomiWalletNetworkPreferencesProvider
      evmChains={props.networks ?? defaultNetworks}
      solanaNetworks={supportedSolanaNetworks}
      storageKey="para"
    >
      <AomiParaProviderInner {...props} />
    </AomiWalletNetworkPreferencesProvider>
  );
}

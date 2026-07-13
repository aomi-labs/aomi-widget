"use client";
"use client";
import {
  AomiWalletKitProvider
} from "../chunk-JUSFHFWL.js";
import {
  useEmbeddedSessionSource
} from "../chunk-WXEXQKWP.js";
import {
  AomiWalletKitComposer,
  DEFAULT_SVM_CLUSTER,
  DEFAULT_SVM_ENDPOINT,
  REGISTRY_STORAGE_KEY,
  buildEvmExecutionRuntime,
  canonicalWalletKey,
  inferAuthMethod,
  publicEnv,
  registerWalletBrand,
  registerWalletProvider,
  resolveAAProviderState,
  resolveAASponsorship,
  toSocialLoginOption,
  useAomiWalletNetworkPreferences,
  useEvmWalletRuntime,
  useResolvedAccountRuntime,
  useSafeSvmWallet,
  useSvmWalletRuntime,
  walletDebug
} from "../chunk-3GP4B2BE.js";

// src/lib/wallet-kit/providers/para/index.ts
import { createElement } from "react";

// src/lib/wallet-kit/providers/para/ParaPluginProvider.tsx
import { useCallback, useMemo as useMemo2 } from "react";
import {
  hashMessage,
  parseSignature,
  serializeSignature
} from "viem";

// src/lib/wallet-kit/providers/para/para-brand.ts
var PARA_BRAND_KEY = "para";
registerWalletBrand({ key: PARA_BRAND_KEY, matchers: ["para"] });

// src/lib/wallet-kit/providers/para/sources/para-session-source.ts
import { useEffect, useMemo, useRef } from "react";
function normalizeChainId(value) {
  if (value === void 0) return null;
  const chainId = typeof value === "string" && /^0x/i.test(value) ? Number.parseInt(value, 16) : Number(value);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : null;
}
function walletType(wallet) {
  return (wallet.type ?? wallet.walletType ?? "").toUpperCase();
}
function isExternalEmbeddedWallet(wallet) {
  return wallet.isExternal === true;
}
function isEvmEmbeddedWallet(wallet) {
  const type = walletType(wallet);
  return type === "EVM" || type === "ETHEREUM" || Boolean(wallet.chainId) || /^0x[0-9a-fA-F]{40}$/.test(wallet.address ?? "");
}
function isSolanaEmbeddedWallet(wallet) {
  const type = walletType(wallet);
  return type === "SOLANA" || type === "SVM";
}
function toSolanaAddress(value) {
  if (typeof value === "string") {
    return value.trim() || null;
  }
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value;
  const encoded = typeof record.toBase58 === "function" ? record.toBase58() : typeof record.toString === "function" ? record.toString() : "";
  return encoded.trim() || null;
}
function useParaSessionSource(store, opts) {
  const embeddedWallets = opts.paraAccount.embedded.wallets?.filter(
    (wallet) => !isExternalEmbeddedWallet(wallet)
  ) ?? [];
  const embeddedEvmWallet = embeddedWallets.find(isEvmEmbeddedWallet);
  const embeddedSolanaWallet = embeddedWallets.find(isSolanaEmbeddedWallet);
  const embeddedEvmAddress = opts.paraAccount.external.evm?.address ?? embeddedEvmWallet?.address ?? null;
  const embeddedSolanaAddress = embeddedSolanaWallet?.address ?? toSolanaAddress(opts.paraAccount.external.solana?.publicKey) ?? toSolanaAddress(opts.paraAccount.external.solana?.address);
  const chainId = normalizeChainId(opts.paraAccount.external.evm?.chainId) ?? normalizeChainId(embeddedEvmWallet?.chainId);
  const snapshotKey = useMemo(
    () => `${opts.paraAccount.isConnected ? "up" : "down"}:${embeddedSolanaAddress ?? ""}:${embeddedSolanaWallet?.id ?? ""}`,
    [
      embeddedSolanaAddress,
      embeddedSolanaWallet?.id,
      opts.paraAccount.isConnected
    ]
  );
  const previousKeyRef = useRef(null);
  useEmbeddedSessionSource(store, {
    up: opts.paraAccount.isConnected,
    providerId: "para",
    uid: "para-session",
    stableId: "para",
    walletName: "Para",
    embeddedEvmAddress,
    chainId
  });
  useEffect(() => {
    if (previousKeyRef.current === snapshotKey) return;
    previousKeyRef.current = snapshotKey;
    store.dispatch({
      type: "svm/changed",
      publicKey: opts.paraAccount.isConnected && embeddedSolanaAddress ? embeddedSolanaAddress : null,
      uid: "para-solana-session",
      stableId: "para",
      kind: "embedded-session",
      providerId: "para",
      walletName: "Para",
      now: Date.now()
    });
  }, [embeddedSolanaAddress, opts.paraAccount.isConnected, snapshotKey, store]);
}

// src/lib/wallet-kit/providers/para/para-embedded-wallet.ts
function isParaEmbeddedAccount(account) {
  return canonicalWalletKey(
    `${account.id} ${account.walletName ?? ""} ${account.connectorIds?.join(" ") ?? ""}`
  ) === PARA_BRAND_KEY;
}

// src/lib/wallet-kit/providers/para/para-auth.ts
import {
  useAccount as useParaAccount,
  useClient as useParaClient,
  useIssueJwt,
  useLogout,
  useModal
} from "@getpara/react-sdk";
var DISCONNECTED_PARA_ACCOUNT = {
  isLoading: false,
  isConnected: false,
  embedded: {},
  external: {}
};
var defaultOAuthMethods = ["GOOGLE"];
var ISSUE_JWT_FAILURE_COOLDOWN_MS = 3e4;
var issueJwtUnavailableUntil = 0;
var issueJwtInFlight = null;
function useSafeParaAccount() {
  try {
    return useParaAccount();
  } catch {
    return DISCONNECTED_PARA_ACCOUNT;
  }
}
function useSafeParaModal() {
  try {
    return useModal();
  } catch {
    return null;
  }
}
function useSafeParaClient() {
  try {
    return useParaClient() ?? null;
  } catch {
    return null;
  }
}
function useSafeIssueJwt() {
  try {
    const { issueJwtAsync } = useIssueJwt();
    return async () => {
      const now = Date.now();
      if (now < issueJwtUnavailableUntil) {
        return null;
      }
      if (issueJwtInFlight) {
        return issueJwtInFlight;
      }
      issueJwtInFlight = (async () => {
        let result;
        try {
          result = await issueJwtAsync({});
        } catch (error) {
          if (isParaJwtUnavailableError(error)) {
            issueJwtUnavailableUntil = Date.now() + ISSUE_JWT_FAILURE_COOLDOWN_MS;
            return null;
          }
          throw error;
        } finally {
          issueJwtInFlight = null;
        }
        const token = result?.token?.trim();
        return token ? {
          provider: "para",
          tokenKind: "session_jwt",
          providerToken: token,
          keyId: result?.keyId
        } : null;
      })();
      return issueJwtInFlight;
    };
  } catch {
    return null;
  }
}
function isParaJwtUnavailableError(error) {
  const candidate = error;
  const status = candidate?.status ?? candidate?.response?.status;
  if (status === 401 || status === 403) return true;
  const message = String(candidate?.message ?? "").toLowerCase();
  return candidate?.name === "ParaApiError" || message.includes("unknown error") || message.includes("network error") || message.includes("failed to fetch") || message.includes("cors");
}
function useSafeLogout() {
  try {
    const { logoutAsync } = useLogout();
    return async () => {
      await logoutAsync();
    };
  } catch {
    return null;
  }
}
function resolveParaAuthValue(embedded, authMethod) {
  if (authMethod === "telegram") {
    return embedded.telegramUserId;
  }
  if (authMethod === "farcaster") {
    return embedded.farcasterUsername;
  }
  if (!authMethod || authMethod === "wagmi") {
    return void 0;
  }
  return embedded.email;
}

// src/lib/wallet-kit/providers/para/ParaPluginProvider.tsx
import { jsx } from "react/jsx-runtime";
function hexToBase64(hex) {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  let binary = "";
  for (let index = 0; index < normalized.length; index += 2) {
    binary += String.fromCharCode(
      parseInt(normalized.slice(index, index + 2), 16)
    );
  }
  return btoa(binary);
}
function normalizeParaSignature(signature) {
  const normalized = signature.startsWith("0x") ? signature : `0x${signature}`;
  const parsed = parseSignature(normalized);
  return serializeSignature({
    r: parsed.r,
    s: parsed.s,
    yParity: parsed.yParity
  });
}
function findParaSigningWallet(paraSession, address) {
  const wallet = paraSession.findWalletByAddress?.(address, { type: ["EVM"] });
  if (wallet) {
    return wallet;
  }
  return Object.entries(paraSession.wallets ?? {}).find(([, candidate]) => {
    return candidate.address?.toLowerCase() === address.toLowerCase() && (!candidate.type || candidate.type === "EVM");
  })?.[1];
}
async function signParaMessage(paraSession, address, message) {
  const wallet = findParaSigningWallet(paraSession, address);
  const walletId = wallet?.id;
  if (!walletId || typeof paraSession.signMessage !== "function") {
    throw new Error("Para embedded wallet is not available for signing");
  }
  const result = await paraSession.signMessage({
    walletId,
    messageBase64: hexToBase64(hashMessage(message))
  });
  if (!result.signature) {
    throw new Error("Para embedded wallet did not return a signature");
  }
  return normalizeParaSignature(result.signature);
}
function AomiParaPluginProvider({
  children,
  supportedChains: configuredChains,
  svmConfig,
  selectedSolanaNetwork: selectedSolanaNetworkProp,
  setSelectedSolanaNetworkId: setSelectedSolanaNetworkIdProp,
  supportedSolanaNetworks: supportedSolanaNetworksProp,
  oAuthMethods = defaultOAuthMethods,
  execution,
  account
}) {
  const paraAccount = useSafeParaAccount();
  const paraSession = useSafeParaClient();
  const issueJwt = useSafeIssueJwt();
  const paraLogout = useSafeLogout();
  const paraModal = useSafeParaModal();
  const svmWallet = useSafeSvmWallet();
  const logoutParaSession = useCallback(async () => {
    if (paraLogout) {
      try {
        walletDebug("para:logout", { via: "useLogout" });
        await paraLogout();
        walletDebug("para:logout", { result: "ok" });
        return;
      } catch (error) {
        walletDebug("para:logout", { failed: String(error) });
        console.warn("[aomi-wallet-kit] Para logout failed", error);
      }
    }
    const clientLogout = paraSession?.logout;
    if (typeof clientLogout !== "function") {
      walletDebug("para:logout", {
        skip: paraLogout ? "hook-failed-no-client-fallback" : "no-path"
      });
      return;
    }
    try {
      walletDebug("para:logout", { via: "client" });
      await clientLogout.call(paraSession);
      walletDebug("para:logout", { result: "ok" });
    } catch (error) {
      walletDebug("para:logout", { failed: String(error) });
      console.warn("[aomi-wallet-kit] Para logout failed", error);
    }
  }, [paraLogout, paraSession]);
  const {
    selectedEvmChainId,
    selectedSolanaNetwork: preferenceSelectedSolanaNetwork,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId: preferenceSetSelectedSolanaNetworkId,
    supportedSolanaNetworks: preferenceSupportedSolanaNetworks
  } = useAomiWalletNetworkPreferences();
  const selectedSolanaNetwork = selectedSolanaNetworkProp ?? preferenceSelectedSolanaNetwork;
  const setSelectedSolanaNetworkId = setSelectedSolanaNetworkIdProp ?? preferenceSetSelectedSolanaNetworkId;
  const supportedSolanaNetworks = supportedSolanaNetworksProp ?? preferenceSupportedSolanaNetworks;
  const resolvedAdapterSvmConfig = useMemo2(
    () => ({
      cluster: svmConfig?.cluster ?? DEFAULT_SVM_CLUSTER,
      rpcHttpUrl: svmConfig?.rpcHttpUrl ?? publicEnv?.NEXT_PUBLIC_SOLANA_RPC_URL ?? DEFAULT_SVM_ENDPOINT,
      rpcWsUrl: svmConfig?.rpcWsUrl ?? publicEnv?.NEXT_PUBLIC_SOLANA_RPC_WS_URL ?? void 0,
      preferDirectSend: svmConfig?.preferDirectSend ?? true
    }),
    [svmConfig]
  );
  const providerHooks = useMemo2(
    () => ({
      providerLogout: logoutParaSession,
      isProviderInternalConnector: (connector) => connector.id === PARA_BRAND_KEY || canonicalWalletKey(connector.name ?? "") === PARA_BRAND_KEY,
      onProviderReconnectRequested: (store) => {
        store.dispatch({
          type: "user/provider-reconnect-requested",
          now: Date.now()
        });
      },
      onConnectFallback: (store) => {
        store.dispatch({
          type: "provider/auth-flow-started",
          reason: "provider-auth-connect-fallback",
          now: Date.now()
        });
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      onAccountDisconnectPlanned: (disconnectPlan) => {
        if (disconnectPlan.isProviderOwnedAccount && disconnectPlan.otherConnectionsRemain) {
          walletDebug("para:detach", {
            address: disconnectPlan.targetAddress,
            reason: "preserve-external-wallets"
          });
        }
      },
      signMessageForProviderAccount: async ({ connection, message }) => {
        if (connection.stableId !== PARA_BRAND_KEY || !paraSession) {
          return null;
        }
        return signParaMessage(
          paraSession,
          connection.address,
          message
        );
      }
    }),
    [logoutParaSession, paraModal, paraSession]
  );
  const evmRuntime = useEvmWalletRuntime({
    configuredChains,
    selectedEvmChainId,
    setSelectedEvmChainId,
    storageKey: REGISTRY_STORAGE_KEY,
    providerHooks
  });
  const { registryStore, registryState } = evmRuntime;
  useParaSessionSource(registryStore, { paraAccount });
  const startParaAuthFlow = useCallback(
    (reason) => {
      registryStore.dispatch({
        type: "provider/auth-flow-started",
        reason,
        now: Date.now()
      });
    },
    [registryStore]
  );
  const registryDetachedParaAddresses = registryState.intents.providerSessionDetached ? registryState.intents.droppedAddresses : [];
  const paraSessionLocallyDetached = Boolean(
    paraAccount.isConnected && registryState.intents.providerSessionDetached
  );
  const exposeParaSession = Boolean(
    paraAccount.isConnected && !paraSessionLocallyDetached
  );
  const embeddedPrimary = exposeParaSession ? paraAccount.embedded.email ?? paraAccount.embedded.farcasterUsername ?? paraAccount.embedded.telegramUserId ?? void 0 : void 0;
  const paraAuthMethod = inferAuthMethod(paraAccount.embedded.authMethods);
  const authRuntime = useMemo2(
    () => ({
      provider: "para",
      sessionProvider: "para",
      embeddedProvider: "para",
      legacyWalletProvider: "para",
      providerLabel: "Para",
      status: paraAccount.isLoading ? "booting" : exposeParaSession ? "authenticated" : "unauthenticated",
      primaryLabel: embeddedPrimary,
      authMethod: embeddedPrimary ? paraAuthMethod : void 0,
      authValue: embeddedPrimary ? resolveParaAuthValue(paraAccount.embedded, paraAuthMethod) : void 0,
      methods: paraModal ? Array.from(oAuthMethods).map(toSocialLoginOption) : [],
      canOpenModal: Boolean(paraModal),
      startFlow: startParaAuthFlow,
      login: async (reason, step = "AUTH_MAIN") => {
        registryStore.dispatch({
          type: "user/provider-reconnect-requested",
          now: Date.now()
        });
        startParaAuthFlow(reason);
        paraModal?.openModal({ step });
      },
      openAccountUI: async (reason, step = "ACCOUNT_MAIN") => {
        startParaAuthFlow(reason);
        paraModal?.openModal({ step });
      },
      logout: logoutParaSession,
      getCredential: exposeParaSession ? issueJwt ?? void 0 : void 0
    }),
    [
      embeddedPrimary,
      exposeParaSession,
      issueJwt,
      logoutParaSession,
      oAuthMethods,
      paraAccount.embedded,
      paraAccount.isLoading,
      paraAuthMethod,
      paraModal,
      registryStore,
      startParaAuthFlow
    ]
  );
  const svmRuntime = useSvmWalletRuntime({
    preferDirectSend: resolvedAdapterSvmConfig.preferDirectSend,
    registryStore,
    selectedNetwork: selectedSolanaNetwork,
    supportedNetworks: supportedSolanaNetworks,
    setSelectedNetworkId: setSelectedSolanaNetworkId,
    wallet: svmWallet
  });
  const providerEvmWalletOptions = useMemo2(() => [], []);
  const transformEvmIdentity = useCallback(
    (identity) => {
      if (paraSessionLocallyDetached && identity.address && registryDetachedParaAddresses.includes(identity.address.toLowerCase())) {
        return {};
      }
      return identity;
    },
    [paraSessionLocallyDetached, registryDetachedParaAddresses]
  );
  const transformAccounts = useCallback(
    (accounts) => accounts.filter((account2) => {
      if (!paraSessionLocallyDetached) return true;
      if (account2.family !== "evm") return true;
      const address = account2.address.toLowerCase();
      if (registryDetachedParaAddresses.includes(address)) return false;
      return !isParaEmbeddedAccount(account2);
    }).map((account2) => {
      if (!exposeParaSession || !isParaEmbeddedAccount(account2)) {
        return account2;
      }
      return {
        ...account2,
        manageable: Boolean(paraModal),
        actions: [
          ...paraModal ? [{ kind: "manage", label: "Manage" }] : [],
          { kind: "signout", label: "Sign out" }
        ]
      };
    }),
    [
      exposeParaSession,
      paraModal,
      paraSessionLocallyDetached,
      registryDetachedParaAddresses
    ]
  );
  const canManageParaAccount = useCallback(
    (account2) => Boolean(paraModal) && exposeParaSession && isParaEmbeddedAccount(account2),
    [exposeParaSession, paraModal]
  );
  const sponsorship = useMemo2(
    () => resolveAASponsorship(execution?.provider ?? "auto"),
    [execution?.provider]
  );
  const executionRuntime = useMemo2(
    () => ({
      sponsorship,
      evm: buildEvmExecutionRuntime(evmRuntime, {
        aaModes: execution?.modes,
        aaOwner: execution?.owner ?? "auto",
        aaPolicy: execution?.aa ?? "optional",
        aaProvider: execution?.provider ?? "auto",
        resolveAAProviderState: async (params, context) => resolveAAProviderState({
          ...params,
          ownerStrategy: {
            kind: "provider-session",
            provider: "para",
            session: paraSession
          },
          walletClient: context.walletClient,
          address: context.address
        })
      })
    }),
    [evmRuntime, execution, paraSession, sponsorship]
  );
  const accountRuntime = useResolvedAccountRuntime({
    account,
    auth: authRuntime,
    evm: evmRuntime,
    svm: svmRuntime
  });
  return /* @__PURE__ */ jsx(
    AomiWalletKitComposer,
    {
      auth: authRuntime,
      account: accountRuntime,
      evm: evmRuntime,
      svm: svmRuntime,
      execution: executionRuntime,
      additionalEvmWalletOptions: providerEvmWalletOptions,
      transformEvmIdentity,
      transformAccounts,
      canManageAccount: canManageParaAccount,
      supportedChains: evmRuntime.supportedChains,
      children
    }
  );
}

// src/lib/wallet-kit/providers/para/para-plugin.tsx
import { useMemo as useMemo3 } from "react";
import {
  Environment,
  ParaProvider
} from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { Fragment, jsx as jsx2 } from "react/jsx-runtime";
function toParaEnvironment(value) {
  if (!value) return Environment.BETA;
  return value === "PROD" ? Environment.PROD : Environment.BETA;
}
function toParaOAuthMethods(methods) {
  if (!methods) return defaultOAuthMethods;
  const map = {
    google: "GOOGLE",
    apple: "APPLE",
    discord: "DISCORD",
    x: "TWITTER",
    farcaster: "FARCASTER",
    telegram: "TELEGRAM"
  };
  const resolved = methods.map((method) => map[method]).filter((method) => Boolean(method));
  return resolved.length ? resolved : defaultOAuthMethods;
}
function isParaAuth(auth) {
  return auth !== false && auth?.provider === "para";
}
function ParaAuthLayer({
  auth,
  children,
  providers
}) {
  const enabled = isParaAuth(auth);
  const para = providers?.para === false ? void 0 : providers?.para;
  const apiKey = para?.apiKey ?? publicEnv?.NEXT_PUBLIC_PARA_API_KEY;
  const paraClientConfig = useMemo3(
    () => apiKey ? {
      apiKey,
      env: toParaEnvironment(para?.environment)
    } : null,
    [apiKey, para?.environment]
  );
  const paraConfig = useMemo3(
    () => ({
      appName: para?.appName ?? "Aomi",
      disableAutoSessionKeepAlive: true
    }),
    [para?.appName]
  );
  const paraModalConfig = useMemo3(
    () => ({
      disableEmailLogin: false,
      oAuthMethods: toParaOAuthMethods(
        enabled && auth !== false && auth?.provider === "para" ? auth.methods : void 0
      )
    }),
    [auth, enabled]
  );
  const externalWalletConfig = useMemo3(
    () => ({
      appDescription: para?.appDescription ?? "Aomi widget",
      appUrl: para?.appUrl ?? (typeof window !== "undefined" ? window.location.origin : "https://aomi.dev"),
      wallets: [],
      walletConnect: void 0
    }),
    [para?.appDescription, para?.appUrl]
  );
  if (!enabled || !paraClientConfig) {
    return /* @__PURE__ */ jsx2(Fragment, { children });
  }
  return /* @__PURE__ */ jsx2(
    ParaProvider,
    {
      paraClientConfig,
      config: paraConfig,
      paraModalConfig,
      externalWalletConfig,
      children
    }
  );
}
var paraPlugin = {
  id: "para",
  authMode: "additive",
  isAvailable: ({ auth, providers }) => {
    const enabled = isParaAuth(auth);
    const para = providers?.para === false ? void 0 : providers?.para;
    return Boolean(
      enabled && (para?.apiKey ?? publicEnv?.NEXT_PUBLIC_PARA_API_KEY)
    );
  },
  wrap: (props) => /* @__PURE__ */ jsx2(ParaAuthLayer, { ...props }),
  renderComposer: ({
    account,
    auth,
    children,
    execution,
    selectedSolanaNetwork,
    setSelectedSolanaNetworkId,
    solanaRuntimeConfig,
    supportedChains,
    supportedSolanaNetworks
  }) => /* @__PURE__ */ jsx2(
    AomiParaPluginProvider,
    {
      account,
      execution,
      oAuthMethods: toParaOAuthMethods(
        auth !== false && auth?.provider === "para" ? auth.methods : void 0
      ),
      selectedSolanaNetwork,
      setSelectedSolanaNetworkId,
      supportedChains,
      supportedSolanaNetworks,
      svmConfig: solanaRuntimeConfig,
      children
    }
  ),
  detectSugar: (input) => {
    if (input.auth !== false && input.auth?.provider === "para" && "apiKey" in input.auth) {
      return {
        children: input.children,
        providers: {
          para: {
            apiKey: input.auth.apiKey,
            environment: input.auth.environment,
            appName: input.auth.appName,
            appDescription: input.auth.appDescription
          }
        },
        auth: { provider: "para", methods: input.auth.methods }
      };
    }
    return null;
  }
};
function registerAomiParaWalletProvider() {
  registerWalletProvider(paraPlugin);
}
registerAomiParaWalletProvider();

// src/lib/wallet-kit/providers/para/widget-auth.ts
function paraAuth({
  apiKey,
  environment = "BETA",
  methods = ["email", "google"],
  appName = "Aomi",
  appDescription = "Aomi widget",
  appUrl
}) {
  const resolvedApiKey = apiKey?.trim();
  if (!resolvedApiKey) return false;
  registerAomiParaWalletProvider();
  return {
    provider: "para",
    methods,
    providers: {
      para: {
        apiKey: resolvedApiKey,
        environment,
        appName,
        appDescription,
        appUrl
      }
    }
  };
}

// src/lib/wallet-kit/providers/para/index.ts
var externalWalletMap = {
  COINBASE: "coinbase",
  METAMASK: "metamask",
  RABBY: "rabby",
  RAINBOW: "rainbow",
  WALLETCONNECT: "walletconnect"
};
var oAuthMethodMap = {
  APPLE: "apple",
  DISCORD: "discord",
  FARCASTER: "farcaster",
  GOOGLE: "google",
  TELEGRAM: "telegram",
  TWITTER: "x"
};
function AomiParaProvider({
  appDescription,
  appName,
  appUrl,
  apiKey,
  children,
  environment,
  externalWallets,
  networks,
  oAuthMethods,
  walletConnectProjectId
}) {
  const wallets = externalWallets?.map((wallet) => externalWalletMap[wallet]).filter((wallet) => Boolean(wallet));
  const methods = oAuthMethods?.map((method) => oAuthMethodMap[method]).filter((method) => Boolean(method));
  return createElement(
    AomiWalletKitProvider,
    {
      auth: { provider: "para", methods },
      providers: {
        para: {
          apiKey,
          appDescription,
          appName,
          appUrl,
          environment
        }
      },
      wallets: {
        evm: {
          appName,
          chains: networks,
          walletConnectProjectId,
          wallets
        }
      }
    },
    children
  );
}
var AomiParaAdapterProvider = AomiParaProvider;
export {
  AomiParaAdapterProvider,
  AomiParaPluginProvider,
  AomiParaProvider,
  paraAuth,
  paraPlugin,
  registerAomiParaWalletProvider
};
//# sourceMappingURL=para.js.map
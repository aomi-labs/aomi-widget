"use client";
"use client";
import {
  PrivyDelegationContext,
  usePrivyDelegation
} from "../chunk-DWCD4CNY.js";
import {
  providerAuth,
  useEmbeddedSessionSource
} from "../chunk-GHAZJ3ZU.js";
import {
  AomiWalletKitComposer,
  AomiWalletNetworkPreferencesProvider,
  REGISTRY_STORAGE_KEY,
  buildEvmExecutionRuntime,
  createAomiEvmConfig,
  formatWalletAddress,
  normalizeSvmNetworkOptions,
  registerWalletBrand,
  registerWalletProvider,
  safeEnv,
  useAomiWalletNetworkPreferences,
  useEvmWalletRuntime,
  useResolvedAccountRuntime,
  useSvmWalletRuntime
} from "../chunk-FUKWMD3O.js";

// src/lib/wallet-kit/providers/privy/PrivyProvider.tsx
import { useMemo as useMemo2, useState as useState2 } from "react";
import {
  PrivyProvider as PrivyAuthProvider
} from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  arbitrum,
  base,
  linea,
  lineaSepolia,
  mainnet,
  optimism,
  polygon,
  sepolia
} from "wagmi/chains";
import { ExtUserProvider } from "@aomi-labs/react";
import { megaeth, robinhood } from "@aomi-labs/client";

// src/lib/wallet-kit/providers/privy/PrivyPluginProvider.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { serializeSignature } from "viem";
import { toViemSignTypedDataArgs } from "@aomi-labs/react";

// src/lib/wallet-kit/providers/privy/privy-auth.ts
import {
  usePrivy,
  useWallets
} from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { useSmartWallets } from "@privy-io/react-auth/smart-wallets";
var DISCONNECTED_PRIVY = {
  ready: false,
  authenticated: false,
  user: null,
  login: async () => void 0,
  logout: async () => void 0,
  getAccessToken: async () => null,
  getIdentityToken: async () => null
};
var DISCONNECTED_SMART_WALLETS = {
  client: void 0,
  getClientForChain: async () => void 0
};
var DISCONNECTED_SOLANA_WALLETS = {
  wallets: [],
  ready: false
};
var DISCONNECTED_WALLETS = {
  wallets: [],
  ready: false
};
var AOMI_LOGIN_METHODS = /* @__PURE__ */ new Set([
  "google",
  "apple",
  "facebook",
  "x",
  "discord",
  "github",
  "farcaster",
  "telegram",
  "email",
  "phone",
  "wagmi",
  "passkey",
  "wallet"
]);
function useSafePrivy() {
  try {
    return usePrivy();
  } catch {
    return DISCONNECTED_PRIVY;
  }
}
function useSafeSmartWallets() {
  try {
    return useSmartWallets();
  } catch {
    return DISCONNECTED_SMART_WALLETS;
  }
}
function useSafeSvmWallets() {
  try {
    return useSolanaWallets();
  } catch {
    return DISCONNECTED_SOLANA_WALLETS;
  }
}
function useSafeWallets() {
  try {
    return useWallets();
  } catch {
    return DISCONNECTED_WALLETS;
  }
}
var PRIVY_EMBEDDED_CLIENT_TYPES = /* @__PURE__ */ new Set(["privy", "privy-v2"]);
function pickPrivyEmbeddedEvmWallet(wallets) {
  return wallets.find(
    (wallet) => wallet.type === "ethereum" && !wallet.imported && PRIVY_EMBEDDED_CLIENT_TYPES.has(wallet.walletClientType)
  );
}
function isPrivyEmbeddedEvmUserWallet(wallet) {
  if (!wallet || typeof wallet !== "object") return false;
  const candidate = wallet;
  return typeof candidate.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(candidate.address) && candidate.imported !== true && (candidate.chainType === void 0 || candidate.chainType === "ethereum" || candidate.chainType === "evm") && (candidate.walletClientType === void 0 || PRIVY_EMBEDDED_CLIENT_TYPES.has(candidate.walletClientType));
}
function pickPrivyEmbeddedEvmUserWallet(user) {
  if (!user) return void 0;
  const direct = user.wallet;
  if (isPrivyEmbeddedEvmUserWallet(direct)) return direct;
  const linked = user.linkedAccounts ?? [];
  return linked.find(isPrivyEmbeddedEvmUserWallet);
}
function asAomiLoginMethod(value) {
  return value && AOMI_LOGIN_METHODS.has(value) ? value : void 0;
}
function inferPrivyAuthMethod(user) {
  if (!user) return void 0;
  const accountTypePriority = [
    ["google_oauth", "google"],
    ["github_oauth", "github"],
    ["apple_oauth", "apple"],
    ["discord_oauth", "discord"],
    ["twitter_oauth", "x"],
    ["telegram", "telegram"],
    ["farcaster", "farcaster"],
    ["email", "email"],
    ["phone", "phone"],
    ["wallet", "wagmi"]
  ];
  const linked = user.linkedAccounts ?? [];
  for (const [privyType, label] of accountTypePriority) {
    if (linked.some((acc) => acc?.type === privyType)) return label;
  }
  const first = linked[0]?.type;
  return asAomiLoginMethod(
    typeof first === "string" ? first.toLowerCase() : void 0
  );
}
function inferPrivyPrimaryLabel(user) {
  if (!user) return void 0;
  const u = user;
  return u.email?.address ?? u.google?.email ?? u.apple?.email ?? u.discord?.username ?? u.twitter?.username ?? u.github?.username ?? u.telegram?.username ?? u.telegram?.firstName ?? u.farcaster?.username ?? u.farcaster?.displayName ?? u.phone?.number ?? void 0;
}
function privyLoginMethodsToOptions(methods) {
  const enabledMethods = (methods ?? []).map(
    (method) => asAomiLoginMethod(method === "twitter" ? "x" : String(method))
  ).filter((method) => Boolean(method));
  if (enabledMethods.length === 0) return [];
  return [
    {
      id: "privy",
      label: enabledMethods.length === 1 && enabledMethods[0] === "google" ? "Email or Google" : "Email, wallet, or social",
      family: "multichain",
      kind: "social",
      status: "available",
      ready: true,
      description: "Fast account sign-in"
    }
  ];
}
function toPrivyLoginMethods(methods) {
  if (!methods) return void 0;
  const map = {
    apple: "apple",
    discord: "discord",
    email: "email",
    farcaster: "farcaster",
    github: "github",
    google: "google",
    passkey: "passkey",
    phone: "sms",
    telegram: "telegram",
    wallet: "wallet",
    x: "twitter"
  };
  const resolved = [];
  for (const method of methods) {
    const loginMethod = map[method];
    if (loginMethod) resolved.push(loginMethod);
  }
  return resolved.length ? resolved : void 0;
}
function buildPrivyClientConfig(opts) {
  return {
    appearance: {
      walletList: ["detected_wallets", "metamask", "wallet_connect"],
      logo: opts.appLogoUrl
    },
    embeddedWallets: {
      ethereum: { createOnLogin: "all-users" },
      solana: { createOnLogin: "all-users" }
    },
    loginMethods: opts.loginMethods,
    ...opts.defaultChain ? { defaultChain: opts.defaultChain } : {},
    ...opts.supportedChains ? { supportedChains: opts.supportedChains } : {},
    ...opts.walletConnectProjectId ? { walletConnectCloudProjectId: opts.walletConnectProjectId } : {},
    ...opts.appName ? { appName: opts.appName } : {}
  };
}

// src/lib/wallet-kit/providers/privy/PrivyPluginProvider.tsx
import {
  useSign7702Authorization
} from "@privy-io/react-auth";

// src/lib/wallet-kit/providers/privy/privy-svm.ts
function buildPrivySvmWalletState({
  wallet,
  wallets,
  setActiveAddress
}) {
  return {
    publicKey: wallet?.address,
    connected: Boolean(wallet?.address),
    connecting: false,
    disconnecting: false,
    walletName: wallet ? "Privy Solana" : void 0,
    providerId: wallet ? "privy" : void 0,
    transport: wallet ? "embedded" : void 0,
    wallets: wallets.map((entry) => ({
      adapter: {
        name: `Privy Solana ${formatWalletAddress(entry.address) ?? ""}`.trim(),
        readyState: "Installed"
      },
      readyState: "Installed"
    })),
    select: (walletName) => {
      if (!walletName) return;
      const target = wallets.find(
        (entry) => walletName.toString().includes(formatWalletAddress(entry.address) ?? "")
      );
      if (target?.address) setActiveAddress(target.address);
    },
    connect: async () => void 0,
    disconnect: void 0,
    signTransaction: wallet?.signTransaction ? async (tx) => wallet.signTransaction(tx) : void 0,
    signAllTransactions: void 0,
    signMessage: wallet?.signMessage ? async (message) => wallet.signMessage(message) : void 0,
    sendTransaction: wallet?.sendTransaction ? async (tx, connection) => wallet.sendTransaction(tx, connection) : void 0
  };
}

// src/lib/wallet-kit/providers/privy/privy-execution.ts
import { toAAWalletCalls } from "@aomi-labs/react";
async function sendPrivySmartWalletTransaction({
  payload,
  smartWalletClient,
  getClientForChain,
  wagmiChainId,
  smartAddress
}) {
  const targetChainId = payload.chainId ?? wagmiChainId ?? 1;
  const callList = toAAWalletCalls(payload, targetChainId);
  if (callList.length === 0) {
    throw new Error("pending_transaction_missing_call_data");
  }
  const client = await getClientForChain({ id: targetChainId }) ?? smartWalletClient;
  const isBatch = callList.length > 1;
  const txHash = isBatch ? await client.sendTransaction({
    calls: callList.map((c) => ({
      to: c.to,
      value: c.value,
      data: c.data
    }))
  }) : await client.sendTransaction({
    to: callList[0].to,
    value: callList[0].value,
    data: callList[0].data
  });
  return {
    txHash,
    amount: payload.value,
    aaRequestedMode: isBatch ? "4337" : "none",
    aaResolvedMode: "4337",
    executionKind: "privy_smart_wallet_4337",
    batched: isBatch,
    callCount: callList.length,
    sponsored: void 0,
    SmartAccount4337: smartAddress
  };
}

// src/lib/wallet-kit/providers/privy/PrivyPluginProvider.tsx
import { jsx } from "react/jsx-runtime";
function AomiPrivyPluginProvider({
  children,
  supportedChains,
  loginMethods,
  execution,
  account,
  preferDirectSend = true
}) {
  const privy = useSafePrivy();
  const { client: smartWalletClient, getClientForChain } = useSafeSmartWallets();
  const { wallets: solanaWallets } = useSafeSvmWallets();
  const { wallets: connectedWallets } = useSafeWallets();
  const { signAuthorization } = useSign7702Authorization();
  const [activeSolanaAddress, setActiveSolanaAddress] = useState();
  const {
    selectedEvmChainId,
    selectedSolanaNetwork,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks
  } = useAomiWalletNetworkPreferences();
  const evmRuntime = useEvmWalletRuntime({
    configuredChains: supportedChains,
    selectedEvmChainId,
    setSelectedEvmChainId,
    storageKey: REGISTRY_STORAGE_KEY,
    providerHooks: { providerLogout: privy.logout }
  });
  const startPrivyAuthFlow = useCallback(
    (reason) => {
      evmRuntime.registryStore.dispatch({
        type: "provider/auth-flow-started",
        reason,
        now: Date.now()
      });
    },
    [evmRuntime.registryStore]
  );
  const smartAddress = smartWalletClient?.account?.address;
  const embeddedEvmWallet2 = pickPrivyEmbeddedEvmWallet(connectedWallets);
  const embeddedEvmUserWallet = pickPrivyEmbeddedEvmUserWallet(privy.user);
  const embeddedEvmAddress = embeddedEvmWallet2?.address ?? embeddedEvmUserWallet?.address;
  const sessionEvmAddress = smartAddress ?? embeddedEvmAddress ?? null;
  const sessionReady = privy.authenticated && Boolean(embeddedEvmWallet2 || embeddedEvmUserWallet || smartAddress);
  const activeSolanaWallet = solanaWallets.find((wallet) => wallet.address === activeSolanaAddress) ?? solanaWallets[0];
  const svmWallet = useMemo(
    () => buildPrivySvmWalletState({
      wallet: activeSolanaWallet,
      wallets: solanaWallets,
      setActiveAddress: setActiveSolanaAddress
    }),
    [activeSolanaWallet, solanaWallets]
  );
  useEffect(() => {
    if (activeSolanaAddress && solanaWallets.some((wallet) => wallet.address === activeSolanaAddress)) {
      return;
    }
    setActiveSolanaAddress(solanaWallets[0]?.address);
  }, [activeSolanaAddress, solanaWallets]);
  useEmbeddedSessionSource(evmRuntime.registryStore, {
    up: sessionReady,
    providerId: "privy",
    uid: "privy-smart-session",
    stableId: "privy",
    walletName: "Privy Smart Wallet",
    embeddedEvmAddress: sessionEvmAddress,
    chainId: selectedEvmChainId
  });
  const authMethod = inferPrivyAuthMethod(privy.user);
  const primaryLabel = inferPrivyPrimaryLabel(privy.user);
  const authRuntime = useMemo(
    () => ({
      provider: "privy",
      sessionProvider: "privy",
      embeddedProvider: "privy",
      legacyWalletProvider: "privy",
      providerLabel: "Privy",
      status: !privy.ready ? "booting" : privy.authenticated ? "authenticated" : "unauthenticated",
      subject: privy.user?.id,
      primaryLabel,
      authMethod,
      authValue: primaryLabel,
      methods: privyLoginMethodsToOptions(loginMethods),
      canOpenModal: Boolean(privy.login),
      startFlow: startPrivyAuthFlow,
      login: async (reason = "provider-auth-modal") => {
        evmRuntime.registryStore.dispatch({
          type: "user/provider-reconnect-requested",
          now: Date.now()
        });
        startPrivyAuthFlow(reason);
        await privy.login();
      },
      logout: privy.logout,
      getCredential: privy.getIdentityToken ?? privy.getAccessToken ? async () => {
        const identityToken = (await privy.getIdentityToken?.())?.trim();
        if (identityToken) {
          return {
            provider: "privy",
            tokenKind: "identity_token",
            providerToken: identityToken
          };
        }
        const accessToken = (await privy.getAccessToken?.())?.trim();
        return accessToken ? {
          provider: "privy",
          tokenKind: "access_token",
          providerToken: accessToken
        } : null;
      } : void 0
    }),
    [
      authMethod,
      loginMethods,
      primaryLabel,
      privy.authenticated,
      privy.getAccessToken,
      privy.getIdentityToken,
      privy.login,
      privy.logout,
      privy.ready,
      privy.user?.id,
      evmRuntime.registryStore,
      startPrivyAuthFlow
    ]
  );
  const transformPrivyAccounts = useCallback(
    (accounts) => accounts.map((account2) => {
      if (!privy.authenticated || account2.provider !== "privy" || account2.walletKind !== "embedded" && account2.walletKind !== "smart_account") {
        return account2;
      }
      return {
        ...account2,
        linkedVia: account2.linkedVia ?? "privy",
        actions: [{ kind: "signout", label: "Sign out" }]
      };
    }),
    [privy.authenticated]
  );
  const svmRuntime = useSvmWalletRuntime({
    preferDirectSend,
    registryStore: evmRuntime.registryStore,
    selectedNetwork: selectedSolanaNetwork,
    supportedNetworks: supportedSolanaNetworks,
    setSelectedNetworkId: setSelectedSolanaNetworkId,
    wallet: svmWallet
  });
  const executionRuntime = useMemo(
    () => ({
      sponsorship: {},
      evm: buildEvmExecutionRuntime(evmRuntime, {
        signAaRequests: embeddedEvmWallet2 && embeddedEvmAddress ? async (payload) => {
          if (embeddedEvmAddress.toLowerCase() !== payload.signer.toLowerCase()) {
            throw new Error(
              "The active Privy wallet is not the prepared AA owner"
            );
          }
          const signatures = [];
          for (const request of payload.signature_requests) {
            if (request.kind === "personal_sign") {
              const provider = await embeddedEvmWallet2.getEthereumProvider();
              const signature = await provider.request({
                method: "personal_sign",
                params: [request.message, embeddedEvmAddress]
              });
              if (typeof signature !== "string") {
                throw new Error("Privy returned an invalid AA signature");
              }
              signatures.push(signature);
            } else {
              const authorization = await signAuthorization(
                {
                  contractAddress: request.contract_address,
                  chainId: request.chain_id,
                  nonce: request.nonce
                },
                { address: embeddedEvmAddress }
              );
              signatures.push(serializeSignature(authorization));
            }
          }
          return { signatures };
        } : void 0,
        sendTransaction: execution?.aa === "off" ? void 0 : smartWalletClient ? async (payload) => sendPrivySmartWalletTransaction({
          payload,
          smartWalletClient,
          getClientForChain,
          wagmiChainId: evmRuntime.activeEvmConnection?.chainId,
          smartAddress
        }) : void 0,
        signTypedData: smartWalletClient ? async (payload) => {
          const args = toViemSignTypedDataArgs(payload);
          if (!args) throw new Error("Missing typed_data payload");
          const signature = await smartWalletClient.signTypedData(
            args
          );
          return { signature };
        } : void 0
      })
    }),
    [
      embeddedEvmAddress,
      embeddedEvmWallet2,
      evmRuntime,
      execution,
      getClientForChain,
      signAuthorization,
      smartAddress,
      smartWalletClient
    ]
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
      transformAccounts: transformPrivyAccounts,
      supportedChains,
      children
    }
  );
}

// src/lib/wallet-kit/providers/privy/PrivyProvider.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
var defaultNetworks = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
  robinhood,
  megaeth
];
function AomiPrivyProviderInner({
  children,
  appId = safeEnv(() => process.env.NEXT_PUBLIC_PRIVY_APP_ID),
  appName = "Aomi",
  appLogoUrl,
  networks = defaultNetworks,
  wallets,
  loginMethods,
  execution,
  solana,
  walletConnectProjectId = safeEnv(
    () => process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  )
}) {
  const [queryClient] = useState2(() => new QueryClient());
  const { selectedEvmChainId } = useAomiWalletNetworkPreferences();
  const defaultEvmChain = networks.find((chain) => chain.id === selectedEvmChainId) ?? networks[0];
  const wagmiConfig = useMemo2(
    () => createAomiEvmConfig({
      chains: networks,
      preset: wallets?.preset,
      wallets: wallets?.wallets,
      connectors: wallets?.connectors,
      walletConnectProjectId,
      coinbase: wallets?.coinbase,
      appName,
      appLogoUrl,
      transports: wallets?.transports
    }),
    [appLogoUrl, appName, networks, walletConnectProjectId, wallets]
  );
  const adapter = /* @__PURE__ */ jsx2(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsx2(WagmiProvider, { config: wagmiConfig, children: /* @__PURE__ */ jsx2(SmartWalletsProvider, { children: /* @__PURE__ */ jsx2(
    AomiPrivyPluginProvider,
    {
      supportedChains: networks,
      loginMethods,
      execution,
      preferDirectSend: solana?.preferDirectSend,
      children
    }
  ) }) }) });
  if (!appId) return adapter;
  return /* @__PURE__ */ jsx2(
    PrivyAuthProvider,
    {
      appId,
      config: buildPrivyClientConfig({
        appLogoUrl,
        appName,
        loginMethods,
        defaultChain: defaultEvmChain,
        supportedChains: networks,
        walletConnectProjectId
      }),
      children: adapter
    }
  );
}
function AomiPrivyProvider({
  networks = defaultNetworks,
  wallets,
  solana,
  ...rest
}) {
  const supportedSolanaNetworks = useMemo2(
    () => normalizeSvmNetworkOptions(solana),
    [solana]
  );
  return /* @__PURE__ */ jsx2(
    AomiWalletNetworkPreferencesProvider,
    {
      evmChains: networks,
      solanaNetworks: supportedSolanaNetworks,
      storageKey: "privy",
      children: /* @__PURE__ */ jsx2(ExtUserProvider, { children: /* @__PURE__ */ jsx2(
        AomiPrivyProviderInner,
        {
          ...rest,
          networks,
          solana,
          wallets
        }
      ) })
    }
  );
}

// src/lib/wallet-kit/providers/privy/privy-delegation.tsx
import {
  useCallback as useCallback2,
  useEffect as useEffect2,
  useRef,
  useState as useState3
} from "react";
import {
  useModalStatus,
  usePrivy as usePrivy2,
  useSessionSigners
} from "@privy-io/react-auth";
import { jsx as jsx3 } from "react/jsx-runtime";
function embeddedEvmWallet(user) {
  if (!user || typeof user !== "object") return null;
  const record = user;
  const candidates = [record.wallet, ...record.linkedAccounts ?? []];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const wallet = candidate;
    if (typeof wallet.id === "string" && typeof wallet.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(wallet.address) && wallet.imported !== true && (wallet.chainType === void 0 || wallet.chainType === "ethereum" || wallet.chainType === "evm") && (wallet.walletClientType === void 0 || wallet.walletClientType === "privy" || wallet.walletClientType === "privy-v2")) {
      return wallet;
    }
  }
  return null;
}
function PrivyDelegationProvider({
  callbackPath = "/api/delegation/privy/callback",
  children
}) {
  const { authenticated, getAccessToken, login, ready, user } = usePrivy2();
  const { addSessionSigners } = useSessionSigners();
  const { isOpen: modalOpen } = useModalStatus();
  const [pending, setPending] = useState3(null);
  const pendingRef = useRef(null);
  const sequence = useRef(0);
  const loginStarted = useRef(null);
  const signerStarted = useRef(null);
  const modalWasOpen = useRef(false);
  const settle = useCallback2((id, error) => {
    const operation = pendingRef.current;
    if (!operation || operation.id !== id) return;
    pendingRef.current = null;
    setPending(null);
    if (error) operation.reject(error);
    else operation.resolve();
  }, []);
  const openLogin = useCallback2(
    (operation) => {
      if (loginStarted.current === operation.id) return;
      loginStarted.current = operation.id;
      try {
        login();
      } catch (error) {
        settle(
          operation.id,
          error instanceof Error ? error : new Error("Privy sign-in could not be opened.")
        );
      }
    },
    [login, settle]
  );
  const start = useCallback2(
    ({ signerId, state }) => new Promise((resolve, reject) => {
      if (pendingRef.current) {
        reject(new Error("A Privy delegation is already in progress."));
        return;
      }
      const operation = {
        id: ++sequence.current,
        state,
        signerId,
        resolve,
        reject
      };
      pendingRef.current = operation;
      setPending(operation);
      if (ready && !authenticated) openLogin(operation);
    }),
    [authenticated, openLogin, ready]
  );
  useEffect2(() => {
    if (!pending) {
      modalWasOpen.current = false;
      return;
    }
    if (modalOpen) {
      modalWasOpen.current = true;
      return;
    }
    if (modalWasOpen.current && !authenticated) {
      modalWasOpen.current = false;
      settle(pending.id, new Error("Privy sign-in was dismissed."));
    }
  }, [authenticated, modalOpen, pending, settle]);
  useEffect2(() => {
    if (!pending || !ready) return;
    if (!authenticated) {
      openLogin(pending);
      return;
    }
    if (signerStarted.current === pending.id) return;
    const wallet = embeddedEvmWallet(user);
    if (!wallet) {
      settle(
        pending.id,
        new Error("Privy did not create an embedded Ethereum wallet.")
      );
      return;
    }
    signerStarted.current = pending.id;
    void (async () => {
      let signerError;
      try {
        try {
          await addSessionSigners({
            address: wallet.address,
            signers: [{ signerId: pending.signerId, policyIds: [] }]
          });
        } catch (error) {
          signerError = error;
        }
        const accessToken = await getAccessToken();
        if (!accessToken || !user?.id) {
          throw new Error("Privy did not provide an access token.");
        }
        const response = await fetch(callbackPath, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            state: pending.state,
            access_token: accessToken,
            user_id: user.id,
            wallets: [
              {
                id: wallet.id,
                address: wallet.address,
                chain_type: "ethereum"
              }
            ]
          })
        });
        if (!response.ok) {
          const because = signerError instanceof Error ? ` Privy also rejected the signer: ${signerError.message}` : "";
          throw new Error(
            `Aomi could not save the delegation (HTTP ${response.status}).${because}`
          );
        }
        settle(pending.id);
      } catch (error) {
        settle(
          pending.id,
          error instanceof Error ? error : new Error("Privy delegation failed.")
        );
      }
    })();
  }, [
    addSessionSigners,
    authenticated,
    callbackPath,
    getAccessToken,
    openLogin,
    pending,
    ready,
    settle,
    user
  ]);
  useEffect2(() => {
    if (!pending || ready) return;
    const timer = globalThis.setTimeout(
      () => settle(
        pending.id,
        new Error(
          "Privy is still loading. Check browser privacy settings and try again."
        )
      ),
      12e3
    );
    return () => globalThis.clearTimeout(timer);
  }, [pending, ready, settle]);
  return /* @__PURE__ */ jsx3(PrivyDelegationContext.Provider, { value: { start }, children });
}

// src/lib/wallet-kit/providers/privy/privy-plugin.tsx
import { useMemo as useMemo3 } from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider as SmartWalletsProvider2 } from "@privy-io/react-auth/smart-wallets";
import { Fragment, jsx as jsx4 } from "react/jsx-runtime";
var PRIVY_BRAND_KEY = "privy";
registerWalletBrand({ key: PRIVY_BRAND_KEY, matchers: ["privy"] });
function isPrivyAuth(auth) {
  return auth !== false && auth?.provider === "privy";
}
function PrivyAuthLayer({
  auth,
  children,
  providers
}) {
  const enabled = isPrivyAuth(auth);
  const privy = providers?.privy === false ? void 0 : providers?.privy;
  const appId = privy?.appId ?? safeEnv(() => process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  const config = useMemo3(
    () => buildPrivyClientConfig({
      appLogoUrl: privy?.appLogoUrl,
      appName: privy?.appName,
      loginMethods: enabled ? toPrivyLoginMethods(auth?.methods) : void 0
    }),
    [auth, enabled, privy?.appLogoUrl, privy?.appName]
  );
  if (!enabled || !appId) {
    return /* @__PURE__ */ jsx4(Fragment, { children });
  }
  return /* @__PURE__ */ jsx4(PrivyProvider, { appId, config, children: /* @__PURE__ */ jsx4(SmartWalletsProvider2, { children }) });
}
var privyPlugin = {
  id: "privy",
  authMode: "additive",
  isAvailable: ({ auth, providers }) => {
    const enabled = isPrivyAuth(auth);
    const privy = providers?.privy === false ? void 0 : providers?.privy;
    return Boolean(
      enabled && (privy?.appId ?? safeEnv(() => process.env.NEXT_PUBLIC_PRIVY_APP_ID))
    );
  },
  wrap: (props) => /* @__PURE__ */ jsx4(PrivyAuthLayer, { ...props }),
  renderComposer: ({
    account,
    auth,
    children,
    execution,
    solanaRuntimeConfig,
    supportedChains
  }) => /* @__PURE__ */ jsx4(
    AomiPrivyPluginProvider,
    {
      supportedChains,
      loginMethods: isPrivyAuth(auth) ? toPrivyLoginMethods(auth.methods) : void 0,
      execution,
      account,
      preferDirectSend: solanaRuntimeConfig?.preferDirectSend,
      children
    }
  ),
  detectSugar: (input) => {
    if (input.auth !== false && input.auth?.provider === "privy" && "appId" in input.auth) {
      return {
        children: input.children,
        providers: {
          privy: {
            appId: input.auth.appId,
            appName: input.auth.appName
          }
        },
        auth: { provider: "privy", methods: input.auth.methods }
      };
    }
    return null;
  }
};
function registerAomiPrivyWalletProvider() {
  registerWalletProvider(privyPlugin);
}
registerAomiPrivyWalletProvider();

// src/lib/wallet-kit/providers/privy/widget-auth.ts
function privyAuth({
  appId,
  environment = "PROD",
  methods,
  appName = "Aomi",
  appLogoUrl
}) {
  const resolvedAppId = appId?.trim();
  if (!resolvedAppId) {
    throw new Error("Privy widget auth requires an appId");
  }
  registerAomiPrivyWalletProvider();
  return providerAuth({
    provider: "privy",
    environment,
    methods,
    config: { appId: resolvedAppId, appName, appLogoUrl }
  });
}
export {
  AomiPrivyProvider,
  PrivyDelegationProvider,
  privyAuth,
  privyPlugin,
  registerAomiPrivyWalletProvider,
  usePrivyDelegation
};
//# sourceMappingURL=privy.js.map
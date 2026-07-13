"use client";
import {
  AomiWalletKitComposer,
  AomiWalletNetworkPreferencesProvider,
  REGISTRY_STORAGE_KEY,
  buildEvmExecutionRuntime,
  canonicalWalletKey,
  createAomiEvmConfig,
  detectProviderSugar,
  publicEnv,
  requireWalletProvider,
  resolveAAProviderState,
  resolveAomiSvmConfig,
  selectAccounts,
  selectEvmIdentity,
  useAomiWalletNetworkPreferences,
  useEvmWalletRuntime,
  useResolvedAccountRuntime,
  useSafeSvmWallet,
  useSvmWalletRuntime,
  useWalletRegistry
} from "./chunk-3GP4B2BE.js";

// src/lib/wallet-kit/full-testnet-config.ts
import { useMemo } from "react";
var FULL_TESTNET_ENABLED = publicEnv?.NEXT_PUBLIC_USE_FULL_TESTNET === "true";
var FULL_TESTNET_RPC_MAP_RAW = publicEnv?.NEXT_PUBLIC_FULL_TESTNET_RPC_MAP?.trim() ?? "";
function parseRpcOverrides(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return {};
  const overrides = {};
  const writeOverride = (chainIdRaw, rpcUrlRaw) => {
    const chainId = Number(chainIdRaw.trim());
    const rpcUrl = rpcUrlRaw.trim();
    if (!Number.isInteger(chainId) || chainId <= 0 || !rpcUrl) return;
    try {
      overrides[chainId] = new URL(rpcUrl).toString();
    } catch {
    }
  };
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      for (const [chainId, rpcUrl] of Object.entries(parsed ?? {})) {
        if (typeof rpcUrl === "string") {
          writeOverride(chainId, rpcUrl);
        }
      }
    } catch {
      return {};
    }
    return overrides;
  }
  for (const part of trimmed.split(",")) {
    const [chainId, ...rpcUrlParts] = part.split("=");
    if (!chainId || rpcUrlParts.length === 0) continue;
    writeOverride(chainId, rpcUrlParts.join("="));
  }
  return overrides;
}
var FULL_TESTNET_RPC_OVERRIDES = parseRpcOverrides(FULL_TESTNET_RPC_MAP_RAW);
function isFullTestnet() {
  return FULL_TESTNET_ENABLED && Object.keys(FULL_TESTNET_RPC_OVERRIDES).length > 0;
}
function useFullTestnet(chains) {
  return useMemo(() => {
    const enabled = isFullTestnet();
    const routedChains = enabled ? chains.map((chain) => {
      const rpcUrl = FULL_TESTNET_RPC_OVERRIDES[chain.id];
      if (!rpcUrl) return chain;
      return {
        ...chain,
        rpcUrls: {
          ...chain.rpcUrls,
          default: {
            ...chain.rpcUrls.default,
            http: [rpcUrl]
          },
          public: chain.rpcUrls.public ? {
            ...chain.rpcUrls.public,
            http: [rpcUrl]
          } : {
            http: [rpcUrl]
          }
        }
      };
    }) : chains;
    return {
      enabled,
      routedChains,
      routedChainIds: new Set(
        Object.keys(FULL_TESTNET_RPC_OVERRIDES).map(Number)
      )
    };
  }, [chains]);
}

// src/lib/wallet-kit/full-testnet-wallet-routing.tsx
import { useEffect, useMemo as useMemo2, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { Fragment, jsx } from "react/jsx-runtime";
function FullTestnetWalletRouter({
  enabled,
  chains,
  routedChainIds,
  logLabel = "FullTestnetWalletRouter",
  children
}) {
  const { isConnected, chainId, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const attemptedChainIdsRef = useRef(/* @__PURE__ */ new Set());
  const chainsById = useMemo2(
    () => Object.fromEntries(chains.map((chain) => [chain.id, chain])),
    [chains]
  );
  useEffect(() => {
    if (!enabled || !isConnected || !chainId || !routedChainIds.has(chainId)) {
      return;
    }
    if (attemptedChainIdsRef.current.has(chainId)) {
      return;
    }
    attemptedChainIdsRef.current.add(chainId);
    const ensureWalletOnChain = async () => {
      const chain = chainsById[chainId];
      if (!chain) return;
      try {
        const provider = await connector?.getProvider();
        if (provider && typeof provider === "object" && "request" in provider) {
          try {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${chain.id.toString(16)}`,
                  chainName: chain.name,
                  nativeCurrency: chain.nativeCurrency,
                  rpcUrls: chain.rpcUrls.default.http,
                  blockExplorerUrls: chain.blockExplorers?.default?.url ? [chain.blockExplorers.default.url] : void 0
                }
              ]
            });
          } catch (error) {
            console.info(`[${logLabel}] wallet_addEthereumChain result`, error);
          }
        }
        if (switchChainAsync) {
          await switchChainAsync({ chainId });
        }
      } catch (error) {
        console.error(
          `[${logLabel}] Failed to route wallet for chain ${chainId}`,
          error
        );
      }
    };
    void ensureWalletOnChain();
  }, [
    chainId,
    chainsById,
    connector,
    enabled,
    isConnected,
    logLabel,
    routedChainIds,
    switchChainAsync
  ]);
  return /* @__PURE__ */ jsx(Fragment, { children });
}

// src/lib/wallet-kit/config/AomiWalletKitProvider.tsx
import { useEffect as useEffect2, useMemo as useMemo4, useState } from "react";
import {
  ConnectionProvider,
  WalletProvider
} from "@solana/wallet-adapter-react";
import { useStandardWalletAdapters } from "@solana/wallet-standard-wallet-adapter-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExtUserProvider } from "@aomi-labs/react";
import { monad, monadTestnet } from "@aomi-labs/client";
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

// src/lib/wallet-kit/runtime/evm/provider.tsx
import { WagmiProvider } from "wagmi";
import { jsx as jsx2 } from "react/jsx-runtime";
function AomiEvmRuntimeProvider({
  children,
  config
}) {
  return /* @__PURE__ */ jsx2(WagmiProvider, { config, reconnectOnMount: true, children });
}

// src/lib/wallet-kit/runtime/evm/disabled-runtime.ts
import { useCallback, useMemo as useMemo3 } from "react";
var disabledExecutors = {
  wagmiReconnect: async () => void 0,
  wagmiConnect: async () => void 0,
  wagmiDisconnect: async () => void 0,
  providerLogout: async () => void 0
};
function rejectDisabledEvm() {
  throw new Error("EVM wallets are disabled for this wallet kit instance.");
}
function useDisabledEvmWalletRuntime({
  storageKey
}) {
  const { store: registryStore, state: registryState } = useWalletRegistry({
    executors: disabledExecutors,
    storageKey
  });
  const selectRuntimeAccounts = useCallback(
    (now) => selectAccounts(registryState, "evm", now, void 0),
    [registryState]
  );
  const selectRuntimeEvmIdentity = useCallback(
    (now) => selectEvmIdentity(registryState, now, void 0),
    [registryState]
  );
  const getWalletClientFor = useCallback(async () => null, []);
  const reject = useCallback(async () => rejectDisabledEvm(), []);
  return useMemo3(
    () => ({
      registryStore,
      registryState,
      status: "unavailable",
      activeEvmConnection: void 0,
      activeConnector: void 0,
      capabilities: void 0,
      chainsById: {},
      supportedChains: [],
      walletClient: void 0,
      getWalletClientFor,
      sendTransactionAsync: void 0,
      sendCallsSyncAsync: void 0,
      signTypedDataAsync: void 0,
      signMessageAsync: void 0,
      signMessageForAccount: void 0,
      switchChainAsync: void 0,
      isSwitchingChain: false,
      activeAccount: void 0,
      options: [],
      shouldUseExternalSigner: false,
      identity: selectRuntimeEvmIdentity,
      accounts: selectRuntimeAccounts,
      selectAccount: async (_id) => void 0,
      connect: reject,
      disconnect: async (_accountId) => void 0,
      selectNetwork: reject
    }),
    [
      getWalletClientFor,
      registryState,
      registryStore,
      reject,
      selectRuntimeAccounts,
      selectRuntimeEvmIdentity
    ]
  );
}

// src/lib/wallet-kit/config/execution.ts
function isEnabledSponsorship(sponsorship) {
  return sponsorship?.mode === "optional" || sponsorship?.mode === "required";
}
function resolveMaybeFunction(value) {
  if (typeof value === "function") {
    return value;
  }
  if (value === void 0) {
    return void 0;
  }
  return () => value;
}
function resolveConfiguredNativeWalletExecutionPolicy(execution) {
  const sponsorship = execution?.sponsorship;
  if (!isEnabledSponsorship(sponsorship)) {
    return void 0;
  }
  return {
    executionKind: "wallet_sendCalls",
    sendCallsTimeoutMs: sponsorship.sendCallsTimeoutMs,
    sendCallsVersion: sponsorship.sendCallsVersion,
    sponsorship: {
      mode: sponsorship.mode,
      getPaymasterServiceContext: resolveMaybeFunction(
        sponsorship.paymasterServiceContext
      ),
      getPaymasterServiceUrl: resolveMaybeFunction(
        sponsorship.paymasterServiceUrl
      )
    }
  };
}
function resolveExecutionSponsorshipIdentity(execution) {
  const sponsorship = execution?.sponsorship;
  if (!isEnabledSponsorship(sponsorship)) {
    return {};
  }
  const sponsorAccount = typeof sponsorship.paymasterServiceUrl === "string" ? sponsorship.paymasterServiceUrl : void 0;
  return {
    sponsored: sponsorship.mode === "required" ? true : void 0,
    sponsorAccount
  };
}

// src/lib/wallet-kit/config/AomiWalletKitProvider.tsx
import { Fragment as Fragment2, jsx as jsx3 } from "react/jsx-runtime";
var defaultNetworks = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
  monad,
  monadTestnet
];
function ExternalWalletComposerProvider({
  account,
  children,
  evmRuntime,
  execution,
  svmRuntime,
  supportedChains
}) {
  const authRuntime = useMemo4(
    () => ({
      provider: "none",
      status: "unauthenticated",
      methods: [],
      canOpenModal: false
    }),
    []
  );
  const executionRuntime = useMemo4(
    () => ({
      sponsorship: resolveExecutionSponsorshipIdentity(execution),
      evm: buildEvmExecutionRuntime(evmRuntime, {
        aaModes: execution?.modes,
        aaOwner: execution?.owner ?? "auto",
        aaPolicy: execution?.aa ?? "optional",
        aaProvider: execution?.provider ?? "auto",
        nativeWalletExecution: resolveConfiguredNativeWalletExecutionPolicy(execution),
        resolveAAProviderState: async (params, context) => resolveAAProviderState({
          ...params,
          ownerStrategy: { kind: "external-wallet" },
          walletClient: context.walletClient,
          address: context.address
        })
      })
    }),
    [evmRuntime, execution]
  );
  const accountRuntime = useResolvedAccountRuntime({
    account,
    auth: authRuntime,
    evm: evmRuntime,
    svm: svmRuntime
  });
  return /* @__PURE__ */ jsx3(
    AomiWalletKitComposer,
    {
      auth: authRuntime,
      account: accountRuntime,
      evm: evmRuntime,
      svm: svmRuntime,
      execution: executionRuntime,
      supportedChains,
      children
    }
  );
}
function ExternalWalletComposerSvmProvider({
  account,
  children,
  evmRuntime,
  execution,
  selectedSolanaNetwork,
  setSelectedSolanaNetworkId,
  supportedChains,
  supportedSolanaNetworks,
  preferDirectSend
}) {
  const svmWallet = useSafeSvmWallet();
  const svmRuntime = useSvmWalletRuntime({
    preferDirectSend,
    registryStore: evmRuntime.registryStore,
    selectedNetwork: selectedSolanaNetwork,
    supportedNetworks: supportedSolanaNetworks,
    setSelectedNetworkId: setSelectedSolanaNetworkId,
    wallet: svmWallet
  });
  return /* @__PURE__ */ jsx3(
    ExternalWalletComposerProvider,
    {
      account,
      evmRuntime,
      execution,
      svmRuntime,
      supportedChains,
      children
    }
  );
}
function EvmExternalWalletComposerProvider({
  account,
  children,
  execution,
  resolvedSvm,
  supportedChains
}) {
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
    storageKey: REGISTRY_STORAGE_KEY
  });
  if (resolvedSvm.enabled && resolvedSvm.activeNetwork) {
    return /* @__PURE__ */ jsx3(
      ExternalWalletComposerSvmProvider,
      {
        account,
        evmRuntime,
        execution,
        selectedSolanaNetwork,
        setSelectedSolanaNetworkId,
        supportedChains,
        supportedSolanaNetworks,
        preferDirectSend: resolvedSvm.preferDirectSend,
        children
      }
    );
  }
  return /* @__PURE__ */ jsx3(
    ExternalWalletComposerProvider,
    {
      account,
      evmRuntime,
      execution,
      supportedChains,
      children
    }
  );
}
function SvmExternalWalletComposerProvider({
  account,
  children,
  resolvedSvm
}) {
  const {
    selectedSolanaNetwork,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks
  } = useAomiWalletNetworkPreferences();
  const evmRuntime = useDisabledEvmWalletRuntime({
    storageKey: REGISTRY_STORAGE_KEY
  });
  if (resolvedSvm.enabled && resolvedSvm.activeNetwork) {
    return /* @__PURE__ */ jsx3(
      ExternalWalletComposerSvmProvider,
      {
        account,
        evmRuntime,
        selectedSolanaNetwork,
        setSelectedSolanaNetworkId,
        supportedChains: [],
        supportedSolanaNetworks,
        preferDirectSend: resolvedSvm.preferDirectSend,
        children
      }
    );
  }
  return /* @__PURE__ */ jsx3(
    ExternalWalletComposerProvider,
    {
      account,
      evmRuntime,
      supportedChains: [],
      children
    }
  );
}
function MaybeSvmWalletProvider({
  children,
  resolvedSvm
}) {
  const standardWalletAdapters = useStandardWalletAdapters([]);
  const walletAdapters = useMemo4(() => {
    const wanted = new Set(resolvedSvm.walletIds);
    return standardWalletAdapters.filter(
      (adapter) => wanted.has(canonicalWalletKey(adapter.name))
    );
  }, [resolvedSvm.walletIds, standardWalletAdapters]);
  if (!resolvedSvm.enabled || !resolvedSvm.activeNetwork) {
    return /* @__PURE__ */ jsx3(Fragment2, { children });
  }
  return /* @__PURE__ */ jsx3(ConnectionProvider, { endpoint: resolvedSvm.rpcHttpUrl, children: /* @__PURE__ */ jsx3(WalletProvider, { wallets: walletAdapters, autoConnect: true, children }) });
}
function WalletKitComposerOutlet({
  account,
  auth,
  authPlugin,
  children,
  execution,
  providers,
  resolvedSvm,
  routing,
  setSelectedSolanaNetworkId
}) {
  if (authPlugin?.renderComposer) {
    return /* @__PURE__ */ jsx3(Fragment2, { children: authPlugin.renderComposer({
      account,
      auth,
      children,
      execution,
      providers,
      selectedSolanaNetwork: resolvedSvm.activeNetwork,
      setSelectedSolanaNetworkId,
      solanaRuntimeConfig: resolvedSvm.enabled && resolvedSvm.activeNetwork ? {
        cluster: resolvedSvm.cluster,
        rpcHttpUrl: resolvedSvm.rpcHttpUrl,
        rpcWsUrl: resolvedSvm.rpcWsUrl,
        preferDirectSend: resolvedSvm.preferDirectSend
      } : void 0,
      supportedChains: routing.routedChains,
      supportedSolanaNetworks: resolvedSvm.networks
    }) });
  }
  return /* @__PURE__ */ jsx3(
    EvmExternalWalletComposerProvider,
    {
      account,
      execution,
      resolvedSvm,
      supportedChains: routing.routedChains,
      children
    }
  );
}
function AomiEvmExternalWalletProvider({
  account,
  auth,
  authPlugin,
  children,
  evmWallets,
  execution,
  providers,
  resolvedSvm,
  setSelectedSolanaNetworkId
}) {
  const chains = evmWallets?.chains ?? defaultNetworks;
  const routing = useFullTestnet(chains);
  const wagmiConfig = useMemo4(
    () => createAomiEvmConfig({
      chains: routing.routedChains,
      preset: evmWallets?.preset,
      wallets: evmWallets?.wallets,
      connectors: evmWallets?.connectors,
      walletConnectProjectId: evmWallets?.walletConnectProjectId,
      coinbase: evmWallets?.coinbase,
      appName: evmWallets?.appName,
      appLogoUrl: evmWallets?.appLogoUrl,
      transports: evmWallets?.transports
    }),
    [evmWallets, routing.routedChains]
  );
  const [queryClient] = useState(() => new QueryClient());
  const authPluginAvailable = authPlugin?.isAvailable?.({ auth, providers }) ?? true;
  const shouldUseAuthPlugin = Boolean(
    authPlugin?.renderComposer && authPluginAvailable
  );
  const wrapWithAuthProvider = authPlugin?.wrap ?? ((props) => /* @__PURE__ */ jsx3(Fragment2, { children: props.children }));
  return /* @__PURE__ */ jsx3(QueryClientProvider, { client: queryClient, children: wrapWithAuthProvider({
    auth,
    providers,
    children: /* @__PURE__ */ jsx3(AomiEvmRuntimeProvider, { config: wagmiConfig, children: /* @__PURE__ */ jsx3(MaybeSvmWalletProvider, { resolvedSvm, children: /* @__PURE__ */ jsx3(
      FullTestnetWalletRouter,
      {
        enabled: routing.enabled,
        chains: routing.routedChains,
        routedChainIds: routing.routedChainIds,
        children: /* @__PURE__ */ jsx3(
          WalletKitComposerOutlet,
          {
            account,
            auth,
            authPlugin: shouldUseAuthPlugin ? authPlugin : void 0,
            execution,
            providers,
            resolvedSvm,
            routing,
            setSelectedSolanaNetworkId,
            children
          }
        )
      }
    ) }) })
  }) });
}
function AomiSvmExternalWalletProvider({
  account,
  children,
  resolvedSvm
}) {
  const [queryClient] = useState(() => new QueryClient());
  return /* @__PURE__ */ jsx3(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsx3(MaybeSvmWalletProvider, { resolvedSvm, children: /* @__PURE__ */ jsx3(
    SvmExternalWalletComposerProvider,
    {
      account,
      resolvedSvm,
      children
    }
  ) }) });
}
function AomiExternalWalletProvider({
  account,
  auth,
  authPlugin,
  children,
  execution,
  providers,
  wallets
}) {
  const evmWallets = wallets?.evm === false ? void 0 : wallets?.evm;
  const evmEnabled = wallets?.evm !== false;
  const svmWallets = wallets?.solana === false ? false : wallets?.solana;
  const { selectedSolanaNetworkId, setSelectedSolanaNetworkId } = useAomiWalletNetworkPreferences();
  const resolvedSvm = useMemo4(
    () => resolveAomiSvmConfig(svmWallets, selectedSolanaNetworkId),
    [selectedSolanaNetworkId, svmWallets]
  );
  if (!evmEnabled) {
    return /* @__PURE__ */ jsx3(
      AomiSvmExternalWalletProvider,
      {
        account,
        resolvedSvm,
        children
      }
    );
  }
  return /* @__PURE__ */ jsx3(
    AomiEvmExternalWalletProvider,
    {
      account,
      auth,
      authPlugin,
      evmWallets,
      execution,
      providers,
      resolvedSvm,
      setSelectedSolanaNetworkId,
      children
    }
  );
}
function AomiWalletKitProviderBrowser(input) {
  const props = detectProviderSugar(input) ?? input;
  const presetProvider = props.preset && props.preset !== "wallets-only" ? props.preset : void 0;
  const auth = props.auth === void 0 && presetProvider ? { provider: presetProvider } : props.auth;
  const authProvider = auth !== false && auth?.provider ? auth.provider : void 0;
  const authPlugin = authProvider ? requireWalletProvider(authProvider) : void 0;
  const provider = presetProvider ?? (authProvider && authPlugin?.authMode !== "additive" ? authProvider : "none");
  if (provider !== "none") {
    requireWalletProvider(provider);
  }
  return /* @__PURE__ */ jsx3(
    AomiWalletNetworkPreferencesProvider,
    {
      evmChains: props.wallets?.evm === false ? [] : props.wallets?.evm?.chains ?? defaultNetworks,
      solanaNetworks: resolveAomiSvmConfig(
        props.wallets?.solana === false ? false : props.wallets?.solana
      ).networks,
      storageKey: "wallets-only",
      children: /* @__PURE__ */ jsx3(ExtUserProvider, { children: /* @__PURE__ */ jsx3(
        AomiExternalWalletProvider,
        {
          account: props.account,
          auth,
          authPlugin,
          execution: props.execution,
          providers: props.providers,
          wallets: props.wallets,
          children: props.children
        }
      ) })
    }
  );
}
function AomiWalletKitProvider(input) {
  const [mounted, setMounted] = useState(false);
  useEffect2(() => setMounted(true), []);
  if (!mounted) return null;
  return /* @__PURE__ */ jsx3(AomiWalletKitProviderBrowser, { ...input });
}

export {
  isFullTestnet,
  useFullTestnet,
  FullTestnetWalletRouter,
  AomiWalletKitProvider
};
//# sourceMappingURL=chunk-JUSFHFWL.js.map
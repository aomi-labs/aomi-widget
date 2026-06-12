"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
import type { Connector } from "wagmi";
import type { WalletEip712Payload, WalletTxPayload } from "@aomi-labs/react";
import {
  ExtUserProvider,
  toViemSignMessageArgs,
  toViemSignTypedDataArgs,
  UserState,
  useUser,
} from "@aomi-labs/react";
import { monad, monadTestnet } from "@aomi-labs/client";
import type ParaWeb from "@getpara/react-sdk";
import { AomiAuthAdapterProvider } from "../../context";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../../network-preferences";
import {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAddress,
  formatAuthMethod,
  inferAuthMethod,
} from "../../identity";
import {
  FullTestnetWalletRouter,
  useFullTestnet,
} from "../../full-testnet-wallet-routing";
import {
  useSafeCapabilities,
  useSafeConnect,
  useSafeConnectors,
  useSafeConnections,
  useSafeDisconnect,
  useSafeGetWalletClientFor,
  useSafeReconnect,
  useSafeSendCallsSync,
  useSafeSendTransaction,
  useSafeSignMessage,
  useSafeSignTypedData,
  useSafeSwitchAccount,
  useSafeSwitchChain,
  useSafeWagmiConfig,
  useSafeWalletClient,
} from "../../runtime/evm/safe-hooks";
import {
  canonicalWalletKey,
  dedupeWalletOptions,
  detectEvmProviderBrand,
  isProviderInternalWalletLabel,
  solanaWalletAllowlist,
  toEvmWalletOption,
  toSocialLoginOption,
  useInstalledWalletFlags,
  walletOptionIsDetected,
} from "../../runtime/evm/brands";
import { walletDebug } from "../../wallet-debug";
import type {
  AomiAccountCredential,
  AomiAuthAdapter,
  AomiAuthIdentity,
  AomiAuthMethod,
} from "../../types";
import {
  executeAdapterTransaction,
  getPreferredRpcUrl,
} from "../../wallet-execution";
import { resolveParaAAProviderState, resolveParaSponsorship } from "./para-aa";
import {
  AomiParaEvmRuntimeProvider,
  type AomiParaEvmRuntimeConfig,
} from "./para-evm-runtime";
import {
  DEFAULT_SOLANA_CLUSTER,
  normalizeSolanaNetworkOptions,
} from "../../runtime/solana/networks";
import { selectAccounts, selectEvmIdentity } from "../../registry/selectors";
import { planEvmAccountDisconnect } from "../../runtime/evm/disconnect-plan";
import {
  EVM_IDENTITY_GRACE_MS,
  REGISTRY_STORAGE_KEY,
} from "../../registry/types";
import { useWalletRegistry } from "../../registry/use-wallet-registry";
import { useWagmiRegistrySource } from "../../runtime/evm/registry-source";
import { useParaSessionSource } from "./sources/para-session-source";
import { useSolanaRegistrySource } from "../../runtime/solana/registry-source";
import {
  connectPreferredSolanaWallet,
  DEFAULT_SOLANA_ENDPOINT,
  ParaSolanaWrapper,
  buildParaSolanaMethods,
  detectSolanaTransport,
  getSolanaCapabilitySnapshot,
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

async function findConnectorByProviderBrand(
  connectors: readonly Connector[],
  expectedKey: string,
  excludeUid?: string,
): Promise<Connector | undefined> {
  for (const connector of connectors) {
    if (connector.uid === excludeUid || !connector.getProvider) continue;
    try {
      const provider = await connector.getProvider();
      const brand = detectEvmProviderBrand(provider);
      if (brand && canonicalWalletKey(brand) === expectedKey) {
        return connector;
      }
    } catch {
      // Keep trying other connectors; provider sniffing is best-effort.
    }
  }
  return undefined;
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
  const { walletClient } = useSafeWalletClient();
  const { switchChainAsync, isPending } = useSafeSwitchChain();
  const { disconnectAsync: wagmiDisconnectAsync } = useSafeDisconnect();
  const { reconnectAsync: wagmiReconnectAsync } = useSafeReconnect();
  const installedWalletFlags = useInstalledWalletFlags();
  const evmConnections = useSafeConnections();
  const evmConnectors = useSafeConnectors();
  const { connectAsync: wagmiConnectAsync } = useSafeConnect();
  const { switchAccountAsync } = useSafeSwitchAccount();
  const { sendTransactionAsync } = useSafeSendTransaction();
  const { sendCallsSyncAsync } = useSafeSendCallsSync();
  const { signTypedDataAsync } = useSafeSignTypedData();
  const { signMessageAsync } = useSafeSignMessage();
  const getWalletClientFor = useSafeGetWalletClientFor();
  const wagmiConfig = useSafeWagmiConfig();
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
  const registryExecutors = useMemo(
    () => ({
      async wagmiReconnect(stableIds: string[]) {
        if (!wagmiReconnectAsync) return;
        const targets: Connector[] = stableIds
          .map((stableId) =>
            evmConnectors.find((candidate) => candidate.id === stableId),
          )
          .filter((connector): connector is Connector => Boolean(connector));
        if (targets.length === 0) {
          walletDebug("registry:command-skip", {
            kind: "wagmi/reconnect",
            stableIds,
            reason: "connector-missing",
          });
          return;
        }
        const result = await wagmiReconnectAsync({
          connectors: targets,
        } as never);
        if (Array.isArray(result) && result.length === 0) {
          walletDebug("evm:heal", {
            action: "reconnect-empty",
            stableIds,
          });
        }
      },
      async wagmiConnect(stableId: string) {
        if (!wagmiConnectAsync) return;
        const target = evmConnectors.find(
          (candidate) => candidate.id === stableId,
        );
        if (!target) {
          walletDebug("registry:command-skip", {
            kind: "wagmi/connect",
            stableId,
            reason: "connector-missing",
          });
          return;
        }
        await wagmiConnectAsync({ connector: target });
      },
      async wagmiDisconnect(uid: string) {
        if (!wagmiDisconnectAsync) return;
        const target = wagmiConfig.connectors.find(
          (candidate) => candidate.uid === uid,
        );
        if (!target) {
          walletDebug("registry:command-skip", {
            kind: "wagmi/disconnect",
            uid,
            reason: "connector-missing",
          });
          return;
        }
        await wagmiDisconnectAsync({ connector: target });
      },
      paraLogout: logoutParaSession,
    }),
    [
      evmConnectors,
      logoutParaSession,
      wagmiConfig.connectors,
      wagmiConnectAsync,
      wagmiDisconnectAsync,
      wagmiReconnectAsync,
    ],
  );
  const { store: registryStore, state: registryState } = useWalletRegistry({
    executors: registryExecutors,
    storageKey: REGISTRY_STORAGE_KEY,
  });
  useWagmiRegistrySource(registryStore);
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
  const supportedChains = useMemo(
    () => configuredChains ?? wagmiConfig.chains,
    [configuredChains, wagmiConfig.chains],
  );

  const chainsById = useMemo<Record<number, Chain>>(
    () => Object.fromEntries(supportedChains.map((chain) => [chain.id, chain])),
    [supportedChains],
  );
  const activeEvmConnection = useMemo(() => {
    const active = registryState.activeByFamily.evm;
    if (!active) return undefined;
    return registryState.connections.find((connection) => {
      if (connection.family !== "evm") return false;
      if (active.uid && connection.uid === active.uid) return true;
      if (active.stableId && connection.stableId !== active.stableId) {
        return false;
      }
      return connection.address.toLowerCase() === active.address.toLowerCase();
    });
  }, [registryState.activeByFamily.evm, registryState.connections]);
  const activeConnector = useMemo(() => {
    const active = registryState.activeByFamily.evm;
    if (!active?.uid) return undefined;
    return wagmiConfig.connectors.find(
      (candidate) => candidate.uid === active.uid,
    );
  }, [registryState.activeByFamily.evm, wagmiConfig.connectors]);
  const { capabilities } = useSafeCapabilities({
    account: activeEvmConnection?.address as `0x${string}` | undefined,
    connector: activeConnector,
  });
  const registryEvmConnected = registryState.connections.some(
    (connection) => connection.family === "evm",
  );

  // Set while a site-initiated switch (selectNetwork/switchChain) is awaiting
  // the wallet, so wallet-originated chain sync below doesn't treat the
  // intermediate state as a new user preference.
  const evmSwitchInFlightRef = useRef(false);
  useEffect(() => {
    const chainId = activeEvmConnection?.chainId;
    if (
      evmSwitchInFlightRef.current ||
      !chainId ||
      !chainsById[chainId] ||
      chainId === selectedEvmChainId
    ) {
      return;
    }
    walletDebug("evm:chain-external-sync", {
      chainId,
      previous: selectedEvmChainId ?? null,
    });
    setSelectedEvmChainId(chainId);
  }, [
    chainsById,
    activeEvmConnection?.chainId,
    selectedEvmChainId,
    setSelectedEvmChainId,
  ]);

  // Timeline of the connection set — shows whether the wanted external
  // connection is restored at all after a refresh, and when it appears.
  useEffect(() => {
    walletDebug("evm:connections-changed", {
      connections: evmConnections.map((conn) => ({
        connector: conn.connectorName,
        uid: conn.connectorId,
        address: conn.address,
      })),
    });
  }, [evmConnections]);
  const { user } = useUser();
  const userAAMode = UserState.aaMode(user);
  const userSmartAccount4337 = UserState.SmartAccount4337(user);
  const userDelegation7702 = UserState.Delegation7702(user);
  const [evmIdentityGraceVersion, bumpEvmIdentityGrace] = useState(0);
  const registryDetachedParaAddresses = registryState.intents.paraDetached
    ? registryState.intents.droppedAddresses
    : [];
  const paraSessionLocallyDetached = Boolean(
    paraAccount.isConnected && registryState.intents.paraDetached,
  );

  const registryEvmIdentity = useMemo(() => {
    const identity = selectEvmIdentity(
      registryState,
      Date.now(),
      selectedEvmChainId,
    );
    if (
      paraSessionLocallyDetached &&
      identity.address &&
      registryDetachedParaAddresses.includes(identity.address.toLowerCase())
    ) {
      return {};
    }
    return identity;
  }, [
    evmIdentityGraceVersion,
    paraSessionLocallyDetached,
    registryDetachedParaAddresses,
    registryState,
    selectedEvmChainId,
  ]);
  const gracefulEvmIdentity = {
    identity: registryEvmIdentity,
    disconnectedAt: registryState.evmGrace.disconnectedAt,
    usingCachedIdentity: Boolean(
      registryState.evmGrace.disconnectedAt && registryEvmIdentity.address,
    ),
  };

  useEffect(() => {
    if (
      !gracefulEvmIdentity.usingCachedIdentity ||
      gracefulEvmIdentity.disconnectedAt === null
    ) {
      return;
    }

    const elapsed = Date.now() - gracefulEvmIdentity.disconnectedAt;
    const timeout = window.setTimeout(
      () => bumpEvmIdentityGrace((version) => version + 1),
      Math.max(0, EVM_IDENTITY_GRACE_MS - elapsed) + 1,
    );
    return () => window.clearTimeout(timeout);
  }, [
    gracefulEvmIdentity.disconnectedAt,
    gracefulEvmIdentity.usingCachedIdentity,
  ]);

  useEffect(() => {
    if (registryState.phase !== "stable") return;
    const rawRegistryAddress =
      registryState.activeByFamily.evm?.address.toLowerCase() ?? null;
    const registryAddress =
      paraSessionLocallyDetached &&
      rawRegistryAddress &&
      registryDetachedParaAddresses.includes(rawRegistryAddress)
        ? null
        : rawRegistryAddress;
    const liveAddress =
      gracefulEvmIdentity.identity.address?.toLowerCase() ?? null;
    if (registryAddress === liveAddress) return;
    walletDebug("registry:shadow-diff", {
      registryAddress,
      liveAddress,
      registryActive: registryState.activeByFamily.evm,
    });
  }, [
    gracefulEvmIdentity.identity.address,
    paraSessionLocallyDetached,
    registryDetachedParaAddresses,
    registryState.activeByFamily.evm,
    registryState.phase,
  ]);

  const adapter = useMemo<AomiAuthAdapter>(() => {
    const address = gracefulEvmIdentity.identity.address;
    const effectiveChainId = gracefulEvmIdentity.identity.chainId;
    const exposeParaSession =
      paraAccount.isConnected && !paraSessionLocallyDetached;
    const isConnected = Boolean(
      exposeParaSession ||
        registryEvmConnected ||
        address ||
        solanaWallet.publicKey,
    );
    const isBooting = paraAccount.isLoading && !isConnected;

    const embeddedPrimary = exposeParaSession
      ? (paraAccount.embedded.email ??
        paraAccount.embedded.farcasterUsername ??
        paraAccount.embedded.telegramUserId ??
        undefined)
      : undefined;
    const walletProvider = "para" as const;
    const paraAuthMethod = inferAuthMethod(paraAccount.embedded.authMethods);
    const authMethod = embeddedPrimary
      ? paraAuthMethod
      : address
        ? ("wagmi" as const)
        : undefined;
    const authValue = embeddedPrimary
      ? resolveParaAuthValue(paraAccount.embedded, paraAuthMethod)
      : undefined;
    const secondaryLabel = embeddedPrimary
      ? (formatAuthMethod(paraAuthMethod) ?? "Para")
      : (gracefulEvmIdentity.identity.walletName ??
        formatAuthMethod(authMethod) ??
        "Para");
    const { sponsored, sponsorProvider, sponsorAccount } =
      resolveParaSponsorship();

    const svmAddress = solanaWallet.publicKey;
    const solanaTransport = detectSolanaTransport(solanaWallet.walletName);
    const solanaCapabilities = getSolanaCapabilitySnapshot(solanaWallet);

    const builtAccounts = selectAccounts(
      registryState,
      Date.now(),
      selectedEvmChainId,
    ).filter((account) => {
      if (!paraSessionLocallyDetached) return true;
      if (account.family !== "evm") return true;
      const address = account.address.toLowerCase();
      if (registryDetachedParaAddresses.includes(address)) return false;
      return canonicalWalletKey(account.walletName ?? "") !== "para";
    });
    // Para's own embedded/social wallet is managed in the Para account modal
    // (openAccountUI). External wallets connected through Para (MetaMask,
    // Phantom, …) keep their own brand name and are managed in their own
    // extension, so they stay unmanaged here.
    const canManageParaAccount =
      Boolean(paraModal) && exposeParaSession && isConnected;
    const accounts = canManageParaAccount
      ? builtAccounts.map((account) =>
          canonicalWalletKey(account.walletName ?? "") === "para"
            ? { ...account, manageable: true }
            : account,
        )
      : builtAccounts;

    const identity: AomiAuthIdentity = isBooting
      ? {
          ...AOMI_AUTH_BOOTING_IDENTITY,
          chainId: effectiveChainId ?? undefined,
          svmAddress,
          solanaCluster: resolvedAdapterSolanaConfig.cluster,
          solanaWalletName: solanaWallet.walletName,
          solanaTransport: svmAddress ? solanaTransport : undefined,
          solanaCapabilities,
        }
      : isConnected && embeddedPrimary
        ? {
            status: "connected",
            isConnected: true,
            address,
            walletKind: "eoa",
            aaMode: userAAMode ?? "none",
            SmartAccount4337: userSmartAccount4337 ?? undefined,
            Delegation7702: userDelegation7702 ?? undefined,
            sponsored,
            sponsorProvider,
            sponsorAccount,
            chainId: effectiveChainId ?? undefined,
            svmAddress,
            walletProvider,
            authMethod,
            authProvider: authMethod,
            authValue,
            primaryLabel: embeddedPrimary,
            secondaryLabel,
            solanaCluster: resolvedAdapterSolanaConfig.cluster,
            solanaWalletName: solanaWallet.walletName,
            solanaTransport: svmAddress ? solanaTransport : undefined,
            solanaCapabilities,
          }
        : isConnected && address
          ? {
              status: "connected",
              isConnected: true,
              address,
              walletKind: "eoa",
              aaMode: userAAMode ?? "none",
              SmartAccount4337: userSmartAccount4337 ?? undefined,
              Delegation7702: userDelegation7702 ?? undefined,
              sponsored,
              sponsorProvider,
              sponsorAccount,
              chainId: effectiveChainId ?? undefined,
              svmAddress,
              walletProvider,
              authMethod,
              authProvider: authMethod,
              authValue,
              primaryLabel: formatAddress(address) ?? "Connected wallet",
              secondaryLabel,
              solanaCluster: resolvedAdapterSolanaConfig.cluster,
              solanaWalletName: solanaWallet.walletName,
              solanaTransport: svmAddress ? solanaTransport : undefined,
              solanaCapabilities,
            }
          : svmAddress
            ? {
                status: "connected",
                isConnected: true,
                walletKind: undefined,
                aaMode: undefined,
                chainId: effectiveChainId ?? undefined,
                svmAddress,
                walletProvider,
                authMethod,
                authProvider: authMethod,
                authValue,
                primaryLabel:
                  formatAddress(svmAddress) ?? "Connected Solana wallet",
                secondaryLabel: "Solana",
                solanaCluster: resolvedAdapterSolanaConfig.cluster,
                solanaWalletName: solanaWallet.walletName,
                solanaTransport,
                solanaCapabilities,
              }
            : {
                ...AOMI_AUTH_DISCONNECTED_IDENTITY,
                chainId: effectiveChainId ?? undefined,
                walletProvider,
                authMethod,
                authProvider: authMethod,
                authValue,
                solanaCluster: resolvedAdapterSolanaConfig.cluster,
              };

    const activeConnectorIsPara =
      activeConnector?.id === "para" ||
      canonicalWalletKey(activeConnector?.name ?? "") === "para";
    const shouldUseExternalSigner = Boolean(
      activeConnector && !activeConnectorIsPara,
    );

    const hasAnyDisconnectablePath = Boolean(
      wagmiDisconnectAsync || solanaWallet.disconnect,
    );

    // Map the wallet-adapter's `wallets` array to our descriptor shape so
    // the UI can render an explicit picker (Phantom, Solflare, …) instead
    // of auto-picking. Wallets with `Installed` show up first; the rest
    // are still listed so the user can click to trigger the install flow.
    const solanaWalletDescriptors = solanaWallet.wallets
      .filter((entry) =>
        solanaWalletAllowlist.has(canonicalWalletKey(entry.adapter.name)),
      )
      .map((entry) => ({
        name: entry.adapter.name,
        installed: entry.readyState === "Installed",
        ready:
          entry.readyState === "Installed" || entry.readyState === "Loadable",
      }));
    const evmWalletOptions = dedupeWalletOptions(
      evmConnectors
        .map((connector) => toEvmWalletOption(connector, installedWalletFlags))
        .filter(
          (option) =>
            !isProviderInternalWalletLabel(option.label) &&
            walletOptionIsDetected(option),
        ),
    );
    const socialLoginOptions = paraModal
      ? Array.from(oAuthMethods).map(toSocialLoginOption)
      : [];
    const requestSolanaConnect = (walletName: string) => {
      registryStore.dispatch({
        type: "solana/connect-requested",
        walletName,
        now: Date.now(),
      });
    };
    const settlePendingSolanaConnect = () => {
      const walletName = registryState.intents.pendingSolanaWallet;
      if (!walletName) return;
      registryStore.dispatch({
        type: "solana/connect-settled",
        walletName,
        now: Date.now(),
      });
    };

    return {
      identity,
      isReady: !isBooting,
      isSwitchingChain: isPending,
      // canConnect/canDisconnect are intentionally NOT gated on overall
      // `identity.isConnected`. With dual-family wallets (EVM + Solana
      // under one Para identity) the user can be connected on one family
      // while still wanting to connect the other, and vice versa for
      // disconnect. The picker's per-family sections check
      // `identity.address` / `identity.svmAddress` independently.
      canConnect: Boolean(paraModal) || Boolean(solanaWalletDescriptors.length),
      canOpenAccountUI:
        Boolean(paraModal) && exposeParaSession && identity.isConnected,
      canDisconnect: hasAnyDisconnectablePath,
      accounts,
      selectAccount: async (id: string) => {
        const target = accounts.find((account) => account.id === id);
        if (!target) {
          throw new Error(`Unknown account: ${id}`);
        }
        if (target.family === "evm") {
          const connection = registryStore
            .getSnapshot()
            .connections.find(
              (conn) => conn.family === "evm" && conn.uid === id,
            );
          if (!connection) return;
          registryStore.dispatch({
            type: "user/select-active",
            family: "evm",
            address: connection.address,
            uid: connection.uid,
            stableId: connection.stableId,
            now: Date.now(),
          });
          if (connection.uid === "para-session" || !switchAccountAsync) return;
          const connector = wagmiConfig.connectors.find(
            (candidate) => candidate.uid === connection.uid,
          );
          if (!connector) {
            console.warn(
              `[aomi-auth-adapter] selectAccount: connector not found for ${id}`,
            );
            return;
          }
          try {
            await switchAccountAsync({ connector });
          } catch (error) {
            walletDebug("active-evm:cosmetic-switch-failed", {
              uid: connection.uid,
              stableId: connection.stableId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          return;
        }
        // Solana is single-active; nothing to switch within the family.
      },
      evmWallets: evmWalletOptions,
      connectEvmWallet: async (id: string) => {
        const connectorOptions = evmConnectors.map((candidate) => ({
          connector: candidate,
          option: toEvmWalletOption(candidate, installedWalletFlags),
        }));
        const normalizedId = canonicalWalletKey(id);
        let target =
          connectorOptions.find(
            ({ option, connector }) => option.id === id || connector.uid === id,
          )?.connector ??
          connectorOptions.find(({ connector }) => connector.id === id)
            ?.connector ??
          connectorOptions.find(({ option, connector }) => {
            if (canonicalWalletKey(option.label) !== normalizedId) return false;
            if (canonicalWalletKey(connector.name ?? "") === "para")
              return false;
            return true;
          })?.connector;
        if (target?.getProvider) {
          try {
            const provider = await target.getProvider();
            const actualKey = canonicalWalletKey(
              detectEvmProviderBrand(provider) ?? "",
            );
            if (actualKey && actualKey !== normalizedId) {
              const replacement = await findConnectorByProviderBrand(
                connectorOptions.map(({ connector }) => connector),
                normalizedId,
                target.uid,
              );
              if (replacement) {
                walletDebug("evm:connect-brand-mismatch", {
                  requested: id,
                  selected: target.id,
                  actual: actualKey,
                  replacement: replacement.id,
                });
                target = replacement;
              }
            }
          } catch (error) {
            walletDebug("evm:connect-brand-sniff-failed", {
              requested: id,
              connector: target.id,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (target && wagmiConnectAsync) {
          walletDebug("evm:connect-target", {
            requested: id,
            connector: target.name,
            uid: target.uid,
            stableId: target.id,
          });
          if (canonicalWalletKey(target.name ?? "") === "para") {
            registryStore.dispatch({
              type: "user/para-reconnect-requested",
              now: Date.now(),
            });
          }
          const result = await wagmiConnectAsync({ connector: target });
          const connectedAddress = (
            result as { accounts?: readonly string[] } | undefined
          )?.accounts?.find((account) => account.startsWith("0x"));
          if (connectedAddress) {
            registryStore.dispatch({
              type: "user/connect-succeeded",
              family: "evm",
              address: connectedAddress,
              uid: target.uid,
              stableId: target.id,
              now: Date.now(),
            });
            registryStore.dispatch({
              type: "user/select-active",
              family: "evm",
              address: connectedAddress,
              uid: target.uid,
              stableId: target.id,
              now: Date.now(),
            });
          }
          return;
        }
        registryStore.dispatch({
          type: "user/para-reconnect-requested",
          now: Date.now(),
        });
        startParaAuthFlow("para-evm-connect-fallback");
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      socialLoginOptions,
      connectSocial: async () => {
        registryStore.dispatch({
          type: "user/para-reconnect-requested",
          now: Date.now(),
        });
        startParaAuthFlow("para-social-login");
        paraModal?.openModal({ step: "AUTH_ALL_OPTIONS" });
      },
      solanaWallets: solanaWalletDescriptors,
      connectSolanaWallet:
        solanaWallet.select && solanaWallet.connect
          ? async (walletName: string) => {
              const target = solanaWallet.wallets.find(
                (entry) => entry.adapter.name === walletName,
              );
              if (!target) {
                throw new Error(`Unknown Solana wallet: ${walletName}`);
              }
              // If the wallet is already the selected one and there's a
              // live connection, just no-op. Otherwise (re-)select then
              // ask the effect to wait for the adapter to swap before
              // it kicks off the connect.
              if (
                solanaWallet.walletName === walletName &&
                solanaWallet.publicKey
              ) {
                return;
              }
              solanaWallet.select!(walletName as never);
              requestSolanaConnect(walletName);
            }
          : undefined,
      supportedChains,
      supportedNetworks: {
        evm: supportedChains,
        solana: supportedSolanaNetworks,
      },
      solanaNetworkSwitchRequiresReconnect: Boolean(solanaWallet.publicKey),
      connect: async (options) => {
        const requestedFamily = options?.family ?? "evm";
        if (requestedFamily === "solana" && !solanaWallet.publicKey) {
          // Solana doesn't need an EVM Para session first — the wallet
          // adapter can attach independently. Previously we gated this
          // on `paraAccount.isConnected`, which forced users to log into
          // Para EVM before being able to connect Phantom/Solflare even
          // if they only wanted to use a Solana-only app like byreal
          // spot. Try the wallet-adapter path first; only fall back to
          // the Para AUTH modal if no Solana wallet is available locally
          // (in which case Para's modal is the user's path to wire
          // signing up via embedded wallets / OAuth → Para's Solana
          // wallet).
          try {
            const result = await connectPreferredSolanaWallet(solanaWallet);
            if (result.status === "connected") {
              settlePendingSolanaConnect();
              return;
            }
            if (result.status === "selecting") {
              requestSolanaConnect(result.walletName);
              return;
            }
          } catch (error) {
            console.warn(
              "[aomi-auth-adapter] Initial Solana wallet attach failed",
              error,
            );
            // Fall through to Para modal so the user can still reach a
            // sign-in path (e.g. embedded Solana via Para social login).
          }
        }
        if (requestedFamily === "evm" && (address || registryEvmConnected)) {
          // Already have a live EVM connection — don't reopen the Para modal.
          return;
        }
        registryStore.dispatch({
          type: "user/para-reconnect-requested",
          now: Date.now(),
        });
        startParaAuthFlow("para-auth-modal");
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      disconnect: async (options) => {
        if (options?.accountId) {
          const target = accounts.find((a) => a.id === options.accountId);
          if (target?.family === "evm") {
            const disconnectPlan = planEvmAccountDisconnect({
              target,
              connections: evmConnections,
            });
            walletDebug("evm:account-sign-out", {
              wallet: target.walletName ?? null,
              address: disconnectPlan.targetAddress,
              isParaAccount: disconnectPlan.isParaAccount,
              disconnecting: [...disconnectPlan.connectorIds],
              othersRemain: disconnectPlan.otherConnectionsRemain,
              sameAddressRemains: disconnectPlan.sameAddressConnectionsRemain,
            });
            registryStore.dispatch({
              type: "user/disconnect-account",
              address: disconnectPlan.targetAddress,
              uids: [...disconnectPlan.connectorIds],
              isParaAccount: disconnectPlan.isParaAccount,
              othersRemain: disconnectPlan.otherConnectionsRemain,
              markDroppedAddress: disconnectPlan.shouldMarkDroppedAddress,
              now: Date.now(),
            });
            if (
              disconnectPlan.isParaAccount &&
              disconnectPlan.otherConnectionsRemain
            ) {
              walletDebug("para:detach", {
                address: disconnectPlan.targetAddress,
                reason: "preserve-external-wallets",
              });
            }
            return;
          }
          // accountId was provided but is not a disconnectable EVM account —
          // bail rather than falling through to a family-wide disconnect.
          return;
        }

        const requestedFamily = options?.family ?? "all";
        const wantsAll = requestedFamily === "all";
        startParaAuthFlow(wantsAll ? "para-logout" : "family-disconnect");

        // Solana family disconnect: detach the wallet-adapter session so
        // `useSafeSolanaWallet().publicKey` clears. The Para account
        // record itself stays — drop "all" if the user explicitly asked
        // to wipe everything.
        if (
          (wantsAll || requestedFamily === "solana") &&
          solanaWallet.publicKey &&
          solanaWallet.disconnect
        ) {
          try {
            await solanaWallet.disconnect();
          } catch (error) {
            console.warn(
              "[aomi-auth-adapter] Solana wallet disconnect failed",
              error,
            );
          }
        }

        registryStore.dispatch({
          type: "user/disconnect-family",
          family: requestedFamily,
          now: Date.now(),
        });
      },
      openAccountUI: async (options) => {
        const requestedFamily = options?.family ?? "evm";
        if (requestedFamily === "solana" && !solanaWallet.publicKey) {
          try {
            const result = await connectPreferredSolanaWallet(solanaWallet);
            if (result.status === "connected") {
              settlePendingSolanaConnect();
              return;
            }
            if (result.status === "selecting") {
              requestSolanaConnect(result.walletName);
              return;
            }
          } catch (error) {
            console.warn(
              "[aomi-auth-adapter] Solana wallet attach failed",
              error,
            );
            return;
          }
        }
        startParaAuthFlow("para-account-modal");
        paraModal?.openModal({ step: "ACCOUNT_MAIN" });
      },
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            setSelectedEvmChainId(nextChainId);
            evmSwitchInFlightRef.current = true;
            try {
              await switchChainAsync({
                chainId: nextChainId,
                connector: activeConnector,
              });
            } finally {
              evmSwitchInFlightRef.current = false;
            }
          }
        : undefined,
      selectNetwork: async (target) => {
        if (target.family === "evm") {
          setSelectedEvmChainId(target.chainId);
          if (
            switchChainAsync &&
            activeConnector &&
            activeEvmConnection?.chainId !== target.chainId
          ) {
            evmSwitchInFlightRef.current = true;
            try {
              await switchChainAsync({
                chainId: target.chainId,
                connector: activeConnector,
              });
            } finally {
              evmSwitchInFlightRef.current = false;
            }
          }
          return;
        }

        settlePendingSolanaConnect();
        if (selectedSolanaNetwork?.id === target.networkId) {
          return;
        }
        if (solanaWallet.publicKey && solanaWallet.disconnect) {
          await solanaWallet.disconnect();
        }
        setSelectedSolanaNetworkId(target.networkId);
      },
      sendTransaction: sendTransactionAsync
        ? async (payload: WalletTxPayload) => {
            const result = await executeAdapterTransaction({
              payload,
              state: {
                currentChainId: effectiveChainId,
                capabilities,
                sendCallsSyncAsync: sendCallsSyncAsync
                  ? async (args) =>
                      sendCallsSyncAsync({
                        ...args,
                        connector: activeConnector,
                      })
                  : undefined,
                sendTransactionAsync: async (args) =>
                  sendTransactionAsync({
                    ...args,
                    connector: activeConnector,
                  }),
                switchChainAsync: switchChainAsync
                  ? async ({ chainId }) =>
                      switchChainAsync({
                        chainId,
                        connector: activeConnector,
                      })
                  : undefined,
                chainsById,
                getPreferredRpcUrl,
              },
              shouldUseExternalSigner,
              resolveAAProviderState: async (params) =>
                resolveParaAAProviderState({
                  ...params,
                  paraSession,
                  walletClient: shouldUseExternalSigner
                    ? await getWalletClientFor({
                        connector: activeConnector,
                        chainId: params.callList[0]?.chainId,
                      })
                    : walletClient,
                  address,
                }),
              forceAA: true,
              preferAAForSingleCall: true,
            });
            return result;
          }
        : undefined,
      signTypedData: signTypedDataAsync
        ? async (payload: WalletEip712Payload) => {
            const signArgs = toViemSignTypedDataArgs(payload);
            if (!signArgs) {
              throw new Error("Missing typed_data payload");
            }
            const signature = await signTypedDataAsync({
              ...(signArgs as Record<string, unknown>),
              connector: activeConnector,
            } as never);
            return { signature };
          }
        : undefined,
      signMessage: signMessageAsync
        ? async (payload: WalletEip712Payload) => {
            const messageArgs = toViemSignMessageArgs(payload);
            if (!messageArgs) {
              throw new Error("Missing non_typed_data payload");
            }
            const signature = await signMessageAsync({
              ...(messageArgs as Record<string, unknown>),
              connector: activeConnector,
            } as never);
            return { signature };
          }
        : undefined,
      getAccountCredential: exposeParaSession
        ? (issueJwt ?? undefined)
        : undefined,
      ...buildParaSolanaMethods(solanaWallet, resolvedAdapterSolanaConfig),
    };
  }, [
    activeEvmConnection?.chainId,
    activeConnector,
    capabilities,
    chainsById,
    evmConnections,
    evmConnectors,
    gracefulEvmIdentity.identity.address,
    gracefulEvmIdentity.identity.chainId,
    gracefulEvmIdentity.identity.connectorId,
    gracefulEvmIdentity.identity.walletName,
    installedWalletFlags,
    isPending,
    issueJwt,
    oAuthMethods,
    paraAccount.embedded,
    paraAccount.external,
    paraAccount.isConnected,
    paraAccount.isLoading,
    paraSessionLocallyDetached,
    paraModal,
    paraSession,
    sendCallsSyncAsync,
    sendTransactionAsync,
    signMessageAsync,
    signTypedDataAsync,
    resolvedAdapterSolanaConfig,
    registryStore,
    registryState,
    registryEvmConnected,
    selectedEvmChainId,
    selectedSolanaNetwork,
    solanaWallet,
    startParaAuthFlow,
    supportedSolanaNetworks,
    supportedChains,
    switchAccountAsync,
    switchChainAsync,
    userAAMode,
    userDelegation7702,
    userSmartAccount4337,
    wagmiConnectAsync,
    wagmiConfig.connectors,
    wagmiDisconnectAsync,
    walletClient,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId,
  ]);

  return (
    <AomiAuthAdapterProvider value={adapter}>
      {children}
    </AomiAuthAdapterProvider>
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

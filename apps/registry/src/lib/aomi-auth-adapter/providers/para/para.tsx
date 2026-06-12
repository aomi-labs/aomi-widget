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
  useEvmWalletRuntime,
  type EvmWalletRuntimeProviderHooks,
} from "../../runtime/evm/wallet-runtime";
import {
  canonicalWalletKey,
  toSocialLoginOption,
} from "../../runtime/evm/brands";
import { buildSolanaWalletDescriptors } from "../../runtime/solana/wallet-runtime";
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
import {
  EVM_IDENTITY_GRACE_MS,
  REGISTRY_STORAGE_KEY,
} from "../../registry/types";
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
  const {
    activeConnector,
    canDisconnectEvm,
    capabilities,
    chainsById,
    connectEvmWallet,
    disconnectEvmAccount,
    evmWalletOptions,
    getWalletClientFor,
    registryEvmConnected,
    selectEvmAccount,
    sendCallsSyncAsync,
    sendTransactionAsync,
    shouldUseExternalSigner,
    signMessageAsync,
    signTypedDataAsync,
    supportedChains,
    switchChainAsync,
    switchEvmChain,
    walletClient,
  } = evmRuntime;
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
    const identity = evmRuntime.selectEvmIdentity(Date.now());
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
    evmRuntime,
    paraSessionLocallyDetached,
    registryDetachedParaAddresses,
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

    const builtAccounts = evmRuntime
      .selectAccounts(Date.now())
      .filter((account) => {
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

    const hasAnyDisconnectablePath = Boolean(
      canDisconnectEvm || solanaWallet.disconnect,
    );

    const solanaWalletDescriptors =
      buildSolanaWalletDescriptors(solanaWallet);
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
      isSwitchingChain: evmRuntime.isSwitchingChain,
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
          await selectEvmAccount(id);
          return;
        }
        // Solana is single-active; nothing to switch within the family.
      },
      evmWallets: evmWalletOptions,
      connectEvmWallet,
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
            await disconnectEvmAccount(target);
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
      switchChain: switchChainAsync ? switchEvmChain : undefined,
      selectNetwork: async (target) => {
        if (target.family === "evm") {
          await switchEvmChain(target.chainId);
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
    activeConnector,
    canDisconnectEvm,
    capabilities,
    chainsById,
    connectEvmWallet,
    disconnectEvmAccount,
    evmRuntime,
    evmWalletOptions,
    gracefulEvmIdentity.identity.address,
    gracefulEvmIdentity.identity.chainId,
    gracefulEvmIdentity.identity.walletName,
    getWalletClientFor,
    issueJwt,
    oAuthMethods,
    paraAccount.embedded,
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
    selectEvmAccount,
    selectedSolanaNetwork,
    shouldUseExternalSigner,
    solanaWallet,
    startParaAuthFlow,
    setSelectedSolanaNetworkId,
    supportedChains,
    supportedSolanaNetworks,
    switchChainAsync,
    switchEvmChain,
    userAAMode,
    userDelegation7702,
    userSmartAccount4337,
    walletClient,
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

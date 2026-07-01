"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Environment,
  ParaProvider,
  useAccount as useParaAccount,
  useClient as useParaClient,
  useIssueJwt,
  useModal,
  type TExternalWallet,
  type TOAuthMethod,
} from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Chain, Hex, Transport } from "viem";
import { http } from "viem";
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
import {
  createAAProviderState,
  monad,
  monadTestnet,
  type AAMode,
  type AAProvider,
} from "@aomi-labs/client";
import type ParaWeb from "@getpara/react-sdk";
import { AomiAuthAdapterProvider } from "../context";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../network-preferences";
import {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAddress,
  formatAuthMethod,
  inferAuthMethod,
} from "../identity";
import {
  FullTestnetWalletRouter,
  useFullTestnet,
} from "../full-testnet-wallet-routing";
import {
  useSafeCapabilities,
  useSafeConnections,
  useSafeDisconnect,
  useSafeReconnect,
  useSafeSendCallsSync,
  useSafeSendTransaction,
  useSafeSignMessage,
  useSafeSignTypedData,
  useSafeSwitchAccount,
  useSafeSwitchChain,
  useSafeWagmiAccount,
  useSafeWagmiConfig,
  useSafeWalletClient,
} from "../safe-wagmi-hooks";
import { buildAccounts } from "../accounts";
import type {
  AomiEmbeddedCredential,
  AomiAuthAdapter,
  AomiAuthIdentity,
  AomiAuthMethod,
  WalletFamily,
} from "../types";
import {
  executeAdapterTransaction,
  getPreferredRpcUrl,
  type RequestedAAMode,
  type WalletExecutionCallList,
  type WalletProviderState,
} from "../wallet-execution";
import {
  DEFAULT_SOLANA_CLUSTER,
  normalizeSolanaNetworkOptions,
} from "../solana-networks";
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
  connectionType?: "embedded" | "external" | "both" | "none";
  embedded: {
    isConnected?: boolean;
    isGuestMode?: boolean;
    userId?: string;
    auth?: {
      email?: string;
      phone?: string;
      farcasterUsername?: string;
      telegramUserId?: string;
      externalWalletAddress?: string;
    };
    authType?: string;
    identifier?: string;
    email?: string;
    phone?: string;
    farcasterUsername?: string;
    telegramUserId?: string;
    externalWalletAddress?: string;
    authMethods?: Set<unknown>;
    wallets?: Array<{ address?: string; type?: string; isExternal?: boolean }>;
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

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim() ?? "";
const ALCHEMY_GAS_POLICY_ID =
  process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID?.trim();
const PIMLICO_API_KEY = process.env.NEXT_PUBLIC_PIMLICO_API_KEY?.trim() ?? "";
const AA_PROVIDER_OVERRIDE =
  process.env.NEXT_PUBLIC_AA_PROVIDER?.trim().toLowerCase();

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
  | (() => Promise<AomiEmbeddedCredential | null>)
  | null {
  try {
    const { issueJwtAsync } = useIssueJwt();
    return async () => {
      const result = await issueJwtAsync();
      const jwt = result?.token?.trim();
      return jwt
        ? {
            provider: "para",
            providerJwt: jwt,
          }
        : null;
    };
  } catch {
    return null;
  }
}

function resolveAAProvider(): AAProvider | null {
  if (
    AA_PROVIDER_OVERRIDE === "alchemy" ||
    AA_PROVIDER_OVERRIDE === "pimlico"
  ) {
    return AA_PROVIDER_OVERRIDE;
  }

  if (ALCHEMY_API_KEY) return "alchemy";
  if (PIMLICO_API_KEY) return "pimlico";
  return null;
}

function resolveParaSponsorship(): {
  sponsored: boolean;
  sponsorProvider: AomiAuthIdentity["sponsorProvider"];
  sponsorAccount: AomiAuthIdentity["sponsorAccount"];
} {
  const aaProvider = resolveAAProvider();
  if (aaProvider === "alchemy") {
    return {
      sponsored: Boolean(ALCHEMY_GAS_POLICY_ID),
      sponsorProvider: "alchemy",
      sponsorAccount: ALCHEMY_GAS_POLICY_ID || undefined,
    };
  }
  if (aaProvider === "pimlico") {
    return {
      sponsored: Boolean(PIMLICO_API_KEY),
      sponsorProvider: "pimlico",
      sponsorAccount: undefined,
    };
  }
  return {
    sponsored: false,
    sponsorProvider: "self",
    sponsorAccount: undefined,
  };
}

async function resolveParaAAProviderState({
  callList,
  chainsById,
  requestedMode,
  shouldUseExternalSigner,
  paraSession,
  walletClient,
  address,
  sponsored,
}: {
  callList: WalletExecutionCallList;
  chainsById: Record<number, Chain>;
  requestedMode: Exclude<RequestedAAMode, "none">;
  shouldUseExternalSigner: boolean;
  paraSession: ParaWeb | null;
  walletClient: ReturnType<typeof useSafeWalletClient>["walletClient"];
  address: string | undefined;
  sponsored?: boolean;
}): Promise<{
  providerState: WalletProviderState;
  resolvedMode: RequestedAAMode;
  fallbackReason?: string;
}> {
  let resolvedMode: RequestedAAMode = requestedMode;
  let fallbackReason: string | undefined;
  if (requestedMode === "7702" && shouldUseExternalSigner) {
    resolvedMode = "4337";
    fallbackReason = "requested_7702_connected_wallet_fallback_4337";
  }

  const provider = resolveAAProvider();
  if (!provider) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ?? "aa_provider_not_configured_fallback_eoa",
    };
  }

  if (!paraSession) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason: fallbackReason ?? "para_session_unavailable_fallback_eoa",
    };
  }

  const chainId = callList[0]?.chainId;
  const chain = chainId ? chainsById[chainId] : undefined;
  if (!chainId || !chain) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason: fallbackReason ?? "aa_chain_not_supported_fallback_eoa",
    };
  }

  const apiKey =
    provider === "alchemy"
      ? ALCHEMY_API_KEY || undefined
      : PIMLICO_API_KEY || undefined;
  if (!apiKey) {
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ?? `aa_${provider}_api_key_missing_fallback_eoa`,
    };
  }

  const ownerBase = {
    kind: "session" as const,
    adapter: "para",
    session: paraSession,
    address: address as Hex | undefined,
  };
  const owner =
    shouldUseExternalSigner && walletClient
      ? {
          ...ownerBase,
          signer: walletClient,
        }
      : ownerBase;

  try {
    const state = await createAAProviderState({
      provider,
      owner,
      chain,
      rpcUrl: getPreferredRpcUrl(chain),
      callList,
      mode: resolvedMode as AAMode,
      apiKey,
      gasPolicyId: provider === "alchemy" ? ALCHEMY_GAS_POLICY_ID : undefined,
      sponsored,
    });

    if (!state.account || state.error) {
      console.warn("[aomi-auth-adapter] AA unavailable; falling back to EOA", {
        provider,
        mode: resolvedMode,
        error: state.error?.message ?? "account_unavailable",
      });
      return {
        providerState: { resolved: null, pending: false, error: null },
        resolvedMode,
        fallbackReason:
          fallbackReason ?? `aa_${provider}_account_unavailable_fallback_eoa`,
      };
    }

    return {
      providerState: state,
      resolvedMode,
      fallbackReason,
    };
  } catch (error) {
    console.warn("[aomi-auth-adapter] AA init failed; falling back to EOA", {
      provider,
      mode: resolvedMode,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      providerState: { resolved: null, pending: false, error: null },
      resolvedMode,
      fallbackReason:
        fallbackReason ?? `aa_${provider}_initialization_failed_fallback_eoa`,
    };
  }
}

export type AomiParaAdapterProviderProps = {
  children: ReactNode;
  supportedChains?: readonly Chain[];
  solanaConfig?: ResolvedSolanaConfig;
};

export function AomiParaAdapterProvider({
  children,
  supportedChains: configuredChains,
  solanaConfig,
}: AomiParaAdapterProviderProps) {
  const [pendingSolanaConnect, setPendingSolanaConnect] = useState(false);
  const paraAccount = useSafeParaAccount();
  const paraSession = useSafeParaClient();
  const issueJwt = useSafeIssueJwt();
  const paraModal = useSafeParaModal();
  const {
    address: wagmiAddress,
    chainId,
    isConnected: wagmiConnected,
    connector,
  } = useSafeWagmiAccount();
  const { walletClient } = useSafeWalletClient();
  const { switchChainAsync, isPending } = useSafeSwitchChain();
  const { disconnectAsync: wagmiDisconnectAsync } = useSafeDisconnect();
  const { reconnect: wagmiReconnect } = useSafeReconnect();
  const evmConnections = useSafeConnections();
  const { switchAccountAsync } = useSafeSwitchAccount();
  const { sendTransactionAsync } = useSafeSendTransaction();
  const { sendCallsSyncAsync } = useSafeSendCallsSync();
  const { capabilities } = useSafeCapabilities();
  const { signTypedDataAsync } = useSafeSignTypedData();
  const { signMessageAsync } = useSafeSignMessage();
  const wagmiConfig = useSafeWagmiConfig();
  const solanaWallet = useSafeSolanaWallet();
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

  useEffect(() => {
    if (
      !wagmiConnected ||
      !selectedEvmChainId ||
      !switchChainAsync ||
      chainId === selectedEvmChainId
    ) {
      return;
    }
    void switchChainAsync({ chainId: selectedEvmChainId });
  }, [chainId, selectedEvmChainId, switchChainAsync, wagmiConnected]);

  // Keep the EVM (wagmi) connection alive across Para's session re-init.
  // When a Solana wallet attaches, Para re-initializes its shared session and
  // resets the in-memory wagmi state — the EVM connection survives in wagmi
  // storage (a page refresh restores it via autoConnect) but reads as
  // disconnected in-session. We reproduce that refresh-time recovery here:
  // if wagmi reads disconnected while the Para session is alive and we had an
  // EVM connection earlier this session, call wagmi `reconnect()`. It only
  // restores connectors persisted in storage, so it is a no-op after a
  // deliberate user disconnect (which clears storage) — it can't fight the
  // user or loop (guarded to one attempt until the connection is restored).
  const hadEvmConnectionRef = useRef(false);
  const evmReconnectAttemptedRef = useRef(false);
  useEffect(() => {
    if (wagmiConnected) {
      hadEvmConnectionRef.current = true;
      evmReconnectAttemptedRef.current = false;
      return;
    }
    if (
      hadEvmConnectionRef.current &&
      paraAccount.isConnected &&
      !evmReconnectAttemptedRef.current &&
      wagmiReconnect
    ) {
      evmReconnectAttemptedRef.current = true;
      void Promise.resolve(wagmiReconnect()).catch((error) => {
        console.warn("[aomi-auth-adapter] EVM auto-reconnect failed", error);
      });
    }
  }, [paraAccount.isConnected, wagmiConnected, wagmiReconnect]);

  useEffect(() => {
    if (pendingSolanaConnect && solanaWallet.publicKey) {
      setPendingSolanaConnect(false);
      return;
    }

    if (
      !pendingSolanaConnect ||
      solanaWallet.connecting ||
      !solanaWallet.walletName ||
      !solanaWallet.connect
    ) {
      return;
    }

    let cancelled = false;
    void solanaWallet
      .connect()
      .catch((error) => {
        console.warn("[aomi-auth-adapter] Solana wallet connect failed", error);
      })
      .finally(() => {
        if (!cancelled) {
          setPendingSolanaConnect(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    pendingSolanaConnect,
    solanaWallet.connect,
    solanaWallet.connecting,
    solanaWallet.publicKey,
    solanaWallet.walletName,
  ]);

  const { user } = useUser();
  const userAAMode = UserState.aaMode(user);
  const userSmartAccount4337 = UserState.SmartAccount4337(user);
  const userDelegation7702 = UserState.Delegation7702(user);

  const adapter = useMemo<AomiAuthAdapter>(() => {
    const isParaConnected = Boolean(
      paraAccount.isConnected || paraAccount.embedded.isConnected,
    );
    const isConnected = Boolean(isParaConnected || wagmiConnected);
    const isBooting = paraAccount.isLoading && !isConnected;

    const authMethod = inferParaAuthMethod(paraAccount.embedded);
    const authValue = resolveParaAuthValue(paraAccount.embedded, authMethod);
    const embeddedPrimary =
      authValue ??
      paraAccount.embedded.identifier ??
      paraAccount.embedded.userId ??
      undefined;
    const embeddedWallet =
      paraAccount.embedded.wallets?.find(
        (wallet) => wallet.address && wallet.type?.toUpperCase() === "EVM",
      ) ?? paraAccount.embedded.wallets?.find((wallet) => wallet.address);
    const embeddedAddress = embeddedWallet?.address;
    const externalAddress = paraAccount.external.evm?.address;
    const address =
      wagmiAddress ?? externalAddress ?? embeddedAddress ?? undefined;
    const walletProvider = "para" as const;
    const secondaryLabel = formatAuthMethod(authMethod) ?? "Para";
    const { sponsored, sponsorProvider, sponsorAccount } =
      resolveParaSponsorship();

    const svmAddress = solanaWallet.publicKey;
    const solanaTransport = detectSolanaTransport(solanaWallet.walletName);
    const solanaCapabilities = getSolanaCapabilitySnapshot(solanaWallet);

    const accounts = buildAccounts({
      evmConnections: evmConnections.map((conn) => ({
        id: conn.connectorId,
        walletName: conn.connectorName,
        address: conn.address,
        chainId: conn.chainId,
      })),
      activeEvmAddress: address,
      solanaConnections: svmAddress
        ? [{ publicKey: svmAddress, walletName: solanaWallet.walletName }]
        : [],
      activeSolanaAddress: svmAddress,
    });

    const connectedPrimaryLabel =
      embeddedPrimary ?? formatAddress(address) ?? "Para account";
    const hasEvmAddress = Boolean(address);

    const identity: AomiAuthIdentity = isBooting
      ? {
          ...AOMI_AUTH_BOOTING_IDENTITY,
          chainId: chainId ?? undefined,
          svmAddress,
          solanaCluster: resolvedAdapterSolanaConfig.cluster,
          solanaWalletName: solanaWallet.walletName,
          solanaTransport: svmAddress ? solanaTransport : undefined,
          solanaCapabilities,
        }
      : isConnected
        ? {
            status: "connected",
            isConnected: true,
            address,
            walletKind: hasEvmAddress ? "eoa" : undefined,
            aaMode: hasEvmAddress ? (userAAMode ?? "none") : undefined,
            SmartAccount4337: hasEvmAddress
              ? (userSmartAccount4337 ?? undefined)
              : undefined,
            Delegation7702: hasEvmAddress
              ? (userDelegation7702 ?? undefined)
              : undefined,
            sponsored,
            sponsorProvider,
            sponsorAccount,
            // Fall back to the user's selected EVM network while wagmi hasn't
            // resolved the connected chain yet. The network selector already
            // shows `identity.chainId ?? selectedEvmChainId`; mirroring that
            // here keeps the chain reported to the backend (via setUser) in
            // sync with the UI, instead of leaving it undefined (which the
            // backend silently treats as Ethereum mainnet).
            chainId: chainId ?? (hasEvmAddress ? selectedEvmChainId : undefined),
            svmAddress,
            walletProvider,
            authMethod,
            authProvider: authMethod,
            authValue,
            walletProviderSubject: paraAccount.embedded.userId,
            primaryLabel: connectedPrimaryLabel,
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
              chainId: chainId ?? undefined,
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
              chainId: chainId ?? undefined,
              walletProvider,
              authMethod,
              authProvider: authMethod,
              authValue,
              solanaCluster: resolvedAdapterSolanaConfig.cluster,
            };

    const connectorName = connector?.name?.toLowerCase() ?? "";
    const isParaWallet = connectorName.includes("para");
    const shouldUseExternalSigner = Boolean(walletClient && !isParaWallet);

    const hasAnyDisconnectablePath = Boolean(
      wagmiDisconnectAsync ||
      solanaWallet.disconnect ||
      // Para's own session — `useParaClient().logout()` would also count
      // here, but Para's logout has cross-tab implications so we
      // currently leave it to `openAccountUI` (the Para account modal
      // has a Disconnect button) and only handle wagmi + Solana below.
      false,
    );

    // Map the wallet-adapter's `wallets` array to our descriptor shape so
    // the UI can render an explicit picker (Phantom, Solflare, …) instead
    // of auto-picking. Wallets with `Installed` show up first; the rest
    // are still listed so the user can click to trigger the install flow.
    const solanaWalletDescriptors = solanaWallet.wallets.map((entry) => ({
      name: entry.adapter.name,
      installed: entry.readyState === "Installed",
      ready:
        entry.readyState === "Installed" || entry.readyState === "Loadable",
    }));

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
      canOpenAccountUI: Boolean(paraModal) && identity.isConnected,
      canDisconnect: hasAnyDisconnectablePath,
      accounts,
      selectAccount: async (id: string) => {
        const target = accounts.find((account) => account.id === id);
        if (!target) {
          throw new Error(`Unknown account: ${id}`);
        }
        if (target.family === "evm") {
          const connection = evmConnections.find(
            (conn) => conn.connectorId === id,
          );
          if (connection && switchAccountAsync) {
            const connector = wagmiConfig.connectors.find(
              (c) => c.uid === connection.connectorId,
            );
            if (connector) {
              await switchAccountAsync({ connector });
            } else {
              console.warn(
                `[aomi-auth-adapter] selectAccount: connector not found for ${id}`,
              );
            }
          }
          return;
        }
        // Solana is single-active; nothing to switch within the family.
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
              if (solanaWallet.walletName === walletName) {
                await solanaWallet.connect?.();
                return;
              }
              solanaWallet.select!(walletName as never);
              setPendingSolanaConnect(true);
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
            if (result === "connected") {
              setPendingSolanaConnect(false);
              return;
            }
            if (result === "selecting") {
              setPendingSolanaConnect(true);
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
        if (requestedFamily === "evm" && wagmiAddress) {
          // Already have a live EVM connection — don't reopen the Para modal.
          return;
        }
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      disconnect: async (options) => {
        if (options?.accountId) {
          const target = accounts.find((a) => a.id === options.accountId);
          if (target?.family === "evm" && wagmiDisconnectAsync) {
            const connector = wagmiConfig.connectors.find(
              (c) => c.uid === target.id,
            );
            try {
              await wagmiDisconnectAsync(connector ? { connector } : undefined);
            } catch (error) {
              console.warn(
                "[aomi-auth-adapter] EVM account disconnect failed",
                error,
              );
            }
            return;
          }
          // accountId was provided but is not a disconnectable EVM account —
          // bail rather than falling through to a family-wide disconnect.
          return;
        }

        const requestedFamily = options?.family ?? "all";
        const wantsAll = requestedFamily === "all";

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

        if (
          (wantsAll || requestedFamily === "evm") &&
          wagmiConnected &&
          wagmiDisconnectAsync
        ) {
          try {
            await wagmiDisconnectAsync();
          } catch (error) {
            console.warn("[aomi-auth-adapter] Wagmi disconnect failed", error);
          }
        }

        // The Para embedded account survives wagmi/Solana disconnects
        // by design — that lets a user drop one external wallet without
        // losing their email/OAuth-backed Para session. To clear that
        // too the user opens the Para account modal (`canOpenAccountUI`)
        // and uses its Logout button. We don't call `paraSession.logout()`
        // here because Para's session is cross-tab and dropping it
        // silently from one tab leaves other tabs in an inconsistent
        // state.
      },
      openAccountUI: async (options) => {
        const requestedFamily = options?.family ?? "evm";
        if (requestedFamily === "solana" && !solanaWallet.publicKey) {
          try {
            const result = await connectPreferredSolanaWallet(solanaWallet);
            if (result === "connected") {
              setPendingSolanaConnect(false);
              return;
            }
            if (result === "selecting") {
              setPendingSolanaConnect(true);
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
        paraModal?.openModal({ step: "ACCOUNT_MAIN" });
      },
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            setSelectedEvmChainId(nextChainId);
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
      selectNetwork: async (target) => {
        if (target.family === "evm") {
          setSelectedEvmChainId(target.chainId);
          if (
            switchChainAsync &&
            wagmiConnected &&
            chainId !== target.chainId
          ) {
            await switchChainAsync({ chainId: target.chainId });
          }
          return;
        }

        setPendingSolanaConnect(false);
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
                currentChainId: chainId,
                capabilities,
                sendCallsSyncAsync,
                sendTransactionAsync,
                switchChainAsync,
                chainsById,
                getPreferredRpcUrl,
              },
              shouldUseExternalSigner,
              resolveAAProviderState: (params) =>
                resolveParaAAProviderState({
                  ...params,
                  paraSession,
                  walletClient,
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
            const signature = await signTypedDataAsync(signArgs as never);
            return { signature };
          }
        : undefined,
      signMessage: signMessageAsync
        ? async (payload: WalletEip712Payload) => {
            const messageArgs = toViemSignMessageArgs(payload);
            if (!messageArgs) {
              throw new Error("Missing non_typed_data payload");
            }
            const signature = await signMessageAsync(messageArgs as never);
            return { signature };
          }
        : undefined,
      getEmbeddedCredential: issueJwt ?? undefined,
      ...buildParaSolanaMethods(solanaWallet, resolvedAdapterSolanaConfig),
    };
  }, [
    capabilities,
    chainId,
    chainsById,
    connector,
    evmConnections,
    isPending,
    issueJwt,
    paraAccount.embedded,
    paraAccount.external,
    paraAccount.isConnected,
    paraAccount.isLoading,
    paraModal,
    paraSession,
    sendCallsSyncAsync,
    sendTransactionAsync,
    signMessageAsync,
    signTypedDataAsync,
    resolvedAdapterSolanaConfig,
    selectedEvmChainId,
    selectedSolanaNetwork,
    solanaWallet,
    supportedSolanaNetworks,
    supportedChains,
    switchAccountAsync,
    switchChainAsync,
    userAAMode,
    userDelegation7702,
    userSmartAccount4337,
    wagmiAddress,
    wagmiConfig.connectors,
    wagmiConnected,
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
  oAuthMethods = ["GOOGLE"],
  solana,
}: AomiParaProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const routing = useFullTestnet(networks);
  const { selectedSolanaNetworkId } = useAomiWalletNetworkPreferences();
  // Stable reference: an unmemoized `.filter()` returns a new array every render,
  // which busts the `externalWalletConfig` memo below and makes Para re-init
  // wagmi/WalletConnect each render (setState-in-render → "Maximum update depth").
  const resolvedWallets = useMemo(
    () =>
      walletConnectProjectId
        ? externalWallets
        : externalWallets.filter((wallet) => wallet !== "WALLETCONNECT"),
    [externalWallets, walletConnectProjectId],
  );
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
      disableEmailLogin: true,
      oAuthMethods,
    }),
    [oAuthMethods],
  );
  const externalWalletConfig = useMemo(
    () => ({
      appDescription,
      appUrl:
        appUrl ??
        (typeof window !== "undefined"
          ? window.location.origin
          : "https://aomi.dev"),
      wallets: resolvedWallets,
      ...(walletConnectProjectId
        ? { walletConnect: { projectId: walletConnectProjectId } }
        : {}),
      evmConnector: {
        config: {
          chains: routing.routedChains,
          transports,
          ssr: true,
        },
      },
    }),
    [
      appDescription,
      appUrl,
      routing.routedChains,
      resolvedWallets,
      transports,
      walletConnectProjectId,
    ],
  );

  // Stable references for the `ParaProvider` config props. Inline object literals
  // ({ apiKey, env } / { appName }) are new every render, making Para re-create
  // its Para client + wagmi config each render — the source of the post-login
  // "Maximum update depth exceeded" (ExternalWalletProvider setState-in-render).
  // `apiKey` is narrowed to a string at the `{apiKey ? …}` render guard below,
  // where this config is consumed; the memo runs earlier so we assert it here.
  const paraClientConfig = useMemo(
    () => ({ apiKey: apiKey as string, env: environment }),
    [apiKey, environment],
  );
  const paraAppConfig = useMemo(() => ({ appName }), [appName]);

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
        {apiKey ? (
          <ParaProvider
            paraClientConfig={paraClientConfig}
            config={paraAppConfig}
            paraModalConfig={paraModalConfig}
            externalWalletConfig={externalWalletConfig}
          >
            <ParaSolanaWrapper
              key={resolvedSolanaConfig.activeNetwork.id}
              enabled={solanaEnabled}
              config={solanaProviderConfig}
            >
              {(solanaReady) =>
                solanaReady ? (
                  <FullTestnetWalletRouter
                    enabled={routing.enabled}
                    chains={routing.routedChains}
                    routedChainIds={routing.routedChainIds}
                  >
                    <AomiParaAdapterProvider
                      supportedChains={routing.routedChains}
                      solanaConfig={resolvedSolanaConfig}
                    >
                      {children}
                    </AomiParaAdapterProvider>
                  </FullTestnetWalletRouter>
                ) : (
                  children
                )
              }
            </ParaSolanaWrapper>
          </ParaProvider>
        ) : (
          <AomiParaAdapterProvider
            supportedChains={routing.routedChains}
            solanaConfig={resolvedSolanaConfig}
          >
            {children}
          </AomiParaAdapterProvider>
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
    return embedded.telegramUserId ?? embedded.auth?.telegramUserId;
  }
  if (authMethod === "farcaster") {
    return embedded.farcasterUsername ?? embedded.auth?.farcasterUsername;
  }
  if (authMethod === "phone") {
    return embedded.phone ?? embedded.auth?.phone;
  }
  if (authMethod === "wagmi") {
    return (
      embedded.externalWalletAddress ?? embedded.auth?.externalWalletAddress
    );
  }
  if (!authMethod) {
    return undefined;
  }
  return embedded.email ?? embedded.auth?.email ?? embedded.identifier;
}

function inferParaAuthMethod(
  embedded: ParaAccountShape["embedded"],
): AomiAuthMethod | undefined {
  const authMethod = inferAuthMethod(embedded.authMethods);
  if (authMethod) return authMethod;

  const normalizedAuthType = embedded.authType?.toLowerCase();
  if (!normalizedAuthType) return undefined;
  if (normalizedAuthType === "externalwallet") return "wagmi";
  if (normalizedAuthType === "email") return "email";
  if (normalizedAuthType === "phone") return "phone";
  if (normalizedAuthType === "farcaster") return "farcaster";
  if (normalizedAuthType === "telegram") return "telegram";
  return undefined;
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

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
import type { Connector } from "wagmi";
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
  useSafeConnect,
  useSafeConnectors,
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
import { buildAccounts, type EvmConnectionInput } from "../accounts";
import type {
  AomiAccountCredential,
  AomiAuthAdapter,
  AomiAuthIdentity,
  AomiAuthMethod,
  AomiWalletOption,
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
  resolveGracefulEvmIdentity,
  type GracefulEvmIdentity,
} from "./evm-identity-grace";
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
const EVM_IDENTITY_GRACE_MS = 1800;

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

const walletLabelOverrides: Record<string, string> = {
  base: "Base Account",
  baseaccount: "Base Account",
  coinbase: "Coinbase Wallet",
  coinbasewallet: "Coinbase Wallet",
  injected: "Browser wallet",
  metamask: "MetaMask",
  para: "Para",
  rabby: "Rabby",
  rainbow: "Rainbow",
  walletconnect: "WalletConnect",
};

const solanaWalletAllowlist = new Set([
  "phantom",
  "solflare",
  "backpack",
  "glow",
]);

type InstalledWalletFlags = {
  metamask: boolean;
  rabby: boolean;
  coinbase: boolean;
  rainbow: boolean;
};

const emptyInstalledWalletFlags: InstalledWalletFlags = {
  metamask: false,
  rabby: false,
  coinbase: false,
  rainbow: false,
};

const socialLoginLabels: Partial<Record<TOAuthMethod, string>> = {
  APPLE: "Continue with Apple",
  DISCORD: "Continue with Discord",
  FACEBOOK: "Continue with Facebook",
  FARCASTER: "Continue with Farcaster",
  GITHUB: "Continue with GitHub",
  GOOGLE: "Email or Google",
  TELEGRAM: "Continue with Telegram",
  X: "Continue with X",
};

const socialLoginDescriptions: Partial<Record<TOAuthMethod, string>> = {
  GOOGLE: "Fast account sign-in",
};

function normalizeWalletOptionId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function canonicalWalletKey(value: string): string {
  const normalized = normalizeWalletOptionId(value);
  if (normalized.includes("metamask")) return "metamask";
  if (normalized.includes("rabby")) return "rabby";
  if (normalized.includes("coinbase")) return "coinbase";
  if (normalized.includes("rainbow")) return "rainbow";
  if (normalized.includes("walletconnect")) return "walletconnect";
  if (normalized.includes("baseaccount") || normalized === "base") {
    return "base";
  }
  if (normalized.includes("phantom")) return "phantom";
  if (normalized.includes("solflare")) return "solflare";
  if (normalized.includes("backpack")) return "backpack";
  if (normalized.includes("glow")) return "glow";
  if (normalized.includes("para")) return "para";
  return normalized;
}

function detectInstalledWalletFlags(): InstalledWalletFlags {
  if (typeof window === "undefined") return emptyInstalledWalletFlags;

  const hostWindow = window as typeof window & {
    ethereum?: unknown;
    rabby?: unknown;
    coinbaseWalletExtension?: unknown;
  };
  type InjectedProvider = {
    isMetaMask?: boolean;
    isRabby?: boolean;
    isCoinbaseWallet?: boolean;
    isRainbow?: boolean;
    providers?: InjectedProvider[];
  };
  const injected = hostWindow.ethereum as InjectedProvider | undefined;
  const rabbyProvider = hostWindow.rabby as InjectedProvider | undefined;
  const providers = [
    injected,
    rabbyProvider,
    ...(injected?.providers ?? []),
  ].filter(Boolean);

  return {
    metamask: providers.some((provider) => Boolean(provider?.isMetaMask)),
    rabby:
      Boolean(rabbyProvider) ||
      providers.some((provider) => Boolean(provider?.isRabby)),
    coinbase:
      Boolean(hostWindow.coinbaseWalletExtension) ||
      providers.some((provider) => Boolean(provider?.isCoinbaseWallet)),
    rainbow: providers.some((provider) => Boolean(provider?.isRainbow)),
  };
}

function mergeInstalledWalletFlags(
  current: InstalledWalletFlags,
  next: Partial<InstalledWalletFlags>,
): InstalledWalletFlags {
  return {
    metamask: current.metamask || Boolean(next.metamask),
    rabby: current.rabby || Boolean(next.rabby),
    coinbase: current.coinbase || Boolean(next.coinbase),
    rainbow: current.rainbow || Boolean(next.rainbow),
  };
}

function flagsFromEip6963Provider(info: {
  name?: string;
  rdns?: string;
}): Partial<InstalledWalletFlags> {
  const key = canonicalWalletKey(`${info.rdns ?? ""} ${info.name ?? ""}`);
  return {
    metamask: key === "metamask",
    rabby: key === "rabby",
    coinbase: key === "coinbase",
    rainbow: key === "rainbow",
  };
}

function useInstalledWalletFlags(): InstalledWalletFlags {
  const [flags, setFlags] = useState<InstalledWalletFlags>(() =>
    detectInstalledWalletFlags(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    setFlags((current) =>
      mergeInstalledWalletFlags(current, detectInstalledWalletFlags()),
    );

    const handleProvider = (event: Event) => {
      const detail = (
        event as CustomEvent<{ info?: { name?: string; rdns?: string } }>
      ).detail;
      const info = detail?.info;
      if (!info) return;
      setFlags((current) =>
        mergeInstalledWalletFlags(current, flagsFromEip6963Provider(info)),
      );
    };

    window.addEventListener("eip6963:announceProvider", handleProvider);
    window.dispatchEvent(new Event("eip6963:requestProvider"));

    return () => {
      window.removeEventListener("eip6963:announceProvider", handleProvider);
    };
  }, []);

  return flags;
}

function inferWalletLabel(connector: Connector): string {
  const connectorName = connector.name?.trim() || connector.id || "Wallet";
  const normalized =
    walletLabelOverrides[normalizeWalletOptionId(connectorName)] ??
    walletLabelOverrides[normalizeWalletOptionId(connector.id ?? "")];

  return normalized ?? connectorName;
}

function inferWalletKind(connector: Connector): AomiWalletOption["kind"] {
  const key = normalizeWalletOptionId(
    `${connector.id ?? ""} ${connector.name ?? ""} ${connector.type ?? ""}`,
  );
  return key.includes("walletconnect") ? "walletconnect" : "evm";
}

function connectorReady(connector: Connector): boolean | undefined {
  return (connector as Connector & { ready?: boolean }).ready;
}

function isProviderInternalWalletLabel(label: string): boolean {
  return canonicalWalletKey(label) === "para";
}

function knownWalletInstalled(
  key: string,
  flags: InstalledWalletFlags,
): boolean | undefined {
  if (key === "metamask") return flags.metamask;
  if (key === "rabby") return flags.rabby;
  if (key === "coinbase") return flags.coinbase;
  if (key === "rainbow") return flags.rainbow;
  return undefined;
}

function toEvmWalletOption(
  connector: Connector,
  installedWalletFlags: InstalledWalletFlags,
): AomiWalletOption {
  const id =
    connector.uid || connector.id || normalizeWalletOptionId(connector.name);
  const kind = inferWalletKind(connector);
  const ready = connectorReady(connector);
  const label = inferWalletLabel(connector);
  const knownInstalled = knownWalletInstalled(
    canonicalWalletKey(label),
    installedWalletFlags,
  );
  const installed =
    ready === true ||
    knownInstalled === true ||
    (knownInstalled === undefined && connector.type === "injected");

  return {
    id,
    label,
    family: kind === "walletconnect" ? "multichain" : "evm",
    kind,
    status:
      kind === "walletconnect"
        ? "qr"
        : ready === false
          ? "unavailable"
          : installed
            ? "installed"
            : "available",
    installed,
    ready: ready !== false,
    description:
      kind === "walletconnect"
        ? "Scan with a mobile wallet"
        : "Connect an Ethereum wallet",
  };
}

function dedupeWalletOptions(
  options: readonly AomiWalletOption[],
): AomiWalletOption[] {
  const seen = new Set<string>();
  const result: AomiWalletOption[] = [];

  for (const option of options) {
    const key = canonicalWalletKey(option.label);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(option);
  }

  return result;
}

function walletOptionIsDetected(option: AomiWalletOption): boolean {
  if (option.status === "unavailable" || option.ready === false) return false;
  if (option.kind === "evm") return option.status === "installed";
  return option.status === "installed" || option.status === "qr";
}

function toSocialLoginOption(method: TOAuthMethod): AomiWalletOption {
  const id = method.toLowerCase();
  return {
    id,
    label: socialLoginLabels[method] ?? `Continue with ${method}`,
    family: "multichain",
    kind: "social",
    status: "available",
    ready: true,
    description:
      socialLoginDescriptions[method] ?? "Create or use an Aomi account",
  };
}

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
  oAuthMethods?: readonly TOAuthMethod[];
};

export function AomiParaAdapterProvider({
  children,
  supportedChains: configuredChains,
  solanaConfig,
  oAuthMethods = defaultOAuthMethods,
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
  const installedWalletFlags = useInstalledWalletFlags();
  const evmConnections = useSafeConnections();
  const evmConnectors = useSafeConnectors();
  const { connectAsync: wagmiConnectAsync } = useSafeConnect();
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

  // Set while a user-initiated switch (selectNetwork/switchChain) is awaiting
  // the wallet, so the align-to-preference effect below doesn't fire a second
  // concurrent wallet_switchEthereumChain for the same target (some wallets
  // surface that as a duplicate popup or a -32002 "already pending" error).
  const evmSwitchInFlightRef = useRef(false);
  useEffect(() => {
    if (
      evmSwitchInFlightRef.current ||
      !wagmiConnected ||
      !selectedEvmChainId ||
      !switchChainAsync ||
      chainId === selectedEvmChainId
    ) {
      return;
    }
    void switchChainAsync({ chainId: selectedEvmChainId }).catch((error) => {
      console.warn("[aomi-auth-adapter] Auto chain switch failed", error);
    });
  }, [chainId, selectedEvmChainId, switchChainAsync, wagmiConnected]);

  // Keep the EVM (wagmi) connection alive across Para's session re-init.
  // When Para re-initializes its shared session (e.g. a Solana wallet
  // attaches, or the SDK recreates its wagmi config), the in-memory wagmi
  // state resets — the EVM connection survives in wagmi storage (a page
  // refresh restores it via autoConnect) but reads as disconnected
  // in-session. We reproduce that refresh-time recovery here: if wagmi reads
  // disconnected and we had an EVM connection earlier this session that the
  // user did not deliberately drop, call wagmi `reconnect()`. It only
  // restores connectors persisted in storage, so it is a no-op after a
  // deliberate user disconnect (which clears storage) — it can't fight the
  // user or loop (guarded to one attempt until the connection is restored).
  const hadEvmConnectionRef = useRef(false);
  const evmReconnectAttemptedRef = useRef(false);
  // True after a user-initiated EVM disconnect; cleared once an EVM address
  // is live again. Shared by the reconnect effect (skip recovery) and the
  // grace identity below (drop the cached identity immediately).
  const explicitEvmDisconnectRef = useRef(false);
  useEffect(() => {
    if (wagmiConnected) {
      hadEvmConnectionRef.current = true;
      evmReconnectAttemptedRef.current = false;
      return;
    }
    if (
      hadEvmConnectionRef.current &&
      !explicitEvmDisconnectRef.current &&
      !evmReconnectAttemptedRef.current &&
      wagmiReconnect
    ) {
      evmReconnectAttemptedRef.current = true;
      void Promise.resolve(wagmiReconnect()).catch((error) => {
        console.warn("[aomi-auth-adapter] EVM auto-reconnect failed", error);
      });
    }
  }, [wagmiConnected, wagmiReconnect]);

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
  const [, bumpEvmIdentityGrace] = useState(0);
  const lastConfirmedEvmIdentityRef = useRef<GracefulEvmIdentity | null>(null);
  const evmDisconnectedAtRef = useRef<number | null>(null);
  const embeddedWallet = paraAccount.embedded.wallets?.[0] as
    | { address?: string }
    | undefined;
  const currentEvmIdentity: GracefulEvmIdentity = {
    address:
      wagmiAddress ??
      paraAccount.external.evm?.address ??
      embeddedWallet?.address ??
      undefined,
    chainId,
    connectorId: connector?.uid,
    walletName: connector?.name,
  };
  const gracefulEvmIdentity = resolveGracefulEvmIdentity({
    current: currentEvmIdentity,
    previous: lastConfirmedEvmIdentityRef.current,
    selectedChainId: selectedEvmChainId,
    disconnectedAt: evmDisconnectedAtRef.current,
    now: Date.now(),
    graceMs: EVM_IDENTITY_GRACE_MS,
    explicitDisconnect: explicitEvmDisconnectRef.current,
  });
  evmDisconnectedAtRef.current = gracefulEvmIdentity.disconnectedAt;

  useEffect(() => {
    if (!currentEvmIdentity.address) return;
    lastConfirmedEvmIdentityRef.current = currentEvmIdentity;
    evmDisconnectedAtRef.current = null;
    explicitEvmDisconnectRef.current = false;
  }, [
    currentEvmIdentity.address,
    currentEvmIdentity.chainId,
    currentEvmIdentity.connectorId,
    currentEvmIdentity.walletName,
  ]);

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

  const adapter = useMemo<AomiAuthAdapter>(() => {
    const address = gracefulEvmIdentity.identity.address;
    const effectiveChainId = gracefulEvmIdentity.identity.chainId;
    const isConnected = Boolean(
      paraAccount.isConnected ||
      wagmiConnected ||
      address ||
      solanaWallet.publicKey,
    );
    const isBooting = paraAccount.isLoading && !isConnected;

    const embeddedPrimary =
      paraAccount.embedded.email ??
      paraAccount.embedded.farcasterUsername ??
      paraAccount.embedded.telegramUserId ??
      undefined;
    const walletProvider = "para" as const;
    const authMethod = inferAuthMethod(paraAccount.embedded.authMethods);
    const authValue = resolveParaAuthValue(paraAccount.embedded, authMethod);
    const secondaryLabel = formatAuthMethod(authMethod) ?? "Para";
    const { sponsored, sponsorProvider, sponsorAccount } =
      resolveParaSponsorship();

    const svmAddress = solanaWallet.publicKey;
    const solanaTransport = detectSolanaTransport(solanaWallet.walletName);
    const solanaCapabilities = getSolanaCapabilitySnapshot(solanaWallet);

    const evmConnectionInputs: EvmConnectionInput[] = evmConnections.map(
      (conn) => ({
        id: conn.connectorId,
        walletName: conn.connectorName,
        address: conn.address,
        chainId: conn.chainId,
      }),
    );
    if (
      gracefulEvmIdentity.usingCachedIdentity &&
      address &&
      evmConnectionInputs.length === 0
    ) {
      evmConnectionInputs.push({
        id: gracefulEvmIdentity.identity.connectorId ?? "cached-evm",
        walletName: gracefulEvmIdentity.identity.walletName ?? "Wallet",
        address,
        chainId: effectiveChainId,
      });
    }

    const accounts = buildAccounts({
      evmConnections: evmConnectionInputs,
      activeEvmAddress: address,
      activeEvmConnectionId:
        connector?.uid ?? gracefulEvmIdentity.identity.connectorId,
      solanaConnections: svmAddress
        ? [{ publicKey: svmAddress, walletName: solanaWallet.walletName }]
        : [],
      activeSolanaAddress: svmAddress,
    });

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
      evmWallets: evmWalletOptions,
      connectEvmWallet: async (id: string) => {
        const target = evmConnectors.find((candidate) => {
          const option = toEvmWalletOption(candidate, installedWalletFlags);
          return (
            option.id === id ||
            candidate.id === id ||
            candidate.uid === id ||
            canonicalWalletKey(option.label) === canonicalWalletKey(id) ||
            canonicalWalletKey(candidate.name ?? "") === canonicalWalletKey(id)
          );
        });
        if (target && wagmiConnectAsync) {
          await wagmiConnectAsync({ connector: target });
          return;
        }
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      socialLoginOptions,
      connectSocial: async () => {
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
            explicitEvmDisconnectRef.current = true;
            const sameAddressConnections = evmConnections.filter(
              (conn) =>
                conn.address.toLowerCase() === target.address.toLowerCase(),
            );
            const connectorIds = new Set([
              target.id,
              ...sameAddressConnections.map((conn) => conn.connectorId),
            ]);
            const connectors = wagmiConfig.connectors.filter((candidate) =>
              connectorIds.has(candidate.uid),
            );

            if (connectors.length === 0) {
              try {
                await wagmiDisconnectAsync();
              } catch (error) {
                console.warn(
                  "[aomi-auth-adapter] EVM account disconnect failed",
                  error,
                );
              }
              return;
            }

            for (const connector of connectors) {
              try {
                await wagmiDisconnectAsync({ connector });
              } catch (error) {
                console.warn(
                  "[aomi-auth-adapter] EVM account disconnect failed",
                  error,
                );
              }
            }
            return;
          }
          // accountId was provided but is not a disconnectable EVM account —
          // bail rather than falling through to a family-wide disconnect.
          return;
        }

        const disconnectEvmFamily = async () => {
          if (!wagmiDisconnectAsync) return;
          explicitEvmDisconnectRef.current = true;

          const connectorIds = new Set(
            evmConnections.map((connection) => connection.connectorId),
          );
          const connectors = wagmiConfig.connectors.filter((candidate) =>
            connectorIds.has(candidate.uid),
          );

          if (connectors.length === 0) {
            try {
              await wagmiDisconnectAsync();
            } catch (error) {
              console.warn(
                "[aomi-auth-adapter] Wagmi disconnect failed",
                error,
              );
            }
            return;
          }

          for (const connector of connectors) {
            try {
              await wagmiDisconnectAsync({ connector });
            } catch (error) {
              console.warn(
                "[aomi-auth-adapter] Wagmi disconnect failed",
                error,
              );
            }
          }
        };

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
          (wagmiConnected || evmConnections.length > 0)
        ) {
          await disconnectEvmFamily();
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
            evmSwitchInFlightRef.current = true;
            try {
              await switchChainAsync({ chainId: nextChainId });
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
            wagmiConnected &&
            chainId !== target.chainId
          ) {
            evmSwitchInFlightRef.current = true;
            try {
              await switchChainAsync({ chainId: target.chainId });
            } finally {
              evmSwitchInFlightRef.current = false;
            }
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
      getAccountCredential: issueJwt ?? undefined,
      ...buildParaSolanaMethods(solanaWallet, resolvedAdapterSolanaConfig),
    };
  }, [
    capabilities,
    chainId,
    chainsById,
    connector,
    evmConnections,
    evmConnectors,
    gracefulEvmIdentity.identity.address,
    gracefulEvmIdentity.identity.chainId,
    gracefulEvmIdentity.identity.connectorId,
    gracefulEvmIdentity.identity.walletName,
    gracefulEvmIdentity.usingCachedIdentity,
    installedWalletFlags,
    isPending,
    issueJwt,
    oAuthMethods,
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
    wagmiConnectAsync,
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
                      oAuthMethods={oAuthMethods}
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

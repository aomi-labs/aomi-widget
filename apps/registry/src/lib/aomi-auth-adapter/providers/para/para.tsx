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
} from "../../safe-wagmi-hooks";
import { buildAccounts, type EvmConnectionInput } from "../../accounts";
import {
  canonicalWalletKey,
  dedupeWalletOptions,
  isProviderInternalWalletLabel,
  solanaWalletAllowlist,
  toEvmWalletOption,
  toSocialLoginOption,
  useEvmProviderBrands,
  useInstalledWalletFlags,
  walletOptionIsDetected,
} from "../../wallet-brands";
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
  DEFAULT_SOLANA_CLUSTER,
  normalizeSolanaNetworkOptions,
} from "../../solana-networks";
import {
  resolveGracefulEvmIdentity,
  type GracefulEvmIdentity,
} from "./evm-identity-grace";
import { planEvmAccountDisconnect } from "./evm-disconnect-plan";
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
const EVM_IDENTITY_GRACE_MS = 1800;
const EVM_REATTACH_PROMPT_SUPPRESSION_MS = 5 * 60 * 1000;

// wagmi (and Para's connector, which re-asserts itself as the current account
// on reconnect) don't reliably persist *which* EVM connection is active, so the
// user's chosen active wallet reverts to Para after a refresh. We persist the
// selected address ourselves and re-apply it once connections are restored.
const ACTIVE_EVM_ADDRESS_KEY = "aomi.wallet.active-evm-address";
const DETACHED_PARA_EVM_ADDRESS_KEY = "aomi.wallet.detached-para-evm-address";

function readPersistedActiveEvmAddress(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_EVM_ADDRESS_KEY);
  } catch {
    return null;
  }
}

function writePersistedActiveEvmAddress(address: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (address) {
      window.localStorage.setItem(ACTIVE_EVM_ADDRESS_KEY, address);
    } else {
      window.localStorage.removeItem(ACTIVE_EVM_ADDRESS_KEY);
    }
  } catch {
    // best-effort — persistence is non-critical.
  }
}

function readDetachedParaEvmAddress(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(DETACHED_PARA_EVM_ADDRESS_KEY);
  } catch {
    return null;
  }
}

function writeDetachedParaEvmAddress(address: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (address) {
      window.localStorage.setItem(DETACHED_PARA_EVM_ADDRESS_KEY, address);
    } else {
      window.localStorage.removeItem(DETACHED_PARA_EVM_ADDRESS_KEY);
    }
  } catch {
    // best-effort — persistence is non-critical.
  }
}

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
  // Name of the Solana wallet a user-initiated connect is waiting on. The
  // wallet-adapter's `select()` is async-ish (the adapter swap lands on a later
  // render), so the connect is finished by the effect below once the adapter
  // reports the *target* wallet as selected. Tracking the name (not a boolean)
  // keeps a stale `publicKey` from a previously connected wallet from
  // cancelling the pending connect.
  const [pendingSolanaWallet, setPendingSolanaWallet] = useState<string | null>(
    null,
  );
  const paraAccount = useSafeParaAccount();
  const paraSession = useSafeParaClient();
  const issueJwt = useSafeIssueJwt();
  const paraLogout = useSafeLogout();
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
  // Real brand behind each live EVM connection (connector names lie when a
  // wallet like Rabby is set as the default and answers behind the "MetaMask"
  // connector). Used for display names; falls back to the connector name.
  const evmProviderBrands = useEvmProviderBrands(evmConnections, evmConnectors);
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
  // Set while a user-initiated account switch (selectAccount → wagmi
  // switchAccount) is awaiting the wallet. The reconnect effect skips while
  // it's set so a transient "no current connection" mid-switch doesn't trigger
  // a reconnect that stomps the freshly selected account back to the previous.
  const accountSwitchInFlightRef = useRef(false);
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
  // When Para re-initializes its shared session (a Solana wallet attaches,
  // an OAuth login starts, the SDK recreates its wagmi config), the
  // in-memory wagmi state resets while the user did nothing. Recovery is a
  // two-step ladder:
  //   1. wagmi `reconnect()` — restores connectors persisted in wagmi
  //      storage (the same path a page refresh takes). No-op after a
  //      deliberate disconnect, which clears storage.
  //   2. If storage had nothing (some Para auth flows clear it), re-attach
  //      the connectors we saw connected moments ago via `connectAsync` —
  //      but skip this prompting fallback while Para auth/logout UI is active.
  // Both steps re-arm whenever Para rebuilds the connector set, so repeated
  // re-inits (e.g. OAuth popup open + OAuth completion) each get healed.
  const hadEvmConnectionRef = useRef(false);
  const evmReconnectAttemptedRef = useRef(false);
  const evmReattachAttemptedRef = useRef(false);
  // Lifetime cap on the re-attach step. `connectAsync` on a locked or
  // de-authorized wallet pops the extension UI, and the step re-arms on every
  // connector-set rebuild — without a cap it can keep popping MetaMask/Rabby
  // prompts (observed while the Para login modal was open, which rebuilds the
  // config). Storage-based reconnect stays unlimited; it is always silent.
  const evmReattachBudgetRef = useRef(2);
  // True after the user deliberately dropped the whole EVM family — blocks
  // recovery and the grace identity until an address is live again. A
  // single-account sign-out instead records the address below so the rest
  // of the family can still self-heal.
  const explicitEvmDisconnectRef = useRef(false);
  // Addresses the user explicitly signed out of this session. The grace
  // identity won't resurrect them and the re-attach step skips them.
  const explicitlyDroppedEvmAddressesRef = useRef<Set<string>>(new Set());
  const evmReattachSuppressedUntilRef = useRef(0);
  const evmReattachSuppressionReasonRef = useRef<string | null>(null);
  const suppressPromptingEvmReattach = useCallback((reason: string) => {
    evmReattachSuppressedUntilRef.current = Math.max(
      evmReattachSuppressedUntilRef.current,
      Date.now() + EVM_REATTACH_PROMPT_SUPPRESSION_MS,
    );
    evmReattachSuppressionReasonRef.current = reason;
    walletDebug("evm:heal", {
      suppress: "prompting-re-attach",
      reason,
      ms: EVM_REATTACH_PROMPT_SUPPRESSION_MS,
    });
  }, []);
  // Last non-empty connection snapshot, for the re-attach step.
  const lastEvmConnectionsRef = useRef<typeof evmConnections>([]);
  useEffect(() => {
    if (evmConnections.length > 0) {
      lastEvmConnectionsRef.current = evmConnections;
    }
  }, [evmConnections]);
  // A new connector set means Para rebuilt its wagmi config — a fresh wipe
  // that deserves a fresh recovery attempt.
  useEffect(() => {
    evmReconnectAttemptedRef.current = false;
    evmReattachAttemptedRef.current = false;
  }, [evmConnectors]);
  useEffect(() => {
    if (wagmiConnected) {
      hadEvmConnectionRef.current = true;
      evmReconnectAttemptedRef.current = false;
      evmReattachAttemptedRef.current = false;
      return;
    }
    // Only recover a *wiped* session: no current connection AND no connections
    // at all. During a user account switch wagmi briefly reports no current
    // connection while the connections list stays populated — reconnecting then
    // would stomp the freshly selected account back to the previous one (the
    // "click MetaMask, it flips back to Para" bug on the first switch).
    if (accountSwitchInFlightRef.current || evmConnections.length > 0) {
      return;
    }
    if (!hadEvmConnectionRef.current || explicitEvmDisconnectRef.current) {
      return;
    }
    if (!evmReconnectAttemptedRef.current && wagmiReconnect) {
      evmReconnectAttemptedRef.current = true;
      walletDebug("evm:heal", { step: "reconnect" });
      void Promise.resolve(wagmiReconnect()).catch((error) => {
        console.warn("[aomi-auth-adapter] EVM auto-reconnect failed", error);
      });
    }
    // Step 2, delayed: if the storage-based reconnect brought nothing back
    // (wagmi storage was cleared by the provider mid-auth), re-attach the
    // remembered connectors directly. The timer is cancelled when a
    // connection appears before it fires.
    if (evmReattachAttemptedRef.current || !wagmiConnectAsync) return;
    if (evmReattachBudgetRef.current <= 0) {
      walletDebug("evm:heal", { skip: "re-attach-budget-exhausted" });
      return;
    }
    if (Date.now() < evmReattachSuppressedUntilRef.current) {
      walletDebug("evm:heal", {
        skip: "prompting-re-attach-suppressed",
        reason: evmReattachSuppressionReasonRef.current,
      });
      return;
    }
    const remembered = lastEvmConnectionsRef.current.filter((connection) => {
      const key = canonicalWalletKey(connection.connectorName);
      if (key === "para" || key === "walletconnect") return false;
      return !explicitlyDroppedEvmAddressesRef.current.has(
        connection.address.toLowerCase(),
      );
    });
    if (remembered.length === 0) return;
    const timer = window.setTimeout(() => {
      if (evmReattachAttemptedRef.current) return;
      evmReattachAttemptedRef.current = true;
      evmReattachBudgetRef.current -= 1;
      walletDebug("evm:heal", {
        step: "re-attach",
        wallets: remembered.map((conn) => conn.connectorName),
        budgetLeft: evmReattachBudgetRef.current,
      });
      void (async () => {
        for (const connection of remembered) {
          const target = evmConnectors.find(
            (candidate) =>
              candidate.uid === connection.connectorId ||
              canonicalWalletKey(candidate.name ?? "") ===
                canonicalWalletKey(connection.connectorName),
          );
          if (!target) continue;
          try {
            await wagmiConnectAsync({ connector: target });
          } catch (error) {
            console.warn(
              "[aomi-auth-adapter] EVM re-attach failed",
              connection.connectorName,
              error,
            );
          }
        }
      })();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [
    wagmiConnected,
    evmConnections.length,
    wagmiReconnect,
    wagmiConnectAsync,
    evmConnectors,
  ]);

  // Enforce the user's chosen active EVM account against Para re-assertion.
  // Para's connector re-asserts itself as wagmi's current connection on
  // reconnect and session syncs — stomping the chosen wallet after a refresh
  // (an attempt-once restore loses that race) AND right after the user's
  // first switch away from Para (the "click MetaMask, it flips back" bug).
  // Whenever the persisted choice exists, its connection is live, and the
  // current connection is Para (or vacant), switch back — bounded per theft
  // so a genuinely user-driven change can always win.
  const persistedActiveEvmAddressRef = useRef<string | null>(
    readPersistedActiveEvmAddress(),
  );
  useEffect(() => {
    // mount-only: report what the enforcement will aim for this load
    walletDebug("active-evm:init", {
      persisted: persistedActiveEvmAddressRef.current,
    });
  }, []);
  // Timeline of wagmi's current connection — shows exactly when Para (or a
  // heal/switch) takes over. Key signal when diagnosing active-wallet bugs.
  useEffect(() => {
    walletDebug("evm:current-changed", {
      address: wagmiAddress ?? null,
      connector: connector?.name ?? null,
      connectorUid: connector?.uid ?? null,
    });
  }, [wagmiAddress, connector?.uid, connector?.name]);
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
  const activeEvmEnforceAttemptsRef = useRef(0);
  // Re-arm the budget whenever the wanted connection (re)appears or gets a new
  // connector uid (config rebuild) — early attempts can fail with "connector
  // not ready" while wagmi is still reconnecting, and those must not consume
  // the budget for the real fight later.
  const lastWantedConnectionUidRef = useRef<string | null>(null);
  useEffect(() => {
    const want = persistedActiveEvmAddressRef.current?.toLowerCase();
    if (!want || !switchAccountAsync || evmConnections.length === 0) return;
    if (accountSwitchInFlightRef.current) {
      walletDebug("active-evm:enforce", { skip: "switch-in-flight" });
      return;
    }
    if (wagmiAddress?.toLowerCase() === want) {
      // Satisfied — re-arm the budget for a future re-assertion.
      if (activeEvmEnforceAttemptsRef.current > 0) {
        walletDebug("active-evm:enforce", { satisfied: want });
      }
      activeEvmEnforceAttemptsRef.current = 0;
      return;
    }
    const connection = evmConnections.find(
      (conn) => conn.address.toLowerCase() === want,
    );
    if (!connection) {
      walletDebug("active-evm:enforce", {
        skip: "wanted-connection-absent",
        want,
      });
      return; // wanted account not connected (yet) — keep waiting
    }
    if (lastWantedConnectionUidRef.current !== connection.connectorId) {
      lastWantedConnectionUidRef.current = connection.connectorId;
      activeEvmEnforceAttemptsRef.current = 0;
    }
    // Only fight the Para connector (or a vacant current connection). A
    // different external connector being current implies a deliberate
    // wallet-side switch the user made — respect it.
    const currentIsPara = canonicalWalletKey(connector?.name ?? "") === "para";
    if (wagmiAddress && !currentIsPara) {
      walletDebug("active-evm:enforce", {
        skip: "current-not-para",
        current: connector?.name,
        want,
      });
      return;
    }
    if (activeEvmEnforceAttemptsRef.current >= 3) {
      walletDebug("active-evm:enforce", { skip: "budget-exhausted", want });
      return;
    }
    const targetConnector = wagmiConfig.connectors.find(
      (c) => c.uid === connection.connectorId,
    );
    if (!targetConnector) {
      walletDebug("active-evm:enforce", {
        skip: "target-connector-missing",
        wantedUid: connection.connectorId,
        configUids: wagmiConfig.connectors.map((c) => c.uid),
      });
      return;
    }
    activeEvmEnforceAttemptsRef.current += 1;
    walletDebug("active-evm:enforce", {
      switching: want,
      via: targetConnector.name,
      attempt: activeEvmEnforceAttemptsRef.current,
      stolenBy: connector?.name ?? null,
    });
    accountSwitchInFlightRef.current = true;
    void Promise.resolve(switchAccountAsync({ connector: targetConnector }))
      .then(() => {
        // A won fight refunds the budget. During boot Para's connector
        // re-asserts current once per connection that finishes reconnecting
        // (observed 4+ thefts in one load), and the effect often can't
        // observe the satisfied state between thefts (the next steal lands
        // while the previous switch is still settling) — so the budget must
        // only count *consecutive failed* switches, not won rounds.
        activeEvmEnforceAttemptsRef.current = 0;
      })
      .catch((error) => {
        walletDebug("active-evm:enforce", {
          failed: String(error),
          want,
        });
        console.warn("[aomi-auth-adapter] Active EVM enforce failed", error);
      })
      .finally(() => {
        accountSwitchInFlightRef.current = false;
      });
  }, [
    evmConnections,
    wagmiAddress,
    connector,
    switchAccountAsync,
    wagmiConfig.connectors,
  ]);

  // True once a connect attempt (the provider's auto-connect or ours) has been
  // observed for the current pending target. Reset per target.
  const solanaConnectAttemptObservedRef = useRef(false);
  useEffect(() => {
    solanaConnectAttemptObservedRef.current = false;
  }, [pendingSolanaWallet]);
  useEffect(() => {
    if (!pendingSolanaWallet) return;

    // Done: the *target* wallet is connected. (A lingering publicKey from a
    // previously connected wallet must not clear the pending connect — that
    // was the original "click Phantom and nothing happens" bug.)
    if (
      solanaWallet.publicKey &&
      solanaWallet.walletName === pendingSolanaWallet
    ) {
      setPendingSolanaWallet(null);
      return;
    }

    if (solanaWallet.connecting) {
      solanaConnectAttemptObservedRef.current = true;
      return;
    }
    if (!solanaWallet.connect) return;
    if (solanaWallet.walletName !== pendingSolanaWallet) {
      // A failed attempt makes wallet-adapter unselect the wallet — settle the
      // pending state then. Otherwise the `select()` swap hasn't landed yet.
      if (solanaConnectAttemptObservedRef.current) {
        setPendingSolanaWallet(null);
      }
      return;
    }

    // An attempt already ran for this target and ended without a connection
    // (popup dismissed, wallet error). Don't fire another popup on our own —
    // the user can click the wallet again.
    if (solanaConnectAttemptObservedRef.current) {
      setPendingSolanaWallet(null);
      return;
    }

    // Para mounts the wallet-adapter provider with `autoConnect: true`, and
    // `select()` marks the choice user-initiated, so the provider fires
    // `adapter.connect()` itself once the adapter lands. Calling connect()
    // concurrently races it — and the losing attempt's error path UNSELECTS
    // the wallet (wallet-adapter's onConnectError → changeWallet(null)),
    // which is how a click could silently do nothing until a refresh re-ran
    // a clean auto-connect. Give the auto-connect a beat to start; connect
    // manually only if no attempt appears (providers without autoConnect).
    const timer = window.setTimeout(() => {
      solanaConnectAttemptObservedRef.current = true;
      void solanaWallet.connect!()
        .catch((error) => {
          console.warn(
            "[aomi-auth-adapter] Solana wallet connect failed",
            error,
          );
        })
        .finally(() => {
          setPendingSolanaWallet(null);
        });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    pendingSolanaWallet,
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
  const [detachedParaEvmAddress, setDetachedParaEvmAddress] = useState<
    string | null
  >(() => readDetachedParaEvmAddress());
  const updateDetachedParaEvmAddress = useCallback((address: string | null) => {
    setDetachedParaEvmAddress(address);
    writeDetachedParaEvmAddress(address);
  }, []);
  const lastConfirmedEvmIdentityRef = useRef<GracefulEvmIdentity | null>(null);
  const evmDisconnectedAtRef = useRef<number | null>(null);
  const embeddedWallet = paraAccount.embedded.wallets?.[0] as
    | { address?: string }
    | undefined;
  const paraEvmAddress =
    paraAccount.external.evm?.address ?? embeddedWallet?.address ?? undefined;
  const detachedParaAddress = detachedParaEvmAddress?.toLowerCase() ?? null;
  const paraSessionLocallyDetached = Boolean(
    paraAccount.isConnected &&
    detachedParaAddress &&
    (!paraEvmAddress || paraEvmAddress.toLowerCase() === detachedParaAddress),
  );
  const exposedParaEvmAddress = paraSessionLocallyDetached
    ? undefined
    : paraEvmAddress;
  const currentEvmIdentity: GracefulEvmIdentity = {
    address: wagmiAddress ?? exposedParaEvmAddress,
    chainId,
    connectorId: connector?.uid,
    walletName:
      (connector?.uid ? evmProviderBrands[connector.uid] : undefined) ??
      connector?.name,
  };

  useEffect(() => {
    if (!detachedParaAddress) return;
    if (!paraAccount.isConnected) {
      if (!paraAccount.isLoading) {
        updateDetachedParaEvmAddress(null);
      }
      return;
    }
    if (
      paraEvmAddress &&
      paraEvmAddress.toLowerCase() !== detachedParaAddress
    ) {
      updateDetachedParaEvmAddress(null);
    }
  }, [
    detachedParaAddress,
    paraAccount.isConnected,
    paraAccount.isLoading,
    paraEvmAddress,
    updateDetachedParaEvmAddress,
  ]);
  const lastConfirmedEvmAddress =
    lastConfirmedEvmIdentityRef.current?.address?.toLowerCase();
  const gracefulEvmIdentity = resolveGracefulEvmIdentity({
    current: currentEvmIdentity,
    previous: lastConfirmedEvmIdentityRef.current,
    selectedChainId: selectedEvmChainId,
    disconnectedAt: evmDisconnectedAtRef.current,
    now: Date.now(),
    graceMs: EVM_IDENTITY_GRACE_MS,
    explicitDisconnect:
      explicitEvmDisconnectRef.current ||
      Boolean(
        lastConfirmedEvmAddress &&
        explicitlyDroppedEvmAddressesRef.current.has(lastConfirmedEvmAddress),
      ),
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
    const exposeParaSession =
      paraAccount.isConnected && !paraSessionLocallyDetached;
    const isConnected = Boolean(
      exposeParaSession || wagmiConnected || address || solanaWallet.publicKey,
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

    const evmConnectionInputs: EvmConnectionInput[] = evmConnections.map(
      (conn) => ({
        id: conn.connectorId,
        // Prefer the sniffed provider brand: the "MetaMask" connector reports
        // its own name even when Rabby (set as default wallet) answers it.
        walletName: evmProviderBrands[conn.connectorId] ?? conn.connectorName,
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

    const builtAccounts = buildAccounts({
      evmConnections: evmConnectionInputs,
      activeEvmAddress: address,
      activeEvmConnectionId:
        connector?.uid ?? gracefulEvmIdentity.identity.connectorId,
      solanaConnections: svmAddress
        ? [{ publicKey: svmAddress, walletName: solanaWallet.walletName }]
        : [],
      activeSolanaAddress: svmAddress,
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

    const connectorName = connector?.name?.toLowerCase() ?? "";
    const isParaWallet = connectorName.includes("para");
    const shouldUseExternalSigner = Boolean(walletClient && !isParaWallet);

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
          const connection = evmConnections.find(
            (conn) => conn.connectorId === id,
          );
          if (connection && switchAccountAsync) {
            const connector = wagmiConfig.connectors.find(
              (c) => c.uid === connection.connectorId,
            );
            if (connector) {
              accountSwitchInFlightRef.current = true;
              try {
                walletDebug("active-evm:user-select", {
                  address: connection.address,
                  connector: connection.connectorName,
                });
                await switchAccountAsync({ connector });
                // Remember the choice so it survives a refresh.
                persistedActiveEvmAddressRef.current = connection.address;
                writePersistedActiveEvmAddress(connection.address);
                walletDebug("active-evm:persisted", {
                  address: connection.address,
                });
              } finally {
                accountSwitchInFlightRef.current = false;
              }
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
          // A deliberate connect lifts any earlier per-address sign-out.
          explicitlyDroppedEvmAddressesRef.current.clear();
          if (canonicalWalletKey(target.name ?? "") === "para") {
            updateDetachedParaEvmAddress(null);
          }
          await wagmiConnectAsync({ connector: target });
          return;
        }
        updateDetachedParaEvmAddress(null);
        suppressPromptingEvmReattach("para-evm-connect-fallback");
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      socialLoginOptions,
      connectSocial: async () => {
        updateDetachedParaEvmAddress(null);
        suppressPromptingEvmReattach("para-social-login");
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
              setPendingSolanaWallet(walletName);
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
              setPendingSolanaWallet(null);
              return;
            }
            if (result.status === "selecting") {
              setPendingSolanaWallet(result.walletName);
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
        // A deliberate connect lifts any earlier per-address sign-out.
        explicitlyDroppedEvmAddressesRef.current.clear();
        updateDetachedParaEvmAddress(null);
        suppressPromptingEvmReattach("para-auth-modal");
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      disconnect: async (options) => {
        // Clear Para's own embedded/social session (cross-tab). Without this a
        // wagmi-only disconnect leaves Para logged in and it re-attaches on the
        // next load.
        const logoutParaSession = async () => {
          suppressPromptingEvmReattach("para-logout");
          if (paraLogout) {
            try {
              walletDebug("para:logout", { via: "useLogout" });
              await paraLogout();
              walletDebug("para:logout", { result: "ok" });
              return;
            } catch (error) {
              walletDebug("para:logout", { failed: String(error) });
              console.warn("[aomi-auth-adapter] Para logout failed", error);
              // fall through to the client-level logout below
            }
          }
          // Fallback: the Para client exposes logout() directly; reach for it
          // when the hook is unavailable or rejected, so a sign-out can't
          // silently no-op and leave the session to re-attach on next load.
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
        };

        if (options?.accountId) {
          const target = accounts.find((a) => a.id === options.accountId);
          if (target?.family === "evm" && wagmiDisconnectAsync) {
            const disconnectPlan = planEvmAccountDisconnect({
              target,
              connections: evmConnections,
            });
            // Record the drop per-address. Only treat it as a family-wide
            // explicit disconnect when nothing else remains. If another
            // connector still exposes this address, keep the address alive so
            // disconnecting Para does not also suppress the user's same-address
            // MetaMask/Rabby.
            if (disconnectPlan.shouldMarkDroppedAddress) {
              explicitlyDroppedEvmAddressesRef.current.add(
                disconnectPlan.targetAddress,
              );
            } else {
              explicitlyDroppedEvmAddressesRef.current.delete(
                disconnectPlan.targetAddress,
              );
            }
            if (disconnectPlan.otherConnectionsRemain) {
              evmReconnectAttemptedRef.current = false;
              evmReattachAttemptedRef.current = false;
            } else {
              explicitEvmDisconnectRef.current = true;
            }
            const connectors = wagmiConfig.connectors.filter((candidate) =>
              disconnectPlan.connectorIds.has(candidate.uid),
            );
            walletDebug("evm:account-sign-out", {
              wallet: target.walletName ?? null,
              address: disconnectPlan.targetAddress,
              isParaAccount: disconnectPlan.isParaAccount,
              disconnecting: connectors.map((c) => c.name),
              othersRemain: disconnectPlan.otherConnectionsRemain,
              sameAddressRemains: disconnectPlan.sameAddressConnectionsRemain,
            });

            if (connectors.length === 0) {
              if (disconnectPlan.otherConnectionsRemain) {
                walletDebug("evm:account-sign-out", {
                  skip: "global-disconnect-preserve-others",
                  address: disconnectPlan.targetAddress,
                });
              } else {
                try {
                  await wagmiDisconnectAsync();
                } catch (error) {
                  console.warn(
                    "[aomi-auth-adapter] EVM account disconnect failed",
                    error,
                  );
                }
              }
            } else {
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
            }

            if (
              disconnectPlan.isParaAccount &&
              disconnectPlan.otherConnectionsRemain
            ) {
              updateDetachedParaEvmAddress(disconnectPlan.targetAddress);
              walletDebug("para:detach", {
                address: disconnectPlan.targetAddress,
                reason: "preserve-external-wallets",
              });
            }

            // Drop the persisted active-account hint if it pointed here, so it
            // doesn't try to restore a wallet the user just signed out of.
            if (
              persistedActiveEvmAddressRef.current?.toLowerCase() ===
                disconnectPlan.targetAddress &&
              !disconnectPlan.sameAddressConnectionsRemain
            ) {
              persistedActiveEvmAddressRef.current = null;
              writePersistedActiveEvmAddress(null);
              walletDebug("active-evm:persist-cleared", {
                reason: "account-sign-out",
              });
            }

            // Full Para logout tears down Para's shared external-wallet
            // provider too. Only use it when no other wallet has to survive;
            // otherwise the local Para detach above gives the UI the intended
            // sign-out without ejecting MetaMask/Rabby.
            if (
              disconnectPlan.isParaAccount &&
              !disconnectPlan.otherConnectionsRemain
            ) {
              updateDetachedParaEvmAddress(null);
              await logoutParaSession();
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
          updateDetachedParaEvmAddress(null);
          persistedActiveEvmAddressRef.current = null;
          writePersistedActiveEvmAddress(null);
          walletDebug("active-evm:persist-cleared", {
            reason: "family-disconnect",
          });

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

        // A full ("all") disconnect wipes everything, including Para's own
        // embedded/social session — otherwise it would silently re-attach on
        // the next load. A family-scoped disconnect leaves the Para session
        // alone so dropping just one external wallet keeps the user signed in.
        if (wantsAll) {
          await logoutParaSession();
        }
      },
      openAccountUI: async (options) => {
        const requestedFamily = options?.family ?? "evm";
        if (requestedFamily === "solana" && !solanaWallet.publicKey) {
          try {
            const result = await connectPreferredSolanaWallet(solanaWallet);
            if (result.status === "connected") {
              setPendingSolanaWallet(null);
              return;
            }
            if (result.status === "selecting") {
              setPendingSolanaWallet(result.walletName);
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
        suppressPromptingEvmReattach("para-account-modal");
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

        setPendingSolanaWallet(null);
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
      getAccountCredential: exposeParaSession
        ? (issueJwt ?? undefined)
        : undefined,
      ...buildParaSolanaMethods(solanaWallet, resolvedAdapterSolanaConfig),
    };
  }, [
    capabilities,
    chainId,
    chainsById,
    connector,
    evmConnections,
    evmConnectors,
    evmProviderBrands,
    gracefulEvmIdentity.identity.address,
    gracefulEvmIdentity.identity.chainId,
    gracefulEvmIdentity.identity.connectorId,
    gracefulEvmIdentity.identity.walletName,
    gracefulEvmIdentity.usingCachedIdentity,
    installedWalletFlags,
    isPending,
    issueJwt,
    oAuthMethods,
    paraLogout,
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
    selectedEvmChainId,
    selectedSolanaNetwork,
    solanaWallet,
    suppressPromptingEvmReattach,
    supportedSolanaNetworks,
    supportedChains,
    switchAccountAsync,
    switchChainAsync,
    updateDetachedParaEvmAddress,
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
            {/* The adapter renders in BOTH wrapper states (the wrapper only
                adds the Solana context when Para's client is ready) — it must
                never unmount when the client blips during logout/re-init, or
                all connection-recovery state is lost mid-session. The safe
                Solana hooks already degrade when the context is absent. */}
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

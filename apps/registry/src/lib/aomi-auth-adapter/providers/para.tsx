"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Environment,
  ParaProvider,
  useAccount as useParaAccount,
  useClient as useParaClient,
  useModal,
  type TExternalWallet,
  type TOAuthMethod,
} from "@getpara/react-sdk";
import "@getpara/react-sdk/styles.css";
import {
  ParaSolanaProvider,
  phantomWallet,
  solflareWallet,
  backpackWallet,
  glowWallet,
  type ParaSolanaProviderConfig,
  type WalletList as SolanaWalletList,
} from "@getpara/solana-wallet-connectors";
import { Chain as SolanaMobileChain } from "@solana-mobile/mobile-wallet-adapter-protocol";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import {
  Transaction as SolanaTransaction,
  VersionedTransaction,
} from "@solana/web3.js";
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
import type {
  WalletEip712Payload,
  WalletSolanaSignPayload,
  WalletTxPayload,
} from "@aomi-labs/react";
import { toViemSignTypedDataArgs, UserState, useUser } from "@aomi-labs/react";
import {
  createAAProviderState,
  type AAMode,
  type AAProvider,
} from "@aomi-labs/client";
import type ParaWeb from "@getpara/react-sdk";
import { AomiAuthAdapterProvider } from "../context";
import {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  inferAuthMethod,
} from "../identity";
import {
  useSafeCapabilities,
  useSafeSendCallsSync,
  useSafeSendTransaction,
  useSafeSignTypedData,
  useSafeSwitchChain,
  useSafeWagmiAccount,
  useSafeWagmiConfig,
  useSafeWalletClient,
} from "../safe-wagmi-hooks";
import type {
  AomiAuthAdapter,
  AomiAuthIdentity,
  AomiAuthMethod,
} from "../types";
import {
  executeAdapterTransaction,
  getPreferredRpcUrl,
  type RequestedAAMode,
  type WalletExecutionCallList,
  type WalletProviderState,
} from "../wallet-execution";

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
  /**
   * Solana RPC endpoint passed to the underlying
   * `@solana/wallet-adapter-react` `<ConnectionProvider>`. Defaults to
   * the Solana devnet public endpoint. Override for mainnet / a private
   * RPC. Does not need to match the host's `cluster` field on
   * `WalletSolanaSignPayload` — Para's connector is strictly for
   * signing here; broadcast happens in app-side code.
   */
  solanaEndpoint?: string;
  /**
   * Override the list of Solana wallet connectors. Defaults to
   * `[phantomWallet, solflareWallet, backpackWallet, glowWallet]`.
   * Pass an empty list to disable Solana entirely (no
   * `signSolanaTransaction` will be exposed and Solana-related host
   * events will be rejected gracefully by `RuntimeTxHandler`).
   */
  solanaWallets?: SolanaWalletList;
  /**
   * Mobile wallet adapter chain hint for the Solana connector. Default
   * `"solana:devnet"`. Has no effect outside Solana mobile mini-apps.
   */
  solanaMobileChain?: SolanaMobileChain;
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

// `useSolanaWallet` (the Solana wallet-adapter hook re-exported via
// ParaSolanaProvider) throws when no `<WalletProvider>` is mounted above —
// e.g. when the host app skips Solana entirely. Wrap in a try so the rest of
// the auth adapter still works without the Solana connector mounted.
type SafeSolanaWalletState = {
  publicKey: string | undefined;
  connected: boolean;
  signTransaction:
    | ((tx: VersionedTransaction | SolanaTransaction) =>
        Promise<VersionedTransaction | SolanaTransaction>)
    | undefined;
};

function useSafeSolanaWallet(): SafeSolanaWalletState {
  try {
    const wallet = useSolanaWallet();
    return {
      publicKey: wallet.publicKey?.toBase58(),
      connected: wallet.connected,
      signTransaction: wallet.signTransaction,
    };
  } catch {
    return {
      publicKey: undefined,
      connected: false,
      signTransaction: undefined,
    };
  }
}

// Browser-safe base64 ↔ bytes. The CLI signer uses Buffer; here we stay
// compatible with both Node SSR and browser runtimes.
function decodeBase64(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function encodeBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

const DEFAULT_SOLANA_ENDPOINT = "https://api.devnet.solana.com";
const DEFAULT_SOLANA_WALLETS: SolanaWalletList = [
  phantomWallet,
  solflareWallet,
  backpackWallet,
  glowWallet,
];

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

export function AomiParaAdapterProvider({ children }: { children: ReactNode }) {
  const paraAccount = useSafeParaAccount();
  const paraSession = useSafeParaClient();
  const paraModal = useSafeParaModal();
  const {
    address: wagmiAddress,
    chainId,
    isConnected: wagmiConnected,
    connector,
  } = useSafeWagmiAccount();
  const { walletClient } = useSafeWalletClient();
  const { switchChainAsync, isPending } = useSafeSwitchChain();
  const { sendTransactionAsync } = useSafeSendTransaction();
  const { sendCallsSyncAsync } = useSafeSendCallsSync();
  const { capabilities } = useSafeCapabilities();
  const { signTypedDataAsync } = useSafeSignTypedData();
  const wagmiConfig = useSafeWagmiConfig();
  const solanaWallet = useSafeSolanaWallet();

  const chainsById = useMemo<Record<number, Chain>>(
    () =>
      Object.fromEntries(
        (wagmiConfig.chains ?? []).map((chain) => [chain.id, chain]),
      ),
    [wagmiConfig.chains],
  );

  const embeddedWallet0 = paraAccount.embedded.wallets?.[0] as
    | { address?: string }
    | undefined;
  const connectedAddress =
    wagmiAddress ??
    paraAccount.external.evm?.address ??
    embeddedWallet0?.address ??
    undefined;

  // Per-tx AA fields are session-owned: `session.ts` writes them to UserState
  // on tx-complete and we read them back via `useUser()`. UserState is the
  // single source of truth so identity rehydrates correctly after remount.
  // walletKind stays "eoa" for Para regardless of mode (Para wallets are EOAs
  // — even when a tx upgrades to 4337, the connected address differs from
  // the derived smart account address).
  const { user } = useUser();
  const userAAMode = UserState.aaMode(user);
  const userSmartAccount4337 = UserState.SmartAccount4337(user);
  const userDelegation7702 = UserState.Delegation7702(user);

  const adapter = useMemo<AomiAuthAdapter>(() => {
    const isConnected = Boolean(paraAccount.isConnected || wagmiConnected);
    const isBooting = paraAccount.isLoading && !isConnected;

    const embeddedAddress = embeddedWallet0?.address;
    const externalAddress = paraAccount.external.evm?.address;
    const address = connectedAddress;
    const walletProvider = "para" as const;
    const oauthMethod = inferAuthMethod(paraAccount.embedded.authMethods);
    // External wallet flow (WalletConnect / wagmi-injected via Para) has no
    // OAuth identity — surface it explicitly as "wagmi" so the bot can tell
    // QR/external from embedded-without-method-yet.
    const usingExternalWallet = Boolean(externalAddress || wagmiAddress);
    const authMethod: AomiAuthMethod | undefined =
      oauthMethod ?? (usingExternalWallet ? "wagmi" : undefined);

    const svmAddress = solanaWallet.publicKey;
    const { sponsored, sponsorProvider, sponsorAccount } =
      resolveParaSponsorship();

    const identity: AomiAuthIdentity = isBooting
      ? {
          ...AOMI_AUTH_BOOTING_IDENTITY,
          chainId: chainId ?? undefined,
          svmAddress,
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
            chainId: chainId ?? undefined,
            svmAddress,
            walletProvider,
            authMethod,
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
            }
          : {
              ...AOMI_AUTH_DISCONNECTED_IDENTITY,
              chainId: chainId ?? undefined,
              walletProvider,
              authMethod,
            };

    const connectorName = connector?.name?.toLowerCase() ?? "";
    const isParaWallet = connectorName.includes("para");
    const shouldUseExternalSigner = Boolean(walletClient && !isParaWallet);

    return {
      identity,
      isReady: !isBooting,
      isSwitchingChain: isPending,
      canConnect: Boolean(paraModal) && !identity.isConnected,
      canOpenAccountUI: Boolean(paraModal) && identity.isConnected,
      canDisconnect: false,
      supportedChains: wagmiConfig.chains,
      connect: async () => {
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      openAccountUI: async () => {
        paraModal?.openModal({ step: "ACCOUNT_MAIN" });
      },
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
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
              forceAA: true,
              preferAAForSingleCall: true,
              shouldUseExternalSigner,
              resolveAAProviderState: (params) =>
                resolveParaAAProviderState({
                  ...params,
                  paraSession,
                  walletClient,
                  address,
                }),
            });
            // session.ts writes aa_mode / smart_account_4337 / delegation_7702
            // to UserState on tx-complete; identity rereads them via useUser.
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
      // Solana sign — only exposed when the user has actually connected
      // a Solana wallet through `<ParaSolanaProvider>`. `RuntimeTxHandler`
      // checks for this method's presence and rejects gracefully when
      // it's undefined.
      signSolanaTransaction: solanaWallet.signTransaction
        ? async (payload: WalletSolanaSignPayload) => {
            if (!payload.unsignedTx) {
              throw new Error("Missing unsigned_tx payload");
            }
            if (!solanaWallet.signTransaction) {
              throw new Error("Solana wallet sign function unavailable");
            }
            const bytes = decodeBase64(payload.unsignedTx);
            // Versioned-tx first, legacy fallback. Wallet adapters
            // accept both via the same `signTransaction` method.
            let signed: VersionedTransaction | SolanaTransaction;
            try {
              const tx = VersionedTransaction.deserialize(bytes);
              signed = await solanaWallet.signTransaction(tx);
            } catch {
              const tx = SolanaTransaction.from(bytes);
              signed = await solanaWallet.signTransaction(tx);
            }
            return { signedTx: encodeBase64(signed.serialize()) };
          }
        : undefined,
    };
  }, [
    capabilities,
    chainId,
    chainsById,
    connectedAddress,
    connector,
    embeddedWallet0,
    isPending,
    paraAccount.embedded,
    paraAccount.external,
    paraAccount.isConnected,
    paraAccount.isLoading,
    paraModal,
    paraSession,
    sendCallsSyncAsync,
    sendTransactionAsync,
    signTypedDataAsync,
    solanaWallet.publicKey,
    solanaWallet.signTransaction,
    switchChainAsync,
    userAAMode,
    userDelegation7702,
    userSmartAccount4337,
    wagmiAddress,
    wagmiConfig.chains,
    wagmiConnected,
    walletClient,
  ]);

  return (
    <AomiAuthAdapterProvider value={adapter}>
      {children}
    </AomiAuthAdapterProvider>
  );
}

export function AomiParaProvider({
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
  solanaEndpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
    DEFAULT_SOLANA_ENDPOINT,
  solanaWallets = DEFAULT_SOLANA_WALLETS,
  solanaMobileChain = "solana:devnet" as SolanaMobileChain,
}: AomiParaProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const resolvedWallets = walletConnectProjectId
    ? externalWallets
    : externalWallets.filter((wallet) => wallet !== "WALLETCONNECT");
  const transports = useMemo(
    () =>
      Object.fromEntries(
        networks.map((network) => [
          network.id,
          http(network.rpcUrls.default.http[0]),
        ]),
      ) as Record<number, Transport>,
    [networks],
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
          chains: networks,
          transports,
          ssr: true,
        },
      },
    }),
    [
      appDescription,
      appUrl,
      networks,
      resolvedWallets,
      transports,
      walletConnectProjectId,
    ],
  );

  // Solana branch: opt-out by passing an empty `solanaWallets` array.
  // When opted out, `useSolanaWallet` inside the adapter throws (no
  // <WalletProvider> mounted) and the safe wrapper returns "no Solana"
  // — `signSolanaTransaction` ends up undefined.
  const solanaEnabled = solanaWallets.length > 0;

  const solanaProviderConfig = useMemo(
    () => ({
      wallets: solanaWallets,
      endpoint: solanaEndpoint,
      chain: solanaMobileChain,
      appIdentity: {
        name: appName,
        uri: appUrl,
      },
    }),
    [appName, appUrl, solanaEndpoint, solanaMobileChain, solanaWallets],
  );

  return (
    <QueryClientProvider client={queryClient}>
      {apiKey ? (
        <ParaProvider
          paraClientConfig={{
            apiKey,
            env: environment,
          }}
          config={{ appName }}
          paraModalConfig={paraModalConfig}
          externalWalletConfig={externalWalletConfig}
        >
          <ParaSolanaWrapper
            enabled={solanaEnabled}
            config={solanaProviderConfig}
          >
            <AomiParaAdapterProvider>{children}</AomiParaAdapterProvider>
          </ParaSolanaWrapper>
        </ParaProvider>
      ) : (
        // No Para API key → no Para session, no Solana session either.
        <AomiParaAdapterProvider>{children}</AomiParaAdapterProvider>
      )}
    </QueryClientProvider>
  );
}

/**
 * Mounts `ParaSolanaProvider` inside the active `<ParaProvider>` so it
 * can populate `internalConfig.para` from the live `useClient()` Para
 * session. Without this, `ParaSolanaProvider`'s wallet-discovery hooks
 * have no Para context to attach to.
 *
 * Renders children unwrapped when `enabled === false` (caller opted out
 * of Solana entirely).
 */
function ParaSolanaWrapper({
  enabled,
  config,
  children,
}: {
  enabled: boolean;
  config: ParaSolanaProviderConfig;
  children: ReactNode;
}) {
  const para = useSafeParaClient();
  if (!enabled || !para) {
    return <>{children}</>;
  }
  return (
    <ParaSolanaProvider
      config={config}
      internalConfig={{
        para: para as never,
        walletsWithFullAuth: "ALL",
      }}
    >
      {children}
    </ParaSolanaProvider>
  );
}

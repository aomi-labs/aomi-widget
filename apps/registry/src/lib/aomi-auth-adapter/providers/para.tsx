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
import { toViemSignTypedDataArgs } from "@aomi-labs/react";
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
  formatAddress,
  formatAuthProvider,
  inferAuthProvider,
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
import type { AomiAuthAdapter, AomiAuthIdentity } from "../types";
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
const TEMPO_MODERATO_CHAIN_ID = 42431;

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
  // wagmi `useCapabilities()` issues `wallet_getCapabilities`, which is a
  // wallet/provider RPC method. On Tempo we temporarily switch the active
  // client onto the chain RPC for MPP session management, and that public RPC
  // correctly rejects wallet-scoped methods. Disable the capabilities probe on
  // Tempo so MPP doesn't trip over unrelated AA feature detection.
  const { capabilities } = useSafeCapabilities({
    enabled: chainId !== TEMPO_MODERATO_CHAIN_ID,
  });
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

  const adapter = useMemo<AomiAuthAdapter>(() => {
    const isConnected = Boolean(paraAccount.isConnected || wagmiConnected);
    const isBooting = paraAccount.isLoading && !isConnected;

    const embeddedPrimary =
      paraAccount.embedded.email ??
      paraAccount.embedded.farcasterUsername ??
      paraAccount.embedded.telegramUserId ??
      undefined;
    const embeddedWallet = paraAccount.embedded.wallets?.[0] as
      | { address?: string }
      | undefined;
    const embeddedAddress = embeddedWallet?.address;
    const externalAddress = paraAccount.external.evm?.address;
    const signerAddress = (
      walletClient as { account?: { address?: `0x${string}` } } | undefined
    )?.account?.address;
    // Prefer the active wagmi signer address over Para profile metadata so
    // request/session identity matches the account that actually signs wallet
    // payments (Tempo/x402) through the connector client.
    const address =
      signerAddress ??
      wagmiAddress ??
      externalAddress ??
      embeddedAddress ??
      undefined;
    const authProvider = inferAuthProvider(paraAccount.embedded.authMethods);
    const providerLabel = formatAuthProvider(authProvider);

    const svmAddress = solanaWallet.publicKey;

    const identity: AomiAuthIdentity = isBooting
      ? {
          ...AOMI_AUTH_BOOTING_IDENTITY,
          chainId: chainId ?? undefined,
          svmAddress,
        }
      : isConnected && embeddedPrimary
        ? {
            status: "connected",
            isConnected: true,
            address,
            chainId: chainId ?? undefined,
            svmAddress,
            authProvider,
            primaryLabel: embeddedPrimary,
            secondaryLabel: providerLabel,
          }
        : isConnected && address
          ? {
              status: "connected",
              isConnected: true,
              address,
              chainId: chainId ?? undefined,
              svmAddress,
              authProvider,
              primaryLabel: formatAddress(address) ?? "Connected wallet",
              secondaryLabel: undefined,
            }
          : svmAddress
            ? {
                status: "connected",
                isConnected: true,
                chainId: chainId ?? undefined,
                svmAddress,
                authProvider,
                primaryLabel:
                  formatAddress(svmAddress) ?? "Connected Solana wallet",
                secondaryLabel: "Solana",
              }
            : {
                ...AOMI_AUTH_DISCONNECTED_IDENTITY,
                chainId: chainId ?? undefined,
                authProvider,
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
        ? async (payload: WalletTxPayload) =>
            executeAdapterTransaction({
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
            })
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
    connector,
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

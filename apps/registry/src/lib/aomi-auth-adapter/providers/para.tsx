"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../network-preferences";
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
import type { WalletFamily } from "../types";
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

export function AomiParaAdapterProvider({
  children,
  solanaConfig,
}: {
  children: ReactNode;
  solanaConfig?: ResolvedSolanaConfig;
}) {
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
  const {
    selectedFamily,
    selectedEvmChainId,
    selectedSolanaNetwork,
    setSelectedFamily,
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

  const chainsById = useMemo<Record<number, Chain>>(
    () =>
      Object.fromEntries(
        (wagmiConfig.chains ?? []).map((chain) => [chain.id, chain]),
      ),
    [wagmiConfig.chains],
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
    const address =
      wagmiAddress ?? externalAddress ?? embeddedAddress ?? undefined;
    const authProvider = inferAuthProvider(paraAccount.embedded.authMethods);
    const providerLabel = formatAuthProvider(authProvider);

    const svmAddress = solanaWallet.publicKey;
    const solanaTransport = detectSolanaTransport(solanaWallet.walletName);
    const solanaCapabilities = getSolanaCapabilitySnapshot(solanaWallet);

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
              chainId: chainId ?? undefined,
              svmAddress,
              authProvider,
              primaryLabel: formatAddress(address) ?? "Connected wallet",
              secondaryLabel: undefined,
              solanaCluster: resolvedAdapterSolanaConfig.cluster,
              solanaWalletName: solanaWallet.walletName,
              solanaTransport: svmAddress ? solanaTransport : undefined,
              solanaCapabilities,
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
                solanaCluster: resolvedAdapterSolanaConfig.cluster,
                solanaWalletName: solanaWallet.walletName,
                solanaTransport,
                solanaCapabilities,
              }
            : {
                ...AOMI_AUTH_DISCONNECTED_IDENTITY,
                chainId: chainId ?? undefined,
                authProvider,
                solanaCluster: resolvedAdapterSolanaConfig.cluster,
              };

    const connectorName = connector?.name?.toLowerCase() ?? "";
    const isParaWallet = connectorName.includes("para");
    const shouldUseExternalSigner = Boolean(walletClient && !isParaWallet);
    const activeFamily: WalletFamily =
      address && !svmAddress
        ? "evm"
        : svmAddress && !address
          ? "solana"
          : selectedFamily;

    return {
      identity,
      isReady: !isBooting,
      isSwitchingChain: isPending,
      canConnect: Boolean(paraModal) && !identity.isConnected,
      canOpenAccountUI: Boolean(paraModal) && identity.isConnected,
      canDisconnect: false,
      supportedChains: wagmiConfig.chains,
      supportedNetworks: {
        evm: wagmiConfig.chains,
        solana: supportedSolanaNetworks,
      },
      activeFamily,
      activeNetwork:
        activeFamily === "evm"
          ? (chainId ?? selectedEvmChainId) !== undefined
            ? {
                family: "evm",
                chainId:
                  chainId ?? selectedEvmChainId ?? wagmiConfig.chains[0]?.id ?? 1,
              }
            : undefined
          : selectedSolanaNetwork
            ? {
                family: "solana",
                networkId: selectedSolanaNetwork.id,
              }
            : undefined,
      solanaNetworkSwitchRequiresReconnect: Boolean(solanaWallet.publicKey),
      connect: async (options) => {
        const requestedFamily = options?.family ?? selectedFamily;
        setSelectedFamily(requestedFamily);
        if (
          requestedFamily === "solana" &&
          paraAccount.isConnected &&
          !solanaWallet.publicKey
        ) {
          try {
            const result = await connectPreferredSolanaWallet(solanaWallet);
            if (result === "connected") {
              return;
            }
          } catch (error) {
            console.warn(
              "[aomi-auth-adapter] Initial Solana wallet attach failed",
              error,
            );
            return;
          }
        }
        paraModal?.openModal({ step: "AUTH_MAIN" });
      },
      openAccountUI: async (options) => {
        const requestedFamily = options?.family ?? activeFamily;
        setSelectedFamily(requestedFamily);
        if (requestedFamily === "solana" && !solanaWallet.publicKey) {
          try {
            const result = await connectPreferredSolanaWallet(solanaWallet);
            if (result === "connected") {
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
            setSelectedFamily("evm");
            setSelectedEvmChainId(nextChainId);
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
      selectNetwork: async (target) => {
        if (target.family === "evm") {
          setSelectedFamily("evm");
          setSelectedEvmChainId(target.chainId);
          if (switchChainAsync && wagmiConnected && chainId !== target.chainId) {
            await switchChainAsync({ chainId: target.chainId });
          }
          return;
        }

        setSelectedFamily("solana");
        if (selectedSolanaNetwork?.id === target.networkId) {
          return;
        }
        if (solanaWallet.publicKey && solanaWallet.disconnect) {
          await solanaWallet.disconnect();
        }
        setSelectedSolanaNetworkId(target.networkId);
      },
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
      ...buildParaSolanaMethods(solanaWallet, resolvedAdapterSolanaConfig),
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
    resolvedAdapterSolanaConfig,
    selectedEvmChainId,
    selectedFamily,
    selectedSolanaNetwork,
    solanaWallet.connect,
    solanaWallet.disconnect,
    solanaWallet.publicKey,
    solanaWallet.select,
    solanaWallet.wallets,
    solanaWallet.walletName,
    supportedSolanaNetworks,
    switchChainAsync,
    wagmiAddress,
    wagmiConfig.chains,
    wagmiConnected,
    walletClient,
    setSelectedEvmChainId,
    setSelectedFamily,
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
  const { selectedSolanaNetworkId } = useAomiWalletNetworkPreferences();
  const resolvedWallets = walletConnectProjectId
    ? externalWallets
    : externalWallets.filter((wallet) => wallet !== "WALLETCONNECT");
  const resolvedSolanaConfig = useMemo(
    () => resolveParaSolanaConfig(solana, selectedSolanaNetworkId),
    [selectedSolanaNetworkId, solana],
  );
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
            key={resolvedSolanaConfig.activeNetwork.id}
            enabled={solanaEnabled}
            config={solanaProviderConfig}
          >
            {(solanaReady) =>
              solanaReady ? (
                <AomiParaAdapterProvider solanaConfig={resolvedSolanaConfig}>
                  {children}
                </AomiParaAdapterProvider>
              ) : (
                children
              )
            }
          </ParaSolanaWrapper>
        </ParaProvider>
      ) : (
        <AomiParaAdapterProvider solanaConfig={resolvedSolanaConfig}>
          {children}
        </AomiParaAdapterProvider>
      )}
    </QueryClientProvider>
  );
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
    >
      <AomiParaProviderInner {...props} />
    </AomiWalletNetworkPreferencesProvider>
  );
}

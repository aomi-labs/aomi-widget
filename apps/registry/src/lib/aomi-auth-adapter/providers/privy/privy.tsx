"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  PrivyProvider,
  usePrivy,
  type PrivyClientConfig,
} from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import {
  SmartWalletsProvider,
  useSmartWallets,
} from "@privy-io/react-auth/smart-wallets";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Chain, Hex } from "viem";
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
  toAAWalletCalls,
  toViemSignTypedDataArgs,
} from "@aomi-labs/react";
import { AomiAdapterComposer } from "../../composer/AomiAdapterComposer";
import type { AuthRuntime, ExecutionRuntime } from "../../composer/types";
import { resolveExternalWalletAAProviderState } from "../../execution/aa-provider-state";
import { createAomiEvmConfig } from "../../catalog/evm-connector-catalog";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../../network-preferences";
import {
  DEFAULT_SVM_CLUSTER,
  normalizeSvmNetworkOptions,
  resolveSelectedSvmNetwork,
} from "../../runtime/svm/networks";
import { useEvmWalletRuntime } from "../../runtime/evm/wallet-runtime";
import { toSocialLoginOption } from "../../runtime/evm/brands";
import { useSvmRegistrySource } from "../../runtime/svm/registry-source";
import { buildSvmTransactionMethods } from "../../runtime/svm/transactions";
import type { SafeSvmWalletState } from "../../runtime/svm/wallet-runtime";
import { REGISTRY_STORAGE_KEY } from "../../registry/types";
import { formatAddress } from "../../identity";
import type {
  AomiAccountCredential,
  AomiAuthMethod,
  AomiTxResult,
  SolanaCluster,
  SolanaNetworkOption,
} from "../../types";

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

type ResolvedSvmConfig = {
  networks: readonly SolanaNetworkOption[];
  activeNetwork: SolanaNetworkOption;
  cluster: SolanaCluster;
  rpcHttpUrl: string;
  rpcWsUrl?: string;
  preferDirectSend: boolean;
};

export type AomiPrivyProviderProps = {
  children: ReactNode;
  appId?: string;
  appName?: string;
  appLogoUrl?: string;
  networks?: readonly [Chain, ...Chain[]];
  loginMethods?: PrivyClientConfig["loginMethods"];
  walletConnectProjectId?: string;
  solana?: {
    networks?: readonly SolanaNetworkOption[];
    cluster?: ResolvedSvmConfig["cluster"];
    rpcHttpUrl?: string;
    rpcWsUrl?: string;
    preferDirectSend?: boolean;
  };
};

type PrivyHook = ReturnType<typeof usePrivy>;
type PrivyAccessTokenHook = PrivyHook & {
  getAccessToken?: () => Promise<string | null>;
};
type SmartWalletsHook = ReturnType<typeof useSmartWallets>;
type SolanaWalletsHook = ReturnType<typeof useSolanaWallets>;
type PrivyUser = PrivyHook["user"];
type PrivySolanaWallet = SolanaWalletsHook["wallets"][number];

const DISCONNECTED_PRIVY: PrivyAccessTokenHook = {
  ready: false,
  authenticated: false,
  user: null,
  login: async () => undefined,
  logout: async () => undefined,
  getAccessToken: async () => null,
} as unknown as PrivyAccessTokenHook;

const DISCONNECTED_SMART_WALLETS: SmartWalletsHook = {
  client: undefined,
  getClientForChain: async () => undefined,
} as unknown as SmartWalletsHook;

const DISCONNECTED_SOLANA_WALLETS: SolanaWalletsHook = {
  wallets: [],
  ready: false,
} as unknown as SolanaWalletsHook;

const AOMI_AUTH_METHODS = new Set<AomiAuthMethod>([
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
  "wallet",
]);

function useSafePrivy(): PrivyAccessTokenHook {
  try {
    return usePrivy() as PrivyAccessTokenHook;
  } catch {
    return DISCONNECTED_PRIVY;
  }
}

function useSafeSmartWallets(): SmartWalletsHook {
  try {
    return useSmartWallets();
  } catch {
    return DISCONNECTED_SMART_WALLETS;
  }
}

function useSafeSvmWallets(): SolanaWalletsHook {
  try {
    return useSolanaWallets();
  } catch {
    return DISCONNECTED_SOLANA_WALLETS;
  }
}

function asAomiAuthMethod(
  value: string | undefined,
): AomiAuthMethod | undefined {
  return value && AOMI_AUTH_METHODS.has(value as AomiAuthMethod)
    ? (value as AomiAuthMethod)
    : undefined;
}

function inferPrivyAuthProvider(user: PrivyUser): AomiAuthMethod | undefined {
  if (!user) return undefined;
  const accountTypePriority: Array<[string, AomiAuthMethod]> = [
    ["google_oauth", "google"],
    ["github_oauth", "github"],
    ["apple_oauth", "apple"],
    ["discord_oauth", "discord"],
    ["twitter_oauth", "x"],
    ["telegram", "telegram"],
    ["farcaster", "farcaster"],
    ["email", "email"],
    ["phone", "phone"],
    ["wallet", "wagmi"],
  ];
  const linked = (user.linkedAccounts ?? []) as Array<{ type?: string }>;
  for (const [privyType, label] of accountTypePriority) {
    if (linked.some((acc) => acc?.type === privyType)) return label;
  }
  const first = linked[0]?.type;
  return asAomiAuthMethod(
    typeof first === "string" ? first.toLowerCase() : undefined,
  );
}

function inferPrivyPrimaryLabel(user: PrivyUser): string | undefined {
  if (!user) return undefined;
  const u = user as unknown as {
    email?: { address?: string };
    google?: { email?: string };
    apple?: { email?: string };
    discord?: { username?: string };
    twitter?: { username?: string };
    github?: { username?: string };
    telegram?: { username?: string; firstName?: string };
    farcaster?: { username?: string; displayName?: string };
    phone?: { number?: string };
  };
  return (
    u.email?.address ??
    u.google?.email ??
    u.apple?.email ??
    u.discord?.username ??
    u.twitter?.username ??
    u.github?.username ??
    u.telegram?.username ??
    u.telegram?.firstName ??
    u.farcaster?.username ??
    u.farcaster?.displayName ??
    u.phone?.number ??
    undefined
  );
}

function privyLoginMethodsToOptions(
  methods: PrivyClientConfig["loginMethods"] | undefined,
) {
  return (methods ?? [])
    .map((method) =>
      asAomiAuthMethod(method === "twitter" ? "x" : String(method)),
    )
    .filter((method): method is AomiAuthMethod => Boolean(method))
    .map(toSocialLoginOption);
}

function buildPrivySvmWalletState({
  wallet,
  wallets,
  setActiveAddress,
}: {
  wallet: PrivySolanaWallet | undefined;
  wallets: readonly PrivySolanaWallet[];
  setActiveAddress: (address: string) => void;
}): SafeSvmWalletState {
  return {
    publicKey: wallet?.address,
    connected: Boolean(wallet?.address),
    connecting: false,
    disconnecting: false,
    walletName: wallet ? "Privy Solana" : undefined,
    wallets: wallets.map((entry) => ({
      adapter: {
        name: `Privy Solana ${formatAddress(entry.address) ?? ""}`.trim(),
        readyState: "Installed" as const,
      },
      readyState: "Installed" as const,
    })),
    select: (walletName) => {
      const target = wallets.find((entry) =>
        walletName.toString().includes(formatAddress(entry.address) ?? ""),
      );
      if (target?.address) setActiveAddress(target.address);
    },
    connect: async () => undefined,
    disconnect: undefined,
    signTransaction: wallet?.signTransaction
      ? async (tx) => wallet.signTransaction!(tx as never)
      : undefined,
    signAllTransactions: undefined,
    signMessage: wallet?.signMessage
      ? async (message) => wallet.signMessage!(message)
      : undefined,
    sendTransaction: wallet?.sendTransaction
      ? async (tx, connection) =>
          wallet.sendTransaction!(tx as never, connection as never)
      : undefined,
  };
}

async function sendPrivySmartWalletTransaction({
  payload,
  smartWalletClient,
  getClientForChain,
  wagmiChainId,
  smartAddress,
}: {
  payload: WalletTxPayload;
  smartWalletClient: NonNullable<SmartWalletsHook["client"]>;
  getClientForChain: SmartWalletsHook["getClientForChain"];
  wagmiChainId?: number;
  smartAddress?: Hex;
}): Promise<AomiTxResult> {
  const targetChainId = payload.chainId ?? wagmiChainId ?? 1;
  const callList = toAAWalletCalls(payload, targetChainId);
  if (callList.length === 0) {
    throw new Error("pending_transaction_missing_call_data");
  }

  const client =
    (await getClientForChain({ id: targetChainId })) ?? smartWalletClient;
  const isBatch = callList.length > 1;
  const txHash = isBatch
    ? await (
        client.sendTransaction as (args: {
          calls: Array<{ to: Hex; value: bigint; data?: Hex }>;
        }) => Promise<Hex>
      )({
        calls: callList.map((c) => ({
          to: c.to,
          value: c.value,
          data: c.data,
        })),
      })
    : await client.sendTransaction({
        to: callList[0].to,
        value: callList[0].value,
        data: callList[0].data,
      });

  return {
    txHash,
    amount: payload.value,
    aaRequestedMode: isBatch ? "4337" : "none",
    aaResolvedMode: "4337",
    executionKind: "privy_smart_wallet_4337",
    batched: isBatch,
    callCount: callList.length,
    sponsored: undefined,
    SmartAccount4337: smartAddress,
  };
}

function AomiPrivyPluginProvider({
  children,
  solanaConfig,
  supportedChains,
  loginMethods,
}: {
  children: ReactNode;
  solanaConfig: ResolvedSvmConfig;
  supportedChains: readonly Chain[];
  loginMethods?: PrivyClientConfig["loginMethods"];
}) {
  const privy = useSafePrivy();
  const { client: smartWalletClient, getClientForChain } =
    useSafeSmartWallets();
  const { wallets: solanaWallets } = useSafeSvmWallets();
  const [activeSolanaAddress, setActiveSolanaAddress] = useState<
    string | undefined
  >();
  const {
    selectedEvmChainId,
    selectedSolanaNetwork,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks,
  } = useAomiWalletNetworkPreferences();
  const evmRuntime = useEvmWalletRuntime({
    configuredChains: supportedChains,
    selectedEvmChainId,
    setSelectedEvmChainId,
    storageKey: REGISTRY_STORAGE_KEY,
    providerHooks: { providerLogout: privy.logout },
  });
  const smartAddress = smartWalletClient?.account?.address as Hex | undefined;
  const activeSolanaWallet =
    solanaWallets.find((wallet) => wallet.address === activeSolanaAddress) ??
    solanaWallets[0];
  const svmWallet = useMemo(
    () =>
      buildPrivySvmWalletState({
        wallet: activeSolanaWallet,
        wallets: solanaWallets,
        setActiveAddress: setActiveSolanaAddress,
      }),
    [activeSolanaWallet, solanaWallets],
  );

  useSvmRegistrySource(evmRuntime.registryStore, { svmWallet });

  useEffect(() => {
    if (
      activeSolanaAddress &&
      solanaWallets.some((wallet) => wallet.address === activeSolanaAddress)
    ) {
      return;
    }
    setActiveSolanaAddress(solanaWallets[0]?.address);
  }, [activeSolanaAddress, solanaWallets]);

  useEffect(() => {
    evmRuntime.registryStore.dispatch({
      type: "provider/embedded-session-changed",
      up: privy.authenticated && Boolean(smartAddress),
      providerId: "privy",
      uid: "privy-smart-session",
      stableId: "privy",
      walletName: "Privy Smart Wallet",
      embeddedEvmAddress: smartAddress ?? null,
      now: Date.now(),
    });
  }, [evmRuntime.registryStore, privy.authenticated, smartAddress]);

  const authMethod = inferPrivyAuthProvider(privy.user);
  const primaryLabel = inferPrivyPrimaryLabel(privy.user);
  const authRuntime = useMemo<AuthRuntime>(
    () => ({
      provider: "privy",
      sessionProvider: "privy",
      embeddedProvider: "privy",
      legacyWalletProvider: "privy",
      providerLabel: "Privy",
      status: !privy.ready
        ? "booting"
        : privy.authenticated
          ? "authenticated"
          : "unauthenticated",
      subject: privy.user?.id,
      primaryLabel,
      authMethod,
      authValue: primaryLabel,
      methods: privyLoginMethodsToOptions(loginMethods),
      canOpenModal: Boolean(privy.login),
      login: async () => {
        await privy.login();
      },
      openAccountUI: async () => {
        await privy.login();
      },
      getCredential: privy.getAccessToken
        ? async (): Promise<AomiAccountCredential | null> => {
            const token = (await privy.getAccessToken())?.trim();
            return token ? { provider: "privy", providerToken: token } : null;
          }
        : undefined,
    }),
    [
      authMethod,
      loginMethods,
      primaryLabel,
      privy.authenticated,
      privy.getAccessToken,
      privy.login,
      privy.ready,
      privy.user?.id,
    ],
  );

  const svmRuntimeConfig = useMemo(
    () => ({
      cluster: selectedSolanaNetwork?.cluster ?? solanaConfig.cluster,
      rpcHttpUrl: selectedSolanaNetwork?.rpcHttpUrl ?? solanaConfig.rpcHttpUrl,
      rpcWsUrl: selectedSolanaNetwork?.rpcWsUrl ?? solanaConfig.rpcWsUrl,
      preferDirectSend: solanaConfig.preferDirectSend,
    }),
    [selectedSolanaNetwork, solanaConfig],
  );
  const executionRuntime = useMemo<ExecutionRuntime>(
    () => ({
      sponsorship: {},
      evm: {
        activeConnector: evmRuntime.activeConnector,
        capabilities: evmRuntime.capabilities,
        chainsById: evmRuntime.chainsById,
        currentChainId: evmRuntime.activeEvmConnection?.chainId,
        getWalletClientFor: evmRuntime.getWalletClientFor,
        sendCallsSyncAsync: evmRuntime.sendCallsSyncAsync,
        sendTransactionAsync: evmRuntime.sendTransactionAsync,
        shouldUseExternalSigner: evmRuntime.shouldUseExternalSigner,
        signMessageAsync: evmRuntime.signMessageAsync,
        signTypedDataAsync: evmRuntime.signTypedDataAsync,
        switchChainAsync: evmRuntime.switchChainAsync,
        walletClient: evmRuntime.walletClient,
        resolveAAProviderState: async (params, context) =>
          resolveExternalWalletAAProviderState({
            ...params,
            walletClient: context.walletClient,
            address: context.address,
          }),
        sendTransaction: smartWalletClient
          ? async (payload) =>
              sendPrivySmartWalletTransaction({
                payload,
                smartWalletClient,
                getClientForChain,
                wagmiChainId: evmRuntime.activeEvmConnection?.chainId,
                smartAddress,
              })
          : undefined,
        signTypedData: smartWalletClient
          ? async (payload: WalletEip712Payload) => {
              const args = toViemSignTypedDataArgs(payload);
              if (!args) throw new Error("Missing typed_data payload");
              const signature = await smartWalletClient.signTypedData(
                args as never,
              );
              return { signature };
            }
          : undefined,
      },
      svm: buildSvmTransactionMethods(svmWallet, svmRuntimeConfig),
    }),
    [
      evmRuntime,
      getClientForChain,
      smartAddress,
      smartWalletClient,
      svmRuntimeConfig,
      svmWallet,
    ],
  );

  return (
    <AomiAdapterComposer
      auth={authRuntime}
      evm={evmRuntime}
      svm={{
        wallet: svmWallet,
        config: svmRuntimeConfig,
        supportedNetworks: supportedSolanaNetworks,
        selectedNetwork: selectedSolanaNetwork,
        setSelectedNetworkId: setSelectedSolanaNetworkId,
      }}
      execution={executionRuntime}
      supportedChains={supportedChains}
    >
      {children}
    </AomiAdapterComposer>
  );
}

function AomiPrivyProviderInner({
  children,
  appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  appName = "Aomi",
  appLogoUrl,
  networks = defaultNetworks,
  loginMethods,
  walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  solana,
}: AomiPrivyProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const { selectedEvmChainId, selectedSolanaNetworkId } =
    useAomiWalletNetworkPreferences();
  const defaultEvmChain =
    networks.find((chain) => chain.id === selectedEvmChainId) ?? networks[0];
  const resolvedSolanaConfig = useMemo<ResolvedSvmConfig>(() => {
    const supportedNetworks = normalizeSvmNetworkOptions(solana);
    const activeNetwork = resolveSelectedSvmNetwork(
      supportedNetworks,
      selectedSolanaNetworkId,
    );
    return {
      networks: supportedNetworks,
      activeNetwork,
      cluster: activeNetwork.cluster,
      rpcHttpUrl: activeNetwork.rpcHttpUrl,
      rpcWsUrl: activeNetwork.rpcWsUrl,
      preferDirectSend: solana?.preferDirectSend ?? true,
    };
  }, [selectedSolanaNetworkId, solana]);
  const wagmiConfig = useMemo(
    () =>
      createAomiEvmConfig({
        chains: networks,
        walletConnectProjectId,
        appName,
        appLogoUrl,
      }),
    [appLogoUrl, appName, networks, walletConnectProjectId],
  );

  const adapter = (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <SmartWalletsProvider>
          <AomiPrivyPluginProvider
            solanaConfig={resolvedSolanaConfig}
            supportedChains={networks}
            loginMethods={loginMethods}
          >
            {children}
          </AomiPrivyPluginProvider>
        </SmartWalletsProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );

  if (!appId) return adapter;

  return (
    <PrivyProvider
      appId={appId}
      config={
        {
          appearance: {
            walletList: ["detected_wallets", "metamask", "wallet_connect"],
            logo: appLogoUrl,
          },
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
            solana: { createOnLogin: "all-users" },
          },
          defaultChain: defaultEvmChain,
          supportedChains: networks as unknown as Chain[],
          loginMethods,
          ...(walletConnectProjectId
            ? { walletConnectCloudProjectId: walletConnectProjectId }
            : {}),
          appName,
        } as PrivyClientConfig
      }
    >
      {adapter}
    </PrivyProvider>
  );
}

export function AomiPrivyProvider({
  networks = defaultNetworks,
  solana,
  ...rest
}: AomiPrivyProviderProps) {
  const supportedSolanaNetworks = useMemo(
    () => normalizeSvmNetworkOptions(solana),
    [solana],
  );

  return (
    <AomiWalletNetworkPreferencesProvider
      evmChains={networks}
      solanaNetworks={supportedSolanaNetworks}
      storageKey="privy"
    >
      <ExtUserProvider>
        <AomiPrivyProviderInner {...rest} networks={networks} solana={solana} />
      </ExtUserProvider>
    </AomiWalletNetworkPreferencesProvider>
  );
}

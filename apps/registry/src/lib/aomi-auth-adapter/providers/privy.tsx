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
import {
  WagmiProvider,
  createConfig as createPrivyWagmiConfig,
} from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Chain, Hex } from "viem";
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
import {
  Connection as SolanaConnection,
  Transaction as SolanaTransaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type {
  WalletEip712Payload,
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
  WalletTxPayload,
} from "@aomi-labs/react";
import { toAAWalletCalls, toViemSignTypedDataArgs } from "@aomi-labs/react";
import { AomiAuthAdapterProvider } from "../context";
import {
  AomiWalletNetworkPreferencesProvider,
  useAomiWalletNetworkPreferences,
} from "../network-preferences";
import {
  DEFAULT_SOLANA_CLUSTER,
  DEFAULT_SOLANA_RPC_HTTP_URLS,
  normalizeSolanaNetworkOptions,
  resolveSelectedSolanaNetwork,
} from "../solana-networks";
import {
  AOMI_AUTH_BOOTING_IDENTITY,
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  formatAddress,
  formatAuthProvider,
} from "../identity";
import { buildAccounts } from "../accounts";
import {
  useSafeSwitchChain,
  useSafeWagmiAccount,
  useSafeWagmiConfig,
} from "../safe-wagmi-hooks";
import type {
  AomiAuthAdapter,
  AomiAuthIdentity,
  AomiAuthMethod,
  AomiTxResult,
  SolanaCluster,
  SolanaNetworkOption,
  WalletFamily,
} from "../types";

const DEFAULT_SOLANA_ENDPOINT =
  DEFAULT_SOLANA_RPC_HTTP_URLS[DEFAULT_SOLANA_CLUSTER];

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

type ResolvedSolanaConfig = {
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
    cluster?: ResolvedSolanaConfig["cluster"];
    rpcHttpUrl?: string;
    rpcWsUrl?: string;
    preferDirectSend?: boolean;
  };
};

// ---------------------------------------------------------------------------
// base64 / Solana tx helpers — same shape as para-sol.tsx, intentionally
// duplicated so the registry can ship `aomi-privy-provider` without pulling
// in `para-sol.tsx`.
// ---------------------------------------------------------------------------

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

function deserializeSolanaTransaction(
  bytes: Uint8Array,
): VersionedTransaction | SolanaTransaction {
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return SolanaTransaction.from(bytes);
  }
}

// ---------------------------------------------------------------------------
// Safe Privy hook wrappers — Privy hooks throw when called outside
// <PrivyProvider>. The no-appId fallback path renders the adapter without
// mounting PrivyProvider, so each hook gets a try/catch that returns a
// disconnected shape (mirrors `useSafeWagmi*` / `useSafeSolanaWallet`).
// ---------------------------------------------------------------------------

type PrivyHook = ReturnType<typeof usePrivy>;
type SmartWalletsHook = ReturnType<typeof useSmartWallets>;
type SolanaWalletsHook = ReturnType<typeof useSolanaWallets>;

const DISCONNECTED_PRIVY: PrivyHook = {
  ready: false,
  authenticated: false,
  user: null,
  login: async () => undefined,
  logout: async () => undefined,
} as unknown as PrivyHook;

const DISCONNECTED_SMART_WALLETS: SmartWalletsHook = {
  client: undefined,
  getClientForChain: async () => undefined,
} as unknown as SmartWalletsHook;

const DISCONNECTED_SOLANA_WALLETS: SolanaWalletsHook = {
  wallets: [],
  ready: false,
} as unknown as SolanaWalletsHook;

function useSafePrivy(): PrivyHook {
  try {
    return usePrivy();
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

function useSafeSolanaWallets(): SolanaWalletsHook {
  try {
    return useSolanaWallets();
  } catch {
    return DISCONNECTED_SOLANA_WALLETS;
  }
}

// ---------------------------------------------------------------------------
// Privy identity mapping
// ---------------------------------------------------------------------------

type PrivyUser = ReturnType<typeof usePrivy>["user"];

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
]);

function asAomiAuthMethod(value: string | undefined): AomiAuthMethod | undefined {
  return value && AOMI_AUTH_METHODS.has(value as AomiAuthMethod)
    ? (value as AomiAuthMethod)
    : undefined;
}

function inferPrivyAuthProvider(user: PrivyUser): AomiAuthMethod | undefined {
  if (!user) return undefined;
  // Walk linked accounts in label-priority order. Privy account types map
  // 1:1 to identity.formatAuthProvider's keys with light renaming
  // (e.g. a connected wallet surfaces as the `wagmi` auth method).
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

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

function AomiPrivyAdapterProvider({
  children,
  solanaConfig,
}: {
  children: ReactNode;
  solanaConfig: ResolvedSolanaConfig;
}) {
  const privy = useSafePrivy();
  const { client: smartWalletClient, getClientForChain } =
    useSafeSmartWallets();
  const { wallets: solanaWallets } = useSafeSolanaWallets();
  const [activeSolanaAddress, setActiveSolanaAddress] = useState<
    string | undefined
  >();
  const wagmiConfig = useSafeWagmiConfig();
  const { switchChainAsync, isPending: isSwitchingChain } =
    useSafeSwitchChain();
  // Track the active EVM chain via wagmi (Privy's wagmi connector keeps this
  // in sync). `SmartAccountClient.chain` isn't part of Privy's public types,
  // so we read chainId from wagmi rather than the smart-wallet client.
  const { chainId: wagmiChainId } = useSafeWagmiAccount();
  const {
    selectedFamily,
    selectedEvmChainId,
    selectedSolanaNetwork,
    setSelectedFamily,
    setSelectedEvmChainId,
    setSelectedSolanaNetworkId,
    supportedSolanaNetworks,
  } = useAomiWalletNetworkPreferences();

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
    if (
      !privy.authenticated ||
      !selectedEvmChainId ||
      !switchChainAsync ||
      wagmiChainId === selectedEvmChainId
    ) {
      return;
    }
    void switchChainAsync({ chainId: selectedEvmChainId });
  }, [privy.authenticated, selectedEvmChainId, switchChainAsync, wagmiChainId]);

  const adapter = useMemo<AomiAuthAdapter>(() => {
    const isReady = privy.ready;
    const isBooting = !isReady;

    const smartAddress = smartWalletClient?.account?.address as
      | `0x${string}`
      | undefined;
    const chainId = wagmiChainId;
    const authProvider = inferPrivyAuthProvider(privy.user);
    const providerLabel = formatAuthProvider(authProvider) ?? "Privy";
    const primary = inferPrivyPrimaryLabel(privy.user);

    const solanaWallet =
      solanaWallets.find((wallet) => wallet.address === activeSolanaAddress) ??
      solanaWallets[0];
    const svmAddress = solanaWallet?.address;
    const activeFamily: WalletFamily =
      selectedFamily === "solana" && supportedSolanaNetworks.length > 0
        ? "solana"
        : "evm";
    const accounts = buildAccounts({
      evmConnections: smartAddress
        ? [
            {
              id: `privy-smart:${smartAddress}`,
              walletName: "Privy Smart Wallet",
              address: smartAddress,
              chainId,
            },
          ]
        : [],
      activeEvmAddress: smartAddress,
      solanaConnections: solanaWallets.map((wallet) => ({
        id: `privy-solana:${wallet.address}`,
        walletName: "Privy Solana",
        publicKey: wallet.address,
      })),
      activeSolanaAddress: svmAddress,
    });

    // Connection state allows EVM-only (smart wallet) OR Solana-only OR both.
    // Smart-wallet enforcement is per-call in `sendTransaction` (we throw if
    // smart wallet is missing when the caller asks for EVM tx); identity-level
    // "connected" is more permissive so the Solana-only flow can work even
    // without smart wallets enabled in the partner's Privy dashboard.
    const isConnected = Boolean(
      privy.authenticated && (smartWalletClient || svmAddress),
    );

    const solanaCapabilities = svmAddress
      ? {
          canSignMessage: Boolean(solanaWallet?.signMessage),
          canSignTransaction: Boolean(solanaWallet?.signTransaction),
          canSignAllTransactions: false,
          canSendTransaction: Boolean(solanaWallet?.sendTransaction),
          canSignAndSendTransaction: Boolean(solanaWallet?.sendTransaction),
        }
      : undefined;

    const identity: AomiAuthIdentity = isBooting
      ? {
          ...AOMI_AUTH_BOOTING_IDENTITY,
          chainId: chainId ?? undefined,
          solanaCluster: solanaConfig.cluster,
        }
      : isConnected && smartAddress
        ? {
            status: "connected",
            isConnected: true,
            address: smartAddress,
            chainId: chainId ?? undefined,
            svmAddress,
            walletProvider: "privy",
            authProvider,
            primaryLabel: primary ?? formatAddress(smartAddress) ?? "Privy",
            secondaryLabel: providerLabel,
            aaMode: "4337",
            SmartAccount4337: smartAddress,
            solanaCluster: solanaConfig.cluster,
            solanaWalletName: solanaWallet ? "Privy Solana" : undefined,
            solanaTransport: svmAddress ? "embedded" : undefined,
            solanaCapabilities,
          }
        : isConnected && svmAddress
          ? {
              status: "connected",
              isConnected: true,
              chainId: chainId ?? undefined,
              svmAddress,
              walletProvider: "privy",
              authProvider,
              primaryLabel:
                primary ?? formatAddress(svmAddress) ?? "Privy Solana",
              secondaryLabel: providerLabel,
              solanaCluster: solanaConfig.cluster,
              solanaWalletName: "Privy Solana",
              solanaTransport: "embedded",
              solanaCapabilities,
            }
          : {
              ...AOMI_AUTH_DISCONNECTED_IDENTITY,
              chainId: chainId ?? undefined,
              authProvider,
              solanaCluster: solanaConfig.cluster,
            };

    const sendTransaction = async (
      payload: WalletTxPayload,
    ): Promise<AomiTxResult> => {
      if (!smartWalletClient) {
        throw new Error(
          "Privy smart wallet not initialized. Enable smart wallets in your Privy dashboard.",
        );
      }

      const targetChainId = payload.chainId ?? wagmiChainId ?? 1;
      const callList = toAAWalletCalls(payload, targetChainId);
      if (callList.length === 0) {
        throw new Error("pending_transaction_missing_call_data");
      }

      // `getClientForChain` is the documented way to get a chain-scoped
      // smart-wallet client. It returns the cached client when called with
      // the user's current chain id, so calling it unconditionally is safe.
      const client =
        (await getClientForChain({ id: targetChainId })) ?? smartWalletClient;

      const isBatch = callList.length > 1;
      // Privy smart-wallet clients extend viem's smart-account client
      // (permissionless). Both single-call and batch land in one userOp
      // via `sendTransaction` — single takes `{to,value,data}`, batch
      // takes `{calls: [...]}`. Cast through `unknown` to avoid pulling
      // permissionless types into our deps.
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
        // Sponsorship is configured server-side in the Privy dashboard;
        // not observable from the client SDK at the call site.
        sponsored: undefined,
        SmartAccount4337: smartAddress,
      };
    };

    return {
      identity,
      isReady: !isBooting,
      isSwitchingChain: isSwitchingChain,
      accounts,
      selectAccount: async (id) => {
        const target = accounts.find((account) => account.id === id);
        if (!target) {
          throw new Error(`Unknown account: ${id}`);
        }
        setSelectedFamily(target.family);
        if (target.family === "solana") {
          setActiveSolanaAddress(target.address);
        }
      },
      // Connect/disconnect aren't gated by the overall identity here —
      // even when the user has a Privy session, they may still want to
      // (re-)open the login modal to link a second wallet family.
      canConnect: isReady,
      canOpenAccountUI: isReady && identity.isConnected,
      canDisconnect: isReady && identity.isConnected,
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
                  chainId ??
                  selectedEvmChainId ??
                  wagmiConfig.chains[0]?.id ??
                  1,
              }
            : undefined
          : selectedSolanaNetwork
            ? {
                family: "solana",
                networkId: selectedSolanaNetwork.id,
              }
            : undefined,
      connect: async (options) => {
        setSelectedFamily(options?.family ?? selectedFamily);
        await privy.login();
      },
      // Privy has no dedicated "account" modal — surface the login UI,
      // which doubles as the linked-accounts view when authenticated.
      openAccountUI: async (options) => {
        setSelectedFamily(options?.family ?? activeFamily);
        await privy.login();
      },
      disconnect: async () => {
        await privy.logout();
      },
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            setSelectedFamily("evm");
            setSelectedEvmChainId(nextChainId);
            await switchChainAsync({ chainId: nextChainId });
            await getClientForChain({ id: nextChainId });
          }
        : undefined,
      selectNetwork: async (target) => {
        if (target.family === "evm") {
          setSelectedFamily("evm");
          setSelectedEvmChainId(target.chainId);
          if (switchChainAsync && wagmiChainId !== target.chainId) {
            await switchChainAsync({ chainId: target.chainId });
          }
          await getClientForChain({ id: target.chainId });
          return;
        }

        setSelectedFamily("solana");
        setSelectedSolanaNetworkId(target.networkId);
      },
      sendTransaction,
      signTypedData: async (payload: WalletEip712Payload) => {
        if (!smartWalletClient) {
          throw new Error(
            "Privy smart wallet not initialized. Enable smart wallets in your Privy dashboard.",
          );
        }
        const args = toViemSignTypedDataArgs(payload);
        if (!args) throw new Error("Missing typed_data payload");
        const signature = await smartWalletClient.signTypedData(args as never);
        return { signature };
      },
      signSolanaTransaction: solanaWallet?.signTransaction
        ? async (payload: WalletSolanaSignPayload) => {
            if (!payload.unsignedTx) {
              throw new Error("Missing unsigned_tx payload");
            }
            const tx = deserializeSolanaTransaction(
              decodeBase64(payload.unsignedTx),
            );
            const signed = await solanaWallet.signTransaction!(tx as never);
            return {
              signedTx: encodeBase64(
                (
                  signed as VersionedTransaction | SolanaTransaction
                ).serialize(),
              ),
            };
          }
        : undefined,
      signSolanaMessage: solanaWallet?.signMessage
        ? async (payload: WalletSolanaSignMessagePayload) => {
            if (!payload.message) throw new Error("Missing message payload");
            const signature = await solanaWallet.signMessage!(
              decodeBase64(payload.message),
            );
            return { signature: encodeBase64(signature) };
          }
        : undefined,
      sendSolanaTransaction: solanaWallet?.sendTransaction
        ? async (payload: WalletSolanaSignPayload) => {
            if (!payload.unsignedTx) {
              throw new Error("Missing unsigned_tx payload");
            }
            const connection = new SolanaConnection(
              solanaConfig.rpcHttpUrl,
              "confirmed",
            );
            const signature = await solanaWallet.sendTransaction!(
              deserializeSolanaTransaction(decodeBase64(payload.unsignedTx)),
              connection,
            );
            return { signature };
          }
        : undefined,
      signAndSendSolanaTransaction:
        Boolean(solanaWallet?.sendTransaction) && solanaConfig.preferDirectSend
          ? async (payload: WalletSolanaSignPayload) => {
              if (!payload.unsignedTx) {
                throw new Error("Missing unsigned_tx payload");
              }
              const connection = new SolanaConnection(
                solanaConfig.rpcHttpUrl,
                "confirmed",
              );
              const signature = await solanaWallet.sendTransaction!(
                deserializeSolanaTransaction(decodeBase64(payload.unsignedTx)),
                connection,
              );
              return { signature };
            }
          : undefined,
      solanaRpcHttpUrl: solanaConfig.rpcHttpUrl,
      solanaRpcWsUrl: solanaConfig.rpcWsUrl,
    };
  }, [
    getClientForChain,
    isSwitchingChain,
    privy.authenticated,
    privy.login,
    privy.logout,
    privy.ready,
    privy.user,
    selectedEvmChainId,
    selectedFamily,
    selectedSolanaNetwork,
    activeSolanaAddress,
    setActiveSolanaAddress,
    setSelectedEvmChainId,
    setSelectedFamily,
    setSelectedSolanaNetworkId,
    smartWalletClient,
    solanaConfig,
    solanaWallets,
    supportedSolanaNetworks,
    wagmiChainId,
    wagmiConfig.chains,
    switchChainAsync,
  ]);

  return (
    <AomiAuthAdapterProvider value={adapter}>
      {children}
    </AomiAuthAdapterProvider>
  );
}

// ---------------------------------------------------------------------------
// Top-level provider
// ---------------------------------------------------------------------------

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

  const wagmiConfig = useMemo(
    () =>
      createPrivyWagmiConfig({
        chains: networks,
        transports: Object.fromEntries(
          networks.map((n) => [n.id, http(n.rpcUrls.default.http[0])]),
        ),
        ssr: true,
      }),
    [networks],
  );

  const resolvedSolanaConfig = useMemo<ResolvedSolanaConfig>(() => {
    const supportedNetworks = normalizeSolanaNetworkOptions(solana);
    const activeNetwork = resolveSelectedSolanaNetwork(
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

  // No appId → disconnected adapter (mirrors AomiParaProvider's no-API-key path).
  if (!appId) {
    return (
      <QueryClientProvider client={queryClient}>
        <AomiPrivyAdapterProvider solanaConfig={resolvedSolanaConfig}>
          {children}
        </AomiPrivyAdapterProvider>
      </QueryClientProvider>
    );
  }

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
            // Ethereum stays "users-without-wallets" because the smart wallet
            // (when enabled) prefers the user's connected EOA as owner —
            // double-provisioning would create a second embedded EOA that
            // never gets used.
            ethereum: { createOnLogin: "users-without-wallets" },
            // Solana is created for everyone: Phantom-as-EVM and most external
            // wallet connections don't expose Solana keys to Privy, so we need
            // a Privy-managed Solana wallet for the SVM signing path to work.
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
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <SmartWalletsProvider>
            <AomiPrivyAdapterProvider solanaConfig={resolvedSolanaConfig}>
              {children}
            </AomiPrivyAdapterProvider>
          </SmartWalletsProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

export function AomiPrivyProvider({
  networks = defaultNetworks,
  solana,
  ...rest
}: AomiPrivyProviderProps) {
  const supportedSolanaNetworks = useMemo(
    () => normalizeSolanaNetworkOptions(solana),
    [solana],
  );

  return (
    <AomiWalletNetworkPreferencesProvider
      evmChains={networks}
      solanaNetworks={supportedSolanaNetworks}
    >
      <AomiPrivyProviderInner {...rest} networks={networks} solana={solana} />
    </AomiWalletNetworkPreferencesProvider>
  );
}

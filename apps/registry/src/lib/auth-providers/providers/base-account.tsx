"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  type Connector,
  WagmiProvider,
  cookieStorage,
  createConfig,
  createStorage,
  http,
  useAccount,
  useConnect,
  useDisconnect,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
} from "wagmi";
import { baseAccount, injected } from "wagmi/connectors";
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
import type { Chain, Transport } from "viem";
import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { WalletEip712Payload, WalletTxPayload } from "@aomi-labs/react";
import { AomiAuthAdapterContext } from "../context";
import {
  AOMI_AUTH_DISCONNECTED_IDENTITY,
  type AomiAuthAdapter,
  type AomiAuthIdentity,
} from "../types";
import { formatAddress } from "../auth-identity";

// ---------------------------------------------------------------------------
// Wagmi config factory
// ---------------------------------------------------------------------------

const defaultNetworks = [
  base,
  mainnet,
  arbitrum,
  optimism,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
] as const satisfies readonly [Chain, ...Chain[]];

function buildTransports(
  chains: readonly Chain[],
): Record<number, Transport> {
  return Object.fromEntries(
    chains.map((c) => [c.id, http(c.rpcUrls.default.http[0])]),
  ) as Record<number, Transport>;
}

function createWagmiConfig(appName: string) {
  return createConfig({
    chains: defaultNetworks,
    connectors: [
      injected(),
      baseAccount({ appName }),
    ],
    storage: createStorage({ storage: cookieStorage }),
    ssr: true,
    transports: buildTransports(defaultNetworks),
  });
}

// ---------------------------------------------------------------------------
// crypto.randomUUID polyfill for environments that lack it
// ---------------------------------------------------------------------------

function ensureCryptoRandomUuid() {
  if (typeof globalThis === "undefined") return;
  const crypto = globalThis.crypto;
  if (!crypto || typeof crypto.randomUUID === "function") return;

  Object.defineProperty(crypto, "randomUUID", {
    configurable: true,
    value: (): `${string}-${string}-${string}-${string}-${string}` => {
      const bytes = new Uint8Array(16);
      if (crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < bytes.length; i += 1) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
      }
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
      return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
    },
  });
}

ensureCryptoRandomUuid();

// ---------------------------------------------------------------------------
// Internal adapter hook (wagmi-only)
// ---------------------------------------------------------------------------

function pickConnector(connectors: readonly Connector[]) {
  return (
    connectors.find((c) => c.id === "baseAccount") ??
    connectors.find((c) => c.id === "injected") ??
    connectors[0]
  );
}

function useBaseAccountAdapter(): AomiAuthAdapter {
  const { address, chainId, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();

  return useMemo(() => {
    const connector = pickConnector(connectors);

    const identity: AomiAuthIdentity =
      isConnecting && !isConnected
        ? {
            status: "booting",
            isConnected: false,
            chainId,
            primaryLabel: "Loading Wallet...",
          }
        : isConnected && address
          ? {
              status: "connected",
              isConnected: true,
              address,
              chainId,
              authProvider: "wallet",
              primaryLabel: formatAddress(address) ?? "Connected wallet",
            }
          : {
              ...AOMI_AUTH_DISCONNECTED_IDENTITY,
              chainId,
              authProvider: "wallet",
            };

    return {
      identity,
      isReady: identity.status !== "booting",
      isSwitchingChain,
      canConnect: Boolean(connector) && !identity.isConnected,
      canManageAccount: identity.isConnected,
      connect: async () => {
        if (connector) {
          await connectAsync({ connector });
        }
      },
      manageAccount: async () => {
        await disconnectAsync();
      },
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            await switchChainAsync({ chainId: nextChainId as never });
          }
        : undefined,
      sendTransaction: sendTransactionAsync
        ? async (payload: WalletTxPayload) => {
            const txHash = await sendTransactionAsync({
              chainId: payload.chainId as never,
              to: payload.to as `0x${string}`,
              value: payload.value ? BigInt(payload.value) : undefined,
              data:
                payload.data && payload.data !== "0x"
                  ? (payload.data as `0x${string}`)
                  : undefined,
            });
            return { txHash, amount: payload.value };
          }
        : undefined,
      signTypedData: signTypedDataAsync
        ? async (payload: WalletEip712Payload) => {
            const signature = await signTypedDataAsync(payload as never);
            return { signature };
          }
        : undefined,
    };
  }, [
    address,
    chainId,
    connectAsync,
    connectors,
    disconnectAsync,
    isConnected,
    isConnecting,
    isSwitchingChain,
    sendTransactionAsync,
    signTypedDataAsync,
    switchChainAsync,
  ]);
}

// ---------------------------------------------------------------------------
// Inner component (needs to be inside WagmiProvider)
// ---------------------------------------------------------------------------

function BaseAccountInner({ children }: { children: ReactNode }) {
  const adapter = useBaseAccountAdapter();

  return (
    <AomiAuthAdapterContext.Provider value={adapter}>
      {children}
    </AomiAuthAdapterContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Public provider
// ---------------------------------------------------------------------------

export type AomiBaseAccountProviderProps = {
  children: ReactNode;
  appName?: string;
};

/**
 * Self-contained auth provider for Base Account (Smart Wallet) + injected
 * wallet support via Wagmi.
 *
 * Sets up WagmiProvider, QueryClientProvider, and the Aomi auth adapter
 * context. Also syncs wallet state to Aomi's UserContext automatically.
 *
 * ```tsx
 * <AomiBaseAccountProvider appName="My App">
 *   <AomiFrame.Root>...</AomiFrame.Root>
 * </AomiBaseAccountProvider>
 * ```
 */
export function AomiBaseAccountProvider({
  children,
  appName = "Aomi",
}: AomiBaseAccountProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const wagmiConfig = useMemo(() => createWagmiConfig(appName), [appName]);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <BaseAccountInner>{children}</BaseAccountInner>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

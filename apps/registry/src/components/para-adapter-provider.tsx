"use client";

import "@getpara/react-sdk/styles.css";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import ParaWeb, {
  Environment,
  type TExternalWallet,
} from "@getpara/react-sdk";
import { createParaWagmiConfig } from "@getpara/evm-wallet-connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useAccount,
  useSendTransaction,
  useSignTypedData,
  useSwitchChain,
  WagmiProvider,
  createConfig,
} from "wagmi";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
} from "wagmi/chains";
import { defineChain, http, type Chain, type Transport } from "viem";
import {
  toViemSignTypedDataArgs,
  type WalletEip712Payload,
  type WalletTxPayload,
} from "@aomi-labs/react";
import type { AccountIdentity } from "../lib/account-identity";
import { formatAddress } from "../lib/account-identity";
import {
  AomiAdapterContext,
  DISCONNECTED_ADAPTER,
  type AomiAdapter,
} from "./aomi-adapter-provider";

const useLocalhost = process.env.NEXT_PUBLIC_USE_LOCALHOST === "true";
const LOCALHOST_CHAIN_ID = 31337;
const paraApiKey = process.env.NEXT_PUBLIC_PARA_API_KEY;
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_PROJECT_ID;
const paraEnvironment =
  (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as Environment | undefined) ??
  Environment.BETA;

const localhost = defineChain({
  id: LOCALHOST_CHAIN_ID,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
  blockExplorers: {
    default: {
      name: "Local",
      url: "http://127.0.0.1:8545",
    },
  },
});

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

const networks = (useLocalhost
  ? [localhost, ...defaultNetworks]
  : [...defaultNetworks]) as readonly [Chain, ...Chain[]];

const transports = Object.fromEntries(
  networks.map((network) => [network.id, http(network.rpcUrls.default.http[0])]),
) as Record<number, Transport>;

const externalWallets: TExternalWallet[] = [
  "WALLETCONNECT",
  "METAMASK",
  "COINBASE",
  "RAINBOW",
  "RABBY",
];

const adapterWallets = walletConnectProjectId
  ? externalWallets
  : externalWallets.filter((wallet) => wallet !== "WALLETCONNECT");
const wagmiProjectId =
  walletConnectProjectId ?? "missing-walletconnect-project-id";

const ssrFallbackConfig = createConfig({
  chains: networks,
  transports,
  ssr: true,
});

let browserParaClient: ParaWeb | null | undefined;
let browserWagmiConfig: ReturnType<typeof createParaWagmiConfig> | null | undefined;

function parseChainId(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith("0x")) {
    const parsedHex = Number.parseInt(trimmed.slice(2), 16);
    return Number.isFinite(parsedHex) ? parsedHex : undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getBrowserParaClient(): ParaWeb | null {
  if (typeof window === "undefined" || !paraApiKey) return null;
  if (browserParaClient !== undefined) return browserParaClient;

  browserParaClient = new ParaWeb(paraEnvironment, paraApiKey);
  return browserParaClient;
}

function getBrowserWagmiConfig(
  paraClient: ParaWeb,
): ReturnType<typeof createParaWagmiConfig> {
  if (browserWagmiConfig) return browserWagmiConfig;

  browserWagmiConfig = createParaWagmiConfig(paraClient, {
    appName: "Aomi Labs",
    appDescription: "AI-powered blockchain operations assistant",
    appUrl: window.location.origin,
    wallets: adapterWallets,
    projectId: wagmiProjectId,
    chains: networks,
    transports,
    ssr: true,
  });

  return browserWagmiConfig;
}

function LocalhostNetworkEnforcer({ children }: { children: ReactNode }) {
  const { isConnected, chainId, connector } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (!useLocalhost) return;
    if (!isConnected || chainId === LOCALHOST_CHAIN_ID) return;

    void (async () => {
      try {
        const provider = await connector?.getProvider();
        if (provider && typeof provider === "object" && "request" in provider) {
          const ethProvider = provider as {
            request: (args: { method: string; params: unknown[] }) => Promise<unknown>;
          };
          try {
            await ethProvider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${LOCALHOST_CHAIN_ID.toString(16)}`,
                  chainName: "Localhost",
                  nativeCurrency: {
                    name: "Ether",
                    symbol: "ETH",
                    decimals: 18,
                  },
                  rpcUrls: ["http://127.0.0.1:8545"],
                },
              ],
            });
          } catch {
            // Chain may already be configured in the wallet.
          }
        }

        switchChain({ chainId: LOCALHOST_CHAIN_ID });
      } catch (error) {
        console.error("[AomiAdapterProvider] Failed to switch localhost:", error);
      }
    })();
  }, [chainId, connector, isConnected, switchChain]);

  return <>{children}</>;
}

/**
 * Builds the adapter directly from wagmi hooks + ParaWeb client.
 * Does NOT depend on ParaProvider rendering children.
 */
function DirectParaAdapter({
  children,
  paraClient,
}: {
  children: ReactNode;
  paraClient: ParaWeb | null;
}) {
  const { address, chainId, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { signTypedDataAsync } = useSignTypedData();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const identity = useMemo<AccountIdentity>(() => {
    if (isConnected && address) {
      return {
        kind: "wallet",
        isConnected,
        address,
        chainId: chainId ?? undefined,
        authProvider: undefined,
        primaryLabel: formatAddress(address) ?? "Connected wallet",
      };
    }

    return {
      ...DISCONNECTED_ADAPTER.identity,
      chainId: chainId ?? undefined,
    };
  }, [address, chainId, isConnected]);

  const adapter = useMemo<AomiAdapter>(() => {
    return {
      identity,
      isReady: Boolean(paraClient),
      isSwitchingChain,
      canConnect: Boolean(paraClient),
      canManageAccount: false,
      connect: async () => {
        if (!paraClient) return;
        // Direct OAuth — ParaProvider suspends so we bypass the modal.
        // Open a popup for Google sign-in instead of redirecting the page.
        await paraClient.authenticateWithOAuth({
          method: "GOOGLE",
          redirectCallbacks: {
            onOAuthPopup: (_popupWindow: Window) => {
              // Para SDK opens the popup itself; we just acknowledge it.
            },
          },
        });
      },
      manageAccount: async () => undefined,
      switchChain: switchChainAsync
        ? async (nextChainId: number) => {
            await switchChainAsync({ chainId: nextChainId });
          }
        : undefined,
      sendTransaction: sendTransactionAsync
        ? async (payload: WalletTxPayload) => {
            if (
              payload.chainId &&
              payload.chainId !== chainId &&
              switchChainAsync
            ) {
              await switchChainAsync({ chainId: payload.chainId });
            }

            const txHash = await sendTransactionAsync({
              to: payload.to as `0x${string}`,
              value: payload.value ? BigInt(payload.value) : undefined,
              data:
                payload.data && payload.data !== "0x"
                  ? (payload.data as `0x${string}`)
                  : undefined,
            });

            return {
              txHash,
              amount: payload.value,
            };
          }
        : undefined,
      signTypedData: signTypedDataAsync
        ? async (payload: WalletEip712Payload) => {
            const signArgs = toViemSignTypedDataArgs(payload);
            if (!signArgs) {
              throw new Error("Missing typed_data payload");
            }

            const requestChainId = parseChainId(signArgs.domain?.chainId);
            if (
              requestChainId &&
              requestChainId !== chainId &&
              switchChainAsync
            ) {
              await switchChainAsync({ chainId: requestChainId });
            }

            const signature = await signTypedDataAsync(signArgs as never);
            return { signature };
          }
        : undefined,
    };
  }, [
    chainId,
    identity,
    isSwitchingChain,
    paraClient,
    sendTransactionAsync,
    signTypedDataAsync,
    switchChainAsync,
  ]);

  return (
    <AomiAdapterContext.Provider value={adapter}>
      {children}
    </AomiAdapterContext.Provider>
  );
}

export default function ParaAdapterProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [queryClient] = useState(() => new QueryClient());
  const [paraClient, setParaClient] = useState<ParaWeb | null>(null);
  const [wagmiConfig, setWagmiConfig] =
    useState<ReturnType<typeof createParaWagmiConfig> | null>(null);

  useEffect(() => {
    const client = getBrowserParaClient();
    setParaClient(client);
    setWagmiConfig(client ? getBrowserWagmiConfig(client) : null);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig ?? ssrFallbackConfig}>
        <LocalhostNetworkEnforcer>
          <DirectParaAdapter paraClient={paraClient}>
            {children}
          </DirectParaAdapter>
        </LocalhostNetworkEnforcer>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

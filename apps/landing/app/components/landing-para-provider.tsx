"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  Environment,
  ParaProvider,
  type TExternalWallet,
  type TOAuthMethod,
} from "@getpara/react-sdk";
import {
  AomiAuthAdapterProvider,
  AOMI_AUTH_DISCONNECTED_ADAPTER,
  type AomiAuthAdapter,
} from "@aomi-labs/widget-lib";
import "@getpara/react-sdk/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { defineChain, http, type Chain, type Transport } from "viem";
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
import { LandingAomiAuthBridge } from "./landing-aomi-auth-bridge";

const useLocalhost = process.env.NEXT_PUBLIC_USE_LOCALHOST === "true";

const paraApiKey = process.env.NEXT_PUBLIC_PARA_API_KEY;
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_PROJECT_ID;
const paraEnvironment =
  (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as Environment | undefined) ??
  Environment.BETA;

const localhost = defineChain({
  id: 31337,
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

const oAuthMethods: TOAuthMethod[] = ["GOOGLE"];

export function LandingParaProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [adapter, setAdapter] = useState<AomiAuthAdapter>(
    AOMI_AUTH_DISCONNECTED_ADAPTER,
  );

  const paraModalConfig = useMemo(
    () => ({
      disableEmailLogin: true,
      oAuthMethods,
    }),
    [],
  );

  const externalWalletConfig = useMemo(
    () => ({
      appDescription: "Interactive Aomi widget demo",
      appUrl:
        typeof window !== "undefined"
          ? window.location.origin
          : "https://aomi.dev",
      wallets: adapterWallets,
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
    [],
  );

  const handleAdapterChange = useCallback((nextAdapter: AomiAuthAdapter) => {
    setAdapter((currentAdapter) =>
      currentAdapter === nextAdapter ? currentAdapter : nextAdapter,
    );
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {paraApiKey && (
        <ParaProvider
          paraClientConfig={{
            apiKey: paraApiKey,
            env: paraEnvironment,
          }}
          config={{ appName: "Aomi Labs" }}
          paraModalConfig={paraModalConfig}
          externalWalletConfig={externalWalletConfig}
        >
          <LandingAomiAuthBridge onAdapterChange={handleAdapterChange} />
        </ParaProvider>
      )}
      <AomiAuthAdapterProvider value={adapter}>
        {children}
      </AomiAuthAdapterProvider>
    </QueryClientProvider>
  );
}

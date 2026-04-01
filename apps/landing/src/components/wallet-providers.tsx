"use client";

import "@getpara/react-sdk/styles.css";
import ParaWeb, { ParaProvider } from "@getpara/react-sdk";
import { createParaWagmiConfig } from "@getpara/evm-wallet-connectors";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useSwitchChain, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  LOCALHOST_CHAIN_ID,
  externalWallets,
  networks,
  oAuthMethods,
  paraApiKey,
  paraEnvironment,
  transports,
  useLocalhost,
  walletConnectProjectId,
} from "./config";

const APP_NAME = "Aomi Widget Docs";
const APP_DESCRIPTION = "Interactive docs and widget demo for Aomi";

function getAppUrl() {
  return typeof window !== "undefined" ? window.location.origin : "https://aomi.dev";
}

function LocalhostNetworkEnforcer({ children }: { children: ReactNode }) {
  const { isConnected, chainId, connector } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (!useLocalhost) return;
    if (!isConnected || chainId === LOCALHOST_CHAIN_ID) return;

    const switchToLocalhost = async () => {
      try {
        const provider = await connector?.getProvider();
        if (provider && typeof provider === "object" && "request" in provider) {
          const ethProvider = provider as {
            request: (args: {
              method: string;
              params: unknown[];
            }) => Promise<unknown>;
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
            // Ignore "already added" errors and continue with the switch.
          }
        }

        switchChain({ chainId: LOCALHOST_CHAIN_ID });
      } catch (error) {
        console.error("[LocalhostNetworkEnforcer] Failed to switch:", error);
      }
    };

    void switchToLocalhost();
  }, [chainId, connector, isConnected, switchChain]);

  return <>{children}</>;
}

declare global {
  interface Window {
    __AOMI_PARA_CLIENT__?: ParaWeb;
  }
}

type WalletProvidersProps = {
  children?: ReactNode;
};

export default function WalletProviders({ children }: WalletProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [paraClient, setParaClient] = useState<ParaWeb | null>(null);
  const [wagmiConfig, setWagmiConfig] = useState<ReturnType<
    typeof createParaWagmiConfig
  > | null>(null);
  const wallets = walletConnectProjectId
    ? externalWallets
    : externalWallets.filter((wallet) => wallet !== "WALLETCONNECT");
  const wagmiProjectId =
    walletConnectProjectId ?? "missing-walletconnect-project-id";

  useEffect(() => {
    setParaClient(new ParaWeb(paraEnvironment, paraApiKey));
  }, []);

  useEffect(() => {
    if (!paraClient) return;

    window.__AOMI_PARA_CLIENT__ = paraClient;
    setWagmiConfig(
      createParaWagmiConfig(paraClient, {
        appName: APP_NAME,
        appDescription: APP_DESCRIPTION,
        appUrl: getAppUrl(),
        wallets,
        projectId: wagmiProjectId,
        chains: networks,
        transports,
        ssr: true,
      }),
    );

    return () => {
      if (window.__AOMI_PARA_CLIENT__ === paraClient) {
        delete window.__AOMI_PARA_CLIENT__;
      }
    };
  }, [paraClient, wallets, wagmiProjectId]);

  return (
    <QueryClientProvider client={queryClient}>
      {wagmiConfig ? (
        <WagmiProvider config={wagmiConfig}>
          <LocalhostNetworkEnforcer>{children}</LocalhostNetworkEnforcer>
        </WagmiProvider>
      ) : (
        <>{children}</>
      )}
      {paraClient ? (
        <ParaProvider
          paraClientConfig={paraClient}
          config={{
            appName: APP_NAME,
          }}
          paraModalConfig={{
            disableEmailLogin: true,
            oAuthMethods,
          }}
          externalWalletConfig={{
            appDescription: APP_DESCRIPTION,
            appUrl: getAppUrl(),
            wallets,
            ...(walletConnectProjectId
              ? {
                  walletConnect: {
                    projectId: walletConnectProjectId,
                  },
                }
              : {}),
            evmConnector: {
              config: {
                chains: networks,
                transports,
                ssr: true,
              },
            },
          }}
        />
      ) : null}
    </QueryClientProvider>
  );
}

"use client";

import "@getpara/react-sdk/styles.css";
import { ParaProvider } from "@getpara/react-sdk";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
  LOCALHOST_CHAIN_ID,
  externalWallets,
  networks,
  oAuthMethods,
  paraApiKey,
  paraEnvironment,
  transports,
  useAnvilForWallet,
  walletConnectProjectId,
} from "./config";

function DevAnvilRpcHook({ children }: { children: ReactNode }) {
  const { isConnected, chainId, connector } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (!useAnvilForWallet) return;
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
        console.error("[DevAnvilRpcHook] Failed to switch:", error);
      }
    };

    void switchToLocalhost();
  }, [chainId, connector, isConnected, switchChain]);

  return <>{children}</>;
}

function ContextProvider({
  children,
  cookies: _cookies,
}: {
  children: ReactNode;
  cookies: string | null;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ParaProvider
        paraClientConfig={{
          apiKey: paraApiKey,
          env: paraEnvironment,
        }}
        config={{
          appName: "Aomi Widget Docs",
        }}
        paraModalConfig={{
          disableEmailLogin: true,
          oAuthMethods,
        }}
        externalWalletConfig={{
          appDescription: "Interactive docs and widget demo for Aomi",
          appUrl:
            typeof window !== "undefined"
              ? window.location.origin
              : "https://aomi.dev",
          wallets: externalWallets,
          walletConnect: {
            projectId: walletConnectProjectId,
          },
          evmConnector: {
            config: {
              chains: networks,
              transports,
              ssr: true,
            },
          },
        }}
      >
        <DevAnvilRpcHook>{children}</DevAnvilRpcHook>
      </ParaProvider>
    </QueryClientProvider>
  );
}

export default ContextProvider;

"use client";

import {
  Environment,
  type TOAuthMethod,
  type TExternalWallet,
} from "@getpara/react-sdk";
import { type ReactNode, useEffect } from "react";
import { useAccount, useSwitchChain } from "wagmi";
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
import { defineChain, type Chain } from "viem";
import {
  AomiWalletProvider,
  isFullTestnet,
  monad,
  monadTestnet,
} from "@aomi-labs/widget-lib";

// Enable localhost/Anvil network for E2E testing with `pnpm dev:localhost`
const useLocalhost = process.env.NEXT_PUBLIC_USE_LOCALHOST === "true";
const LOCALHOST_CHAIN_ID = 31337;

// Custom localhost network for Anvil (local testing)
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

const paraApiKey = process.env.NEXT_PUBLIC_PARA_API_KEY?.trim() ?? "";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_PROJECT_ID?.trim() ||
  "";

const paraEnvironment =
  (process.env.NEXT_PUBLIC_PARA_ENVIRONMENT as Environment | undefined) ??
  Environment.BETA;

const defaultNetworks = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
  monad,
  monadTestnet,
] as const;

export const networks = (
  useLocalhost ? [localhost, ...defaultNetworks] : [...defaultNetworks]
) as readonly [Chain, ...Chain[]];

const externalWallets: TExternalWallet[] = [
  "WALLETCONNECT",
  "METAMASK",
  "COINBASE",
  "RAINBOW",
  "RABBY",
];

const oAuthMethods: TOAuthMethod[] = ["GOOGLE"];

/**
 * Component that auto-switches to localhost network when in localhost mode.
 * Must be rendered inside ParaProvider.
 */
function LocalhostNetworkEnforcer({ children }: { children: ReactNode }) {
  const { isConnected, chainId, connector } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (isFullTestnet()) return;
    if (!useLocalhost) return;
    if (!isConnected || chainId === LOCALHOST_CHAIN_ID) return;

    const switchToLocalhost = async () => {
      console.log(
        `[LocalhostNetworkEnforcer] Switching from chain ${chainId} to localhost (${LOCALHOST_CHAIN_ID})`,
      );

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
          } catch (addError) {
            console.log(
              "[LocalhostNetworkEnforcer] Chain add result:",
              addError,
            );
          }
        }

        switchChain({ chainId: LOCALHOST_CHAIN_ID });
      } catch (error) {
        console.error(
          "[LocalhostNetworkEnforcer] Failed to switch network:",
          error,
        );
      }
    };

    void switchToLocalhost();
  }, [isConnected, chainId, connector, switchChain]);

  return <>{children}</>;
}

type Props = {
  children: ReactNode;
  cookies?: string | null;
};

export function WalletProviders({ children }: Props) {
  const content = paraApiKey ? (
    <LocalhostNetworkEnforcer>{children}</LocalhostNetworkEnforcer>
  ) : (
    children
  );

  return (
    <AomiWalletProvider
      provider="para"
      apiKey={paraApiKey}
      environment={paraEnvironment}
      appName="Aomi Labs"
      appDescription="AI-powered blockchain operations assistant"
      appUrl={
        typeof window !== "undefined"
          ? window.location.origin
          : "https://aomi.dev"
      }
      walletConnectProjectId={walletConnectProjectId}
      networks={networks}
      externalWallets={externalWallets}
      oAuthMethods={oAuthMethods}
    >
      {content}
    </AomiWalletProvider>
  );
}

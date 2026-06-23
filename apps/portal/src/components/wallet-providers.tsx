"use client";

import {
  Environment,
  type TOAuthMethod,
  type TExternalWallet,
} from "@getpara/react-sdk";
import { usePathname } from "next/navigation";
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
  ExtUserProvider,
  isFullTestnet,
  monad,
  monadTestnet,
} from "@aomi-labs/widget-lib";
import {
  E2EWalletProvider,
  type E2EWalletSeedClient,
} from "./e2e-wallet-provider";
import { AomiSessionProvider } from "./aomi-session-bridge";

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
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";

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
const solanaNetworks = [
  {
    id: "solana-devnet",
    label: "Solana Devnet",
    cluster: "solana:devnet",
    rpcHttpUrl:
      process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_URL ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
      "https://api.devnet.solana.com",
    rpcWsUrl:
      process.env.NEXT_PUBLIC_SOLANA_DEVNET_RPC_WS_URL ??
      process.env.NEXT_PUBLIC_SOLANA_RPC_WS_URL,
  },
  {
    id: "solana-mainnet",
    label: "Solana Mainnet",
    cluster: "solana:mainnet",
    rpcHttpUrl:
      process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ??
      "https://api.mainnet-beta.solana.com",
    rpcWsUrl: process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_WS_URL,
    isDefault: true,
  },
  {
    id: "solana-testnet",
    label: "Solana Testnet",
    cluster: "solana:testnet",
    rpcHttpUrl:
      process.env.NEXT_PUBLIC_SOLANA_TESTNET_RPC_URL ??
      "https://api.testnet.solana.com",
    rpcWsUrl: process.env.NEXT_PUBLIC_SOLANA_TESTNET_RPC_WS_URL,
  },
] as const;

// Stable reference for the Para `solana` prop. An inline object literal here is
// a new reference every render, which busts para's `resolvedSolanaConfig` memo
// (keyed on `solana`) and re-renders the whole Para subtree in a loop
// ("Maximum update depth exceeded"). Its contents are fully static, so hoist it
// to module scope like `networks` / `solanaNetworks` above.
const paraSolanaConfig = {
  networks: solanaNetworks,
  preferDirectSend: true,
};

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
  e2eWallet?: E2EWalletSeedClient | null;
};

export function WalletProviders({ children, e2eWallet }: Props) {
  const pathname = usePathname();
  if (pathname?.startsWith("/auth/privy")) {
    return <>{children}</>;
  }

  if (e2eWallet) {
    return (
      <E2EWalletProvider seed={e2eWallet} networks={networks}>
        {children}
      </E2EWalletProvider>
    );
  }

  const content = paraApiKey ? (
    <LocalhostNetworkEnforcer>{children}</LocalhostNetworkEnforcer>
  ) : (
    children
  );

  if (!paraApiKey && privyAppId) {
    return (
      <ExtUserProvider>
        <AomiWalletProvider
          provider="privy"
          appId={privyAppId}
          appName="Aomi Labs"
          walletConnectProjectId={walletConnectProjectId}
          networks={networks}
          loginMethods={["email", "sms", "wallet"]}
          solana={paraSolanaConfig}
        >
          <AomiSessionProvider>{children}</AomiSessionProvider>
        </AomiWalletProvider>
      </ExtUserProvider>
    );
  }

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
      solana={paraSolanaConfig}
    >
      <AomiSessionProvider>{content}</AomiSessionProvider>
    </AomiWalletProvider>
  );
}

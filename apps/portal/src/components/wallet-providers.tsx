"use client";

import "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/providers/privy";
import { type ReactNode } from "react";
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
import { type Chain } from "viem";
import {
  AomiWalletKitProvider,
  monad,
  monadTestnet,
} from "@aomi-labs/widget-lib";

const paraApiKey = process.env.NEXT_PUBLIC_PARA_API_KEY?.trim() ?? "";
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_PROJECT_ID?.trim() ||
  "";

const paraEnvironment =
  process.env.NEXT_PUBLIC_PARA_ENVIRONMENT === "PROD" ? "PROD" : "BETA";

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

export const networks = [...defaultNetworks] as readonly [Chain, ...Chain[]];

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

type Props = {
  children: ReactNode;
  cookies?: string | null;
};

export function WalletProviders({ children }: Props) {
  const evmWallets =
    typeof window !== "undefined" && walletConnectProjectId
      ? (["metamask", "rabby", "coinbase", "walletconnect"] as const)
      : (["metamask", "rabby", "coinbase"] as const);
  const auth =
    privyAppId.length > 0
      ? ({
          provider: "privy",
          methods: ["email", "wallet"],
        } as const)
      : paraApiKey.length > 0
        ? ({
            provider: "para",
            methods: ["google"],
          } as const)
        : false;

  return (
    <AomiWalletKitProvider
      auth={auth}
      account={{ mode: "aomi-backend", signInPolicy: "provider-token-allowed" }}
      providers={{
        privy: privyAppId
          ? {
              appId: privyAppId,
              appName: "Aomi Labs",
            }
          : false,
        para: paraApiKey
          ? {
              apiKey: paraApiKey,
              environment: paraEnvironment,
              appName: "Aomi Labs",
              appDescription: "AI-powered blockchain operations assistant",
              appUrl:
                typeof window !== "undefined"
                  ? window.location.origin
                  : "https://aomi.dev",
            }
          : false,
      }}
      wallets={{
        evm: {
          chains: networks,
          appName: "Aomi Labs",
          wallets: evmWallets,
          walletConnectProjectId,
        },
        solana: {
          networks: solanaNetworks,
          preferDirectSend: true,
        },
      }}
    >
      {children}
    </AomiWalletKitProvider>
  );
}

"use client";

import "@aomi-labs/widget-lib/providers/para";
import "@aomi-labs/widget-lib/providers/privy";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  mainnet,
  arbitrum,
  optimism,
  base,
  baseSepolia,
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
  robinhood,
} from "@aomi-labs/widget-lib";
import {
  E2EWalletProvider,
  type E2EWalletSeedClient,
} from "@portal/components/providers/e2e-wallet-provider";
// Must come from the wallet kit, not a Portal-local copy: the ceremony reads
// the Privy context that `AomiWalletKitProvider` mounts, and Portal resolves a
// different `@privy-io/react-auth` install than the kit does.
import { PrivyDelegationProvider } from "@aomi-labs/widget-lib/providers/privy";

const paraApiKey = process.env.NEXT_PUBLIC_PARA_API_KEY?.trim() ?? "";
const paraEnvironment =
  process.env.NEXT_PUBLIC_PARA_ENVIRONMENT === "PROD" ? "PROD" : "BETA";
const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() ?? "";

const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() ||
  process.env.NEXT_PUBLIC_PROJECT_ID?.trim() ||
  "";

const defaultNetworks = [
  mainnet,
  arbitrum,
  optimism,
  base,
  baseSepolia,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
  monad,
  monadTestnet,
  robinhood,
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
    label: "Solana",
    cluster: "solana:mainnet",
    rpcHttpUrl:
      process.env.NEXT_PUBLIC_SOLANA_MAINNET_RPC_URL ??
      // The official public endpoint rejects localhost browser origins with
      // HTTP 403. Keep the zero-config portal fallback browser-compatible so
      // wallet approval can refresh and broadcast the signed transaction.
      "https://solana-rpc.publicnode.com",
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
  e2eWallet?: E2EWalletSeedClient | null;
};

type BrowserAuthOrigin = {
  authDomain: string;
  authUri: string;
};

function getBrowserAuthOrigin(): BrowserAuthOrigin | null {
  if (typeof window === "undefined") return null;
  return {
    authDomain: window.location.host,
    authUri: window.location.origin,
  };
}

export function WalletProviders({ children, e2eWallet }: Props) {
  const [browserAuthOrigin, setBrowserAuthOrigin] =
    useState<BrowserAuthOrigin | null>(() => getBrowserAuthOrigin());
  useEffect(() => {
    setBrowserAuthOrigin(getBrowserAuthOrigin());
  }, []);
  const account = useMemo(
    () => ({
      mode: "aomi-backend" as const,
      ...(browserAuthOrigin ?? {}),
    }),
    [browserAuthOrigin],
  );
  const evmWallets =
    typeof window !== "undefined" && walletConnectProjectId
      ? (["metamask", "rabby", "coinbase", "walletconnect"] as const)
      : (["metamask", "rabby", "coinbase"] as const);
  // Privy is the primary embedded-wallet provider when configured. Its
  // browser SDK attaches Aomi's quorum signer during delegation setup.
  const auth = privyAppId
    ? ({
        provider: "privy",
        methods: ["email", "google"],
      } as const)
    : paraApiKey.length > 0
      ? ({
          provider: "para",
          methods: ["email", "google"],
        } as const)
      : false;

  if (e2eWallet) {
    return (
      <E2EWalletProvider
        seed={e2eWallet}
        networks={networks}
        solanaNetworks={solanaNetworks}
      >
        {children}
      </E2EWalletProvider>
    );
  }

  return (
    <AomiWalletKitProvider
      auth={auth}
      account={account}
      providers={{
        para: paraApiKey
          ? {
              appName: "Aomi Labs",
              appDescription: "Aomi portal testing",
              apiKey: paraApiKey,
              environment: paraEnvironment,
            }
          : false,
        privy: privyAppId
          ? {
              appId: privyAppId,
              appName: "Aomi Labs",
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
      {privyAppId ? (
        <PrivyDelegationProvider>{children}</PrivyDelegationProvider>
      ) : (
        children
      )}
    </AomiWalletKitProvider>
  );
}

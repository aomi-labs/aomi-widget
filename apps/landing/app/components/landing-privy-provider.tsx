"use client";

import type { ReactNode } from "react";
import type { Chain } from "viem";
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
import { AomiWalletProvider } from "../../../registry/src";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_PROJECT_ID;

const networks = [
  mainnet,
  arbitrum,
  optimism,
  base,
  polygon,
  sepolia,
  linea,
  lineaSepolia,
] as const satisfies readonly [Chain, ...Chain[]];

export function LandingPrivyProvider({ children }: { children: ReactNode }) {
  return (
    <AomiWalletProvider
      provider="privy"
      appId={privyAppId}
      appName="Aomi Labs"
      networks={networks}
      loginMethods={["email", "google", "wallet"]}
      walletConnectProjectId={walletConnectProjectId}
      solana={{
        cluster: "solana:devnet",
        rpcHttpUrl:
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
          "https://api.devnet.solana.com",
        preferDirectSend: true,
      }}
    >
      {children}
    </AomiWalletProvider>
  );
}

"use client";

import { type Config } from "@coinbase/cdp-core";
import { useEvmAddress, useIsSignedIn, useSignOut, useX402 } from "@coinbase/cdp-hooks";
import { CDPReactProvider } from "@coinbase/cdp-react";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type CoinbaseDedicatedWalletContextValue = {
  isConfigured: boolean;
  isSignedIn: boolean;
  evmAddress?: string;
  fetchWithPayment: FetchLike | null;
  signOut: (() => Promise<void>) | null;
};

const CoinbaseDedicatedWalletContext =
  createContext<CoinbaseDedicatedWalletContextValue>({
    isConfigured: false,
    isSignedIn: false,
    evmAddress: undefined,
    fetchWithPayment: null,
    signOut: null,
  });

type CoinbaseDedicatedWalletProviderProps = {
  children: ReactNode;
};

function CoinbaseDedicatedWalletBridge({
  children,
}: {
  children: ReactNode;
}) {
  const { isSignedIn } = useIsSignedIn();
  const { evmAddress } = useEvmAddress();
  const { fetchWithPayment } = useX402();
  const { signOut } = useSignOut();

  const value = useMemo<CoinbaseDedicatedWalletContextValue>(
    () => ({
      isConfigured: true,
      isSignedIn,
      evmAddress: evmAddress ?? undefined,
      fetchWithPayment: fetchWithPayment as FetchLike,
      signOut,
    }),
    [evmAddress, fetchWithPayment, isSignedIn, signOut],
  );

  return (
    <CoinbaseDedicatedWalletContext.Provider value={value}>
      {children}
    </CoinbaseDedicatedWalletContext.Provider>
  );
}

export function CoinbaseDedicatedWalletProvider({
  children,
}: CoinbaseDedicatedWalletProviderProps) {
  const projectId = process.env.NEXT_PUBLIC_CDP_PROJECT_ID?.trim();

  const unconfiguredValue = useMemo<CoinbaseDedicatedWalletContextValue>(
    () => ({
      isConfigured: false,
      isSignedIn: false,
      evmAddress: undefined,
      fetchWithPayment: null,
      signOut: null,
    }),
    [],
  );

  if (!projectId) {
    return (
      <CoinbaseDedicatedWalletContext.Provider value={unconfiguredValue}>
        {children}
      </CoinbaseDedicatedWalletContext.Provider>
    );
  }

  const config: Config = {
    projectId,
    ethereum: {
      createOnLogin: "eoa",
    },
  };

  return (
    <CDPReactProvider config={config}>
      <CoinbaseDedicatedWalletBridge>{children}</CoinbaseDedicatedWalletBridge>
    </CDPReactProvider>
  );
}

export function useCoinbaseDedicatedWallet() {
  return useContext(CoinbaseDedicatedWalletContext);
}

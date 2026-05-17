"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useUser } from "@aomi-labs/react";
import { AOMI_AUTH_DISCONNECTED_IDENTITY } from "./identity";
import type { AomiAuthAdapter } from "./types";

const DISCONNECTED_ADAPTER: AomiAuthAdapter = {
  identity: AOMI_AUTH_DISCONNECTED_IDENTITY,
  isReady: true,
  isSwitchingChain: false,
  canConnect: false,
  canOpenAccountUI: false,
  canDisconnect: false,
  connect: async () => undefined,
};

const AomiAuthAdapterContext =
  createContext<AomiAuthAdapter>(DISCONNECTED_ADAPTER);

function AomiAuthAdapterSync({
  adapter,
}: {
  adapter: AomiAuthAdapter;
}) {
  const { setUser } = useUser();
  const identity = adapter.identity;

  useEffect(() => {
    // NOTE: aaMode / SmartAccount4337 / Delegation7702 are NOT forwarded
    // here. They are session-owned: `session.ts` writes them on tx-complete
    // and providers read them back via `useUser()`. Forwarding them from
    // identity would create a write loop (UserState -> identity -> setUser
    // -> UserState). walletKind is provider-static and forwarded normally.
    setUser({
      address: identity.address ?? undefined,
      walletKind: identity.walletKind ?? undefined,
      chainId: identity.chainId ?? undefined,
      isConnected: identity.isConnected,
      svmAddress: identity.svmAddress ?? undefined,
      walletProvider: identity.isConnected
        ? (identity.walletProvider ?? null)
        : null,
      authMethod: identity.isConnected
        ? (identity.authMethod ?? null)
        : null,
      sponsored: identity.isConnected ? (identity.sponsored ?? null) : null,
      sponsorProvider: identity.isConnected
        ? (identity.sponsorProvider ?? null)
        : null,
      sponsorAccount: identity.isConnected
        ? (identity.sponsorAccount ?? null)
        : null,
    });
  }, [
    identity.address,
    identity.authMethod,
    identity.chainId,
    identity.isConnected,
    identity.walletKind,
    identity.sponsorAccount,
    identity.sponsorProvider,
    identity.sponsored,
    identity.svmAddress,
    identity.walletProvider,
    setUser,
  ]);

  return null;
}

export function AomiAuthAdapterProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AomiAuthAdapter;
}) {
  return (
    <AomiAuthAdapterContext.Provider value={value}>
      <AomiAuthAdapterSync adapter={value} />
      {children}
    </AomiAuthAdapterContext.Provider>
  );
}

export function useAomiAuthAdapter(): AomiAuthAdapter {
  return useContext(AomiAuthAdapterContext);
}

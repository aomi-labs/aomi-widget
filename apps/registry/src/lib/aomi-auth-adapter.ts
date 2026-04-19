"use client";

import {
  createContext,
  createElement,
  useContext,
  type ReactNode,
} from "react";
import type {
  WalletEip712Payload,
  WalletTxPayload,
} from "@aomi-labs/react";
import type { AomiAuthIdentity } from "./auth-identity";

// =============================================================================
// WalletAdapter type
// =============================================================================

export type AomiAuthAdapter = {
  identity: AomiAuthIdentity;
  isReady: boolean;
  isSwitchingChain: boolean;
  canConnect: boolean;
  canManageAccount: boolean;
  connect: () => Promise<void>;
  manageAccount: () => Promise<void>;
  switchChain?: (chainId: number) => Promise<void>;
  sendTransaction?: (
    payload: WalletTxPayload,
  ) => Promise<{ txHash: string; amount?: string }>;
  signTypedData?: (
    payload: WalletEip712Payload,
  ) => Promise<{ signature: string }>;
};


// =============================================================================
// Disconnected default
// =============================================================================

export const AOMI_AUTH_DISCONNECTED_ADAPTER: AomiAuthAdapter = {
  identity: {
    status: "disconnected",
    isConnected: false,
    address: undefined,
    chainId: undefined,
    authProvider: undefined,
    primaryLabel: "Not connected",
    secondaryLabel: undefined,
  },
  isReady: false,
  isSwitchingChain: false,
  canConnect: false,
  canManageAccount: false,
  connect: async () => undefined,
  manageAccount: async () => undefined,
};

// =============================================================================
// Context
// =============================================================================

export const AomiAuthAdapterContext =
  createContext<AomiAuthAdapter | undefined>(undefined);

export function AomiAuthAdapterProvider({
  children,
  value,
}: {
  children: ReactNode;
  value?: AomiAuthAdapter;
}) {
  const inheritedAdapter = useContext(AomiAuthAdapterContext);

  return createElement(
    AomiAuthAdapterContext.Provider,
    { value: value ?? inheritedAdapter },
    children,
  );
}

// =============================================================================
// Hook
// =============================================================================

export function useAomiAuthAdapter(): AomiAuthAdapter {
  const contextAdapter = useContext(AomiAuthAdapterContext);

  return contextAdapter ?? AOMI_AUTH_DISCONNECTED_ADAPTER;
}

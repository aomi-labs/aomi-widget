"use client";

import { createContext, useContext } from "react";
import type {
  WalletEip712Payload,
  WalletTxPayload,
} from "@aomi-labs/react";
import type { AccountIdentity } from "./use-account-identity";

// =============================================================================
// WalletAdapter type
// =============================================================================

export type WalletAdapter = {
  identity: AccountIdentity;
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

/** @deprecated Use `WalletAdapter` instead. */
export type AomiAdapter = WalletAdapter;

// =============================================================================
// Disconnected default
// =============================================================================

export const DISCONNECTED_ADAPTER: WalletAdapter = {
  identity: {
    kind: "disconnected",
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

export const WalletAdapterContext =
  createContext<WalletAdapter>(DISCONNECTED_ADAPTER);

/** @deprecated Use `WalletAdapterContext` instead. */
export const AomiAdapterContext = WalletAdapterContext;

// =============================================================================
// Hook
// =============================================================================

export function useWalletAdapter(): WalletAdapter {
  return useContext(WalletAdapterContext);
}

/** @deprecated Use `useWalletAdapter()` instead. */
export const useAomiAdapter = useWalletAdapter;

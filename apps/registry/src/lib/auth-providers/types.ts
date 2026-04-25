"use client";

import type {
  WalletEip712Payload,
  WalletTxPayload,
} from "@aomi-labs/react";

export type { WalletEip712Payload, WalletTxPayload };

export type AomiAuthStatus = "booting" | "disconnected" | "connected";

export type AomiAuthIdentity = {
  status: AomiAuthStatus;
  isConnected: boolean;
  address?: string;
  chainId?: number;
  authProvider?: string;
  primaryLabel: string;
  secondaryLabel?: string;
};

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

export const AOMI_AUTH_DISCONNECTED_IDENTITY: AomiAuthIdentity = {
  status: "disconnected",
  isConnected: false,
  address: undefined,
  chainId: undefined,
  authProvider: undefined,
  primaryLabel: "Not connected",
  secondaryLabel: undefined,
};

export const AOMI_AUTH_BOOTING_IDENTITY: AomiAuthIdentity = {
  status: "booting",
  isConnected: false,
  address: undefined,
  chainId: undefined,
  authProvider: undefined,
  primaryLabel: "Loading Wallet...",
  secondaryLabel: undefined,
};

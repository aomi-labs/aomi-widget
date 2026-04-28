"use client";

import type { Chain } from "viem";
import type { WalletEip712Payload, WalletTxPayload } from "@aomi-labs/react";

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

export type AomiTxResult = {
  txHash: string;
  amount?: string;
  aaRequestedMode?: "4337" | "7702" | "none";
  aaResolvedMode?: "4337" | "7702" | "none";
  aaFallbackReason?: string;
  executionKind?: string;
  batched?: boolean;
  callCount?: number;
  sponsored?: boolean;
  smartAccountAddress?: string;
  delegationAddress?: string;
};

export type AomiAuthAdapter = {
  identity: AomiAuthIdentity;
  isReady: boolean;
  isSwitchingChain: boolean;

  canConnect: boolean;
  canManageAccount: boolean;

  supportedChains?: readonly Chain[];

  connect: () => Promise<void>;
  manageAccount: () => Promise<void>;
  disconnect?: () => Promise<void>;

  switchChain?: (chainId: number) => Promise<void>;

  sendTransaction?: (payload: WalletTxPayload) => Promise<AomiTxResult>;
  signTypedData?: (
    payload: WalletEip712Payload,
  ) => Promise<{ signature: string }>;
};

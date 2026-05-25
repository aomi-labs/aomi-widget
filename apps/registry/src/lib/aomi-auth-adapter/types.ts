"use client";

import type { Chain } from "viem";
import type {
  WalletEip712Payload,
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
  WalletTxPayload,
} from "@aomi-labs/react";

export type AomiAuthStatus = "booting" | "disconnected" | "connected";
export type WalletFamily = "evm" | "solana";
export type SolanaCluster =
  | "solana:mainnet"
  | "solana:devnet"
  | "solana:testnet";

export type SolanaNetworkOption = {
  id: string;
  label: string;
  cluster: SolanaCluster;
  rpcHttpUrl: string;
  rpcWsUrl?: string;
  isDefault?: boolean;
};

export type SolanaNetworkConfigInput = {
  networks?: readonly SolanaNetworkOption[];
  cluster?: SolanaCluster;
  rpcHttpUrl?: string;
  rpcWsUrl?: string;
};

export type AomiNetworkTarget =
  | { family: "evm"; chainId: number }
  | { family: "solana"; networkId: string };

export type AomiAuthIdentity = {
  status: AomiAuthStatus;
  isConnected: boolean;
  /** Connected EVM wallet address (0x...). */
  address?: string;
  chainId?: number;
  /**
   * Connected SVM (Solana) wallet pubkey, base58. Independent of
   * `address` — a Para-backed session can carry both an EVM and a
   * Solana wallet under one identity.
   */
  svmAddress?: string;
  authProvider?: string;
  primaryLabel: string;
  secondaryLabel?: string;
  /**
   * Set when the connected wallet itself IS a smart account (always-AA),
   * e.g. Base Account / Coinbase Smart Wallet. Leave undefined for EOA
   * wallets that may opt into AA per-transaction (Para's 7702/4337 flows).
   */
  aaMode?: "4337" | "7702";
  smartAccount?: string;
  solanaCluster?: SolanaCluster;
  solanaWalletName?: string;
  solanaTransport?: "extension" | "embedded" | "mwa";
  solanaCapabilities?: {
    canSignMessage?: boolean;
    canSignTransaction?: boolean;
    canSignAllTransactions?: boolean;
    canSendTransaction?: boolean;
    canSignAndSendTransaction?: boolean;
  };
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
  canOpenAccountUI: boolean;
  canDisconnect: boolean;

  supportedChains?: readonly Chain[];
  supportedNetworks?: {
    evm: readonly Chain[];
    solana: readonly SolanaNetworkOption[];
  };
  activeFamily?: WalletFamily;
  activeNetwork?: AomiNetworkTarget;
  solanaNetworkSwitchRequiresReconnect?: boolean;

  connect: (options?: { family?: WalletFamily }) => Promise<void>;
  openAccountUI?: (options?: { family?: WalletFamily }) => Promise<void>;
  /**
   * Disconnect from the wallet. By default disconnects the active family;
   * pass `{ family }` to disconnect a specific family while leaving the
   * other connected (e.g. drop just Solana while keeping the EVM Para
   * session, or vice versa). `{ family: "all" }` clears both.
   *
   * Adapters that can't selectively disconnect should still implement
   * this and disconnect everything regardless of `family`; the
   * `WalletFamilySlot` UI only relies on a best-effort behavior here.
   */
  disconnect?: (options?: {
    family?: WalletFamily | "all";
  }) => Promise<void>;

  switchChain?: (chainId: number) => Promise<void>;
  selectNetwork?: (target: AomiNetworkTarget) => Promise<void>;

  sendTransaction?: (payload: WalletTxPayload) => Promise<AomiTxResult>;
  signTypedData?: (
    payload: WalletEip712Payload,
  ) => Promise<{ signature: string }>;
  /**
   * Sign a Solana transaction with the user's wallet. Singular and
   * sign-only — apps submit the returned signed tx through their own
   * RPC. The host doesn't decode or broadcast Solana txs.
   *
   * `payload.unsignedTx` is base64 of `VersionedTransaction.serialize()`
   * (legacy `Transaction` is also acceptable). Implementations should
   * try the versioned-tx path first and fall back to legacy on
   * deserialization failure, mirroring what wallet adapters do.
   *
   * Optional like `signTypedData` — adapters that don't support Solana
   * (e.g. base-account) leave it undefined; `RuntimeTxHandler` rejects
   * the request with a "Solana wallet provider is not ready" error in
   * that case.
   */
  signSolanaTransaction?: (
    payload: WalletSolanaSignPayload,
  ) => Promise<{ signedTx: string }>;
  signSolanaMessage?: (
    payload: WalletSolanaSignMessagePayload,
  ) => Promise<{ signature: string }>;
  sendSolanaTransaction?: (
    payload: WalletSolanaSignPayload,
  ) => Promise<{ signature: string; signedTx?: string }>;
  signAndSendSolanaTransaction?: (
    payload: WalletSolanaSignPayload,
  ) => Promise<{ signature: string; signedTx?: string }>;
  solanaRpcHttpUrl?: string;
  solanaRpcWsUrl?: string;
};

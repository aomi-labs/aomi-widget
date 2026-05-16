"use client";

import type { Chain } from "viem";
import type {
  WalletEip712Payload,
  WalletSolanaSignPayload,
  WalletTxPayload,
} from "@aomi-labs/react";

export type AomiAuthStatus = "booting" | "disconnected" | "connected";
export type AomiWalletKind = "eoa" | "smart-account";
export type AomiAAMode = "none" | "4337" | "7702";
export type AomiSponsorProvider = "alchemy" | "coinbase" | "pimlico" | "self";
export type AomiWalletProvider = "para" | "baseAccount";
export type AomiAuthMethod =
  | "google"
  | "apple"
  | "facebook"
  | "x"
  | "discord"
  | "github"
  | "farcaster"
  | "telegram"
  | "email"
  | "phone"
  | "wagmi";

export type AomiAuthIdentity = {
  status: AomiAuthStatus;
  isConnected: boolean;
  /**
   * Connected EVM account address (0x...). When `walletKind === "smart-account"`
   * this is the smart account address; when `walletKind === "eoa"` it is the EOA.
   */
  address?: string;
  /** Whether the connected account is an EOA or an always-AA smart account. */
  walletKind?: AomiWalletKind;
  /** Default/current AA mode for the connected wallet context. */
  aaMode?: AomiAAMode;
  /** 4337 smart account address, populated after a 4337 tx resolves. */
  SmartAccount4337?: string;
  /** 7702 delegation contract address, populated after a 7702 tx resolves. */
  Delegation7702?: string;
  /** Whether gas is sponsored by a host-configured paymaster. */
  sponsored?: boolean;
  /** Which paymaster service is sponsoring, when `sponsored` is true. */
  sponsorProvider?: AomiSponsorProvider;
  /**
   * Public, safe-to-expose identifier of the sponsor account on the paymaster
   * platform (e.g. Alchemy gas policy id). Left undefined when the platform's
   * binding is secret (API key, paymaster URL with embedded credential).
   */
  sponsorAccount?: string;
  chainId?: number;
  /**
   * Connected SVM (Solana) wallet pubkey, base58. Independent of
   * `address` — a Para-backed session can carry both an EVM and a
   * Solana wallet under one identity.
   */
  svmAddress?: string;
  /** Wallet platform backing this session. */
  walletProvider?: AomiWalletProvider;
  /** Auth method used within the wallet platform (Para OAuth, etc). */
  authMethod?: AomiAuthMethod;
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
  SmartAccount4337?: string;
  Delegation7702?: string;
};

export type AomiAuthAdapter = {
  identity: AomiAuthIdentity;
  isReady: boolean;
  isSwitchingChain: boolean;

  canConnect: boolean;
  canOpenAccountUI: boolean;
  canDisconnect: boolean;

  supportedChains?: readonly Chain[];

  connect: () => Promise<void>;
  openAccountUI?: () => Promise<void>;
  disconnect?: () => Promise<void>;

  switchChain?: (chainId: number) => Promise<void>;

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
};

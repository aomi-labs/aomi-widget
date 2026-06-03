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
export type WireWalletFamily = "evm" | "svm";
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
export type AomiWalletKind = "eoa" | "smart-account";
export type AomiAAMode = "none" | "4337" | "7702";
export type AomiSponsorProvider = "alchemy" | "coinbase" | "pimlico" | "self";
export type AomiWalletProvider = "para" | "privy" | "baseAccount";
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
  /** Stable subject inside the wallet provider, when exposed. */
  walletProviderSubject?: string;
  /** Auth method used within the wallet platform (Para OAuth, etc). */
  authMethod?: AomiAuthMethod;
  /** Legacy alias retained while the control-bar migrates to `authMethod`. */
  authProvider?: AomiAuthMethod;
  /** Verified auth value from the wallet platform, such as email or phone. */
  authValue?: string;
  /** Provider verification timestamp for `authValue`, unix seconds. */
  authVerifiedAt?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
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

/**
 * One installable Solana wallet surface (e.g. Phantom, Solflare). Surfaced
 * by adapters so the UI can render an inline picker instead of guessing
 * the user's preferred wallet. `installed` is true when the wallet is
 * actually detected in the browser; `ready` is true when it can be
 * activated (either Installed or auto-loadable like in-browser providers).
 */
export type SolanaWalletDescriptor = {
  name: string;
  ready: boolean;
  installed: boolean;
  iconUrl?: string;
};

/**
 * One wallet account known to the adapter, tagged by family. The registry
 * may hold several per family (e.g. MetaMask + Para-embedded EVM), but only
 * one per family is `active` (the live account reported to the backend).
 */
export type AomiAccount = {
  /** Stable id: wagmi connector uid (EVM) or solana wallet name (Solana). */
  id: string;
  family: WalletFamily;
  address: string;
  /** Short display label, e.g. formatted address. */
  label?: string;
  /** Human wallet name, e.g. "MetaMask", "Phantom", "Para". */
  walletName?: string;
  /** True when this is the live account for its family. */
  active: boolean;
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
  supportedNetworks?: {
    evm: readonly Chain[];
    solana: readonly SolanaNetworkOption[];
  };
  solanaNetworkSwitchRequiresReconnect?: boolean;

  /** All wallet accounts known to the adapter, tagged by family. */
  accounts: readonly AomiAccount[];
  /** Make `accounts[id]` the active account for its family. */
  selectAccount: (id: string) => Promise<void>;

  /**
   * Installed/loadable Solana wallets the adapter can attach to. Empty
   * (or undefined) when the adapter doesn't support Solana or has no
   * detected wallets. UIs use this to render an inline picker so users
   * pick their wallet explicitly rather than relying on auto-detection.
   */
  solanaWallets?: readonly SolanaWalletDescriptor[];
  /**
   * Attach a specific Solana wallet by name (matches
   * `solanaWallets[].name`). The promise resolves once the wallet adapter
   * reports connected (or rejects if the wallet popup is cancelled).
   */
  connectSolanaWallet?: (name: string) => Promise<void>;

  connect: (options?: { family?: WalletFamily }) => Promise<void>;
  openAccountUI?: (options?: { family?: WalletFamily }) => Promise<void>;
  /**
   * Disconnect from the wallet. By default disconnects everything;
   * pass `{ family }` to disconnect a specific family while leaving the
   * other connected (e.g. drop just Solana while keeping the EVM Para
   * session, or vice versa). `{ family: "all" }` clears both.
   *
   * Adapters that can't selectively disconnect should still implement
   * this and disconnect everything regardless of `family`; the picker's
   * per-family sections only rely on a best-effort behavior here.
   */
  disconnect?: (options?: {
    family?: WalletFamily | "all";
    /** Disconnect a single account by `AomiAccount.id` (EVM only). */
    accountId?: string;
  }) => Promise<void>;

  switchChain?: (chainId: number) => Promise<void>;
  selectNetwork?: (target: AomiNetworkTarget) => Promise<void>;

  sendTransaction?: (payload: WalletTxPayload) => Promise<AomiTxResult>;
  signTypedData?: (
    payload: WalletEip712Payload,
  ) => Promise<{ signature: string }>;
  signMessage?: (
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

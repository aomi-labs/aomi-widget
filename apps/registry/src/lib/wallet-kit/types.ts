"use client";

import type { Chain } from "viem";
import type {
  WalletEip712Payload,
  WalletSolanaSignMessagePayload,
  WalletSolanaSignPayload,
  WalletTxPayload,
} from "@aomi-labs/react";
import type { WalletModalRow } from "./composer/merge-wallet-rows";

export type AomiSessionStatus = "booting" | "disconnected" | "connected";
export type WalletFamily = "evm" | "svm";
export type PublicWalletFamily = WalletFamily | "solana";
export type SvmCluster = "solana:mainnet" | "solana:devnet" | "solana:testnet";

export type SvmNetworkOption = {
  id: string;
  label: string;
  cluster: SvmCluster;
  rpcHttpUrl: string;
  rpcWsUrl?: string;
  isDefault?: boolean;
};

export type SvmNetworkConfigInput = {
  networks?: readonly SvmNetworkOption[];
  cluster?: SvmCluster;
  rpcHttpUrl?: string;
  rpcWsUrl?: string;
};

export type SvmWalletCapabilities = {
  canSignMessage?: boolean;
  canSignTransaction?: boolean;
  canSignAllTransactions?: boolean;
  canSendTransaction?: boolean;
  canSignAndSendTransaction?: boolean;
};

export type AomiNetworkTarget =
  | { family: "evm"; chainId: number }
  | { family: "svm" | "solana"; networkId: string };
export type AomiWalletKind = "eoa" | "smart-account";
export type AomiAAMode = "none" | "4337" | "7702";
export type AomiSponsorProvider = "alchemy" | "coinbase" | "pimlico" | "self";
export type SessionProvider = "para" | "privy" | "custom" | (string & {});
export type EmbeddedProvider = "para" | "privy" | "aomi" | (string & {});
export type AuthProviderId = SessionProvider | "none" | "baseAccount";
export type WalletSource =
  | "injected"
  | "walletconnect"
  | "coinbase"
  | "baseAccount"
  | "embedded"
  | "stored";

export type AomiWalletProvider = "para" | "privy" | "baseAccount" | (string & {});
export type AomiLoginMethod =
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
  | "wagmi"
  | "passkey"
  | "wallet";

export type AomiSessionIdentity = {
  status: AomiSessionStatus;
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
  /**
   * Provider that authenticated the current session. This intentionally does
   * not reuse `authProvider`, which is a deprecated auth-method alias.
   */
  sessionProvider?: SessionProvider;
  /** Provider backing the active embedded wallet, when one is in use. */
  embeddedProvider?: EmbeddedProvider;
  /** How the active wallet signs or connects. */
  walletSource?: WalletSource;
  /** Wallet platform backing this session.
   * @deprecated use sessionProvider/embeddedProvider; kept for /api/state
   * compatibility until the backend payload migrates.
   */
  walletProvider?: AomiWalletProvider;
  /** Stable subject inside the wallet provider, when exposed. */
  walletProviderSubject?: string;
  /** Auth method used within the wallet platform (Para OAuth, etc). */
  authMethod?: AomiLoginMethod;
  /** Legacy alias retained while the control-bar migrates to `authMethod`. */
  authProvider?: AomiLoginMethod;
  /** Verified auth value from the wallet platform, such as email or phone. */
  authValue?: string;
  /** Provider verification timestamp for `authValue`, unix seconds. */
  authVerifiedAt?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  svmCluster?: SvmCluster;
  svmWalletName?: string;
  svmTransport?: "extension" | "embedded" | "mwa";
  svmCapabilities?: SvmWalletCapabilities;
  /** @deprecated use svmCluster. */
  solanaCluster?: SvmCluster;
  /** @deprecated use svmWalletName. */
  solanaWalletName?: string;
  /** @deprecated use svmTransport. */
  solanaTransport?: "extension" | "embedded" | "mwa";
  /** @deprecated use svmCapabilities. */
  solanaCapabilities?: SvmWalletCapabilities;
};

/**
 * One installable Solana wallet surface (e.g. Phantom, Solflare). Surfaced
 * by adapters so the UI can render an inline picker instead of guessing
 * the user's preferred wallet. `installed` is true when the wallet is
 * actually detected in the browser; `ready` is true when it can be
 * activated (either Installed or auto-loadable like in-browser providers).
 */
export type SvmWalletDescriptor = {
  name: string;
  ready: boolean;
  installed: boolean;
  iconUrl?: string;
};

export type AomiWalletOptionStatus =
  | "installed"
  | "available"
  | "qr"
  | "unavailable";
export type AomiWalletOptionFamily = WalletFamily | "multichain";
export type AomiWalletOptionKind =
  | "evm"
  | "solana"
  | "walletconnect"
  | "social";

/**
 * One connectable wallet or sign-in surface the adapter can activate.
 * UIs render these as normal wallet rows while the adapter remains free
 * to route the click through Para, Privy, wagmi, wallet-adapter, etc.
 */
export type AomiWalletOption = {
  id: string;
  connectorId?: string;
  label: string;
  family: AomiWalletOptionFamily;
  kind: AomiWalletOptionKind;
  status: AomiWalletOptionStatus;
  installed?: boolean;
  ready?: boolean;
  iconUrl?: string;
  description?: string;
};

/**
 * One wallet account known to the adapter, tagged by family. The registry
 * may hold several per family (e.g. MetaMask + Para-embedded EVM), but only
 * one per family is `active` (the live account reported to the backend).
 */
export type AomiAccount = {
  /**
   * Stable id: wagmi connector uid (EVM) or solana wallet name (Solana). When
   * one address is exposed by several connectors (e.g. Rabby impersonating
   * MetaMask via EIP-6963), this is the active/preferred connector's uid.
   */
  id: string;
  family: WalletFamily;
  address: string;
  /** Short display label, e.g. formatted address. */
  label?: string;
  /** Human wallet name, e.g. "MetaMask", "Phantom", "Para". */
  walletName?: string;
  /** EVM chain id of this connection, for per-row network labels. */
  chainId?: number;
  /** All wagmi connector uids exposing this address (EVM, dedup metadata). */
  connectorIds?: string[];
  /** True when this is the live account for its family. */
  active: boolean;
  /**
   * True when this account exposes an in-app management surface (e.g. the Para
   * account modal). UIs render a "manage" affordance for it; external wallets
   * managed only in their own extension (MetaMask, Phantom) leave it unset.
   * The handler is the adapter's `openAccountUI({ family })`.
   */
  manageable?: boolean;
  linked?: boolean;
  linkedVia?: "para" | "privy" | "challenge" | "import" | "observed" | (string & {});
  capability?: "read" | "write";
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

export type AomiAccountCredential =
  | {
      provider: "para" | "privy";
      providerToken: string;
    }
  | { kind: "token"; provider: "para" | "privy" | "custom"; token: string }
  | { kind: "cookie" };

export type AomiWalletKit = {
  identity: AomiSessionIdentity;
  isReady: boolean;
  isSwitchingChain: boolean;

  canConnect: boolean;
  canOpenAccountUI: boolean;
  canDisconnect: boolean;

  supportedChains?: readonly Chain[];
  supportedNetworks?: {
    evm: readonly Chain[];
    solana: readonly SvmNetworkOption[];
  };
  solanaNetworkSwitchRequiresReconnect?: boolean;

  /** All wallet accounts known to the adapter, tagged by family. */
  accounts: readonly AomiAccount[];
  /** Unified picker rows: live accounts, stored account-runtime rows, and options. */
  walletModalRows?: readonly WalletModalRow[];
  /** Make `accounts[id]` the active account for its family. */
  selectAccount: (id: string) => Promise<void>;

  /**
   * Installed/loadable Solana wallets the adapter can attach to. Empty
   * (or undefined) when the adapter doesn't support Solana or has no
   * detected wallets. UIs use this to render an inline picker so users
   * pick their wallet explicitly rather than relying on auto-detection.
   */
  solanaWallets?: readonly SvmWalletDescriptor[];
  /**
   * EVM wallet connectors the adapter can attach to. This keeps the picker
   * wallet-brand-first even when the actual connector plumbing comes from
   * Para/Privy/wagmi.
   */
  evmWallets?: readonly AomiWalletOption[];
  /**
   * Attach a specific EVM wallet by option id (matches `evmWallets[].id`).
   */
  connectEvmWallet?: (id: string) => Promise<void>;
  /**
   * Non-wallet account sign-in options, e.g. Google or email. These are
   * rendered separately from wallet brands so users don't have to learn
   * the underlying provider name.
   */
  socialLoginOptions?: readonly AomiWalletOption[];
  connectSocial?: (id: string) => Promise<void>;
  /**
   * Attach a specific Solana wallet by name (matches
   * `solanaWallets[].name`). The promise resolves once the wallet adapter
   * reports connected (or rejects if the wallet popup is cancelled).
   */
  connectSolanaWallet?: (name: string) => Promise<void>;

  connect: (options?: { family?: PublicWalletFamily }) => Promise<void>;
  openAccountUI?: (options?: { family?: PublicWalletFamily }) => Promise<void>;
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
    family?: PublicWalletFamily | "all";
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
  /**
   * Return an upstream wallet-provider credential that the portal can exchange
   * for a short-lived Aomi bearer.
   */
  getAccountCredential?: () => Promise<AomiAccountCredential | null>;
  solanaRpcHttpUrl?: string;
  solanaRpcWsUrl?: string;
};

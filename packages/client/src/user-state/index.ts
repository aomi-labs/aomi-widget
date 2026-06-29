import * as accessors from "./accessors";
import { normalizeUserState, reconcileUserState } from "./normalize";

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 */
export type UserStateAAMode = "none" | "4337" | "7702";
export type UserStateWalletKind = "eoa" | "smart-account";
export type UserStateWalletProvider = "para" | "privy" | "baseAccount";
export type UserStateAuthMethod =
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
export type UserStateSponsorProvider =
  | "alchemy"
  | "coinbase"
  | "pimlico"
  | "self";

/** Session-level connection facts shared across chain families. */
export interface UserStateConnection extends Record<string, unknown> {
  is_connected?: boolean | null;
  provider?: UserStateWalletProvider | null;
  provider_label?: string | null;
  wallet_provider_subject?: string | null;
  auth_method?: UserStateAuthMethod | null;
  auth_value?: string | null;
  auth_verified_at?: number | string | null;
}

/** EVM account-abstraction sub-state (`evm.aa`). */
export interface UserStateEvmAa extends Record<string, unknown> {
  mode?: UserStateAAMode | null;
  /** Smart-account executor address (4337). */
  smart_account?: string | null;
  /** 7702 delegation contract address. */
  delegation_7702?: string | null;
  /** Bundler / AA infra provider, e.g. "alchemy". */
  provider?: string | null;
}

/** EVM sponsorship sub-state (`evm.sponsorship`). */
export interface UserStateEvmSponsorship extends Record<string, unknown> {
  eligible?: boolean | null;
  required?: boolean | null;
  mode?: string | null;
  sponsored?: boolean | null;
  sponsor_provider?: UserStateSponsorProvider | null;
  sponsor_account?: string | null;
}

/** EVM-family wallet block (`evm`). */
/**
 * One EVM operating wallet. `chain_id` omitted/null is the chain-agnostic
 * default (operate on whatever chain the action targets); an explicit `chain_id`
 * pins this wallet to that chain, so a session can operate different addresses
 * on different chains at once. Mirrors the backend `EvmChainWallet`.
 */
export interface UserStateEvm extends Record<string, unknown> {
  address?: string | null;
  chain_id?: number | string | null;
  ens_name?: string | null;
  aa?: UserStateEvmAa | null;
  sponsorship?: UserStateEvmSponsorship | null;
}

/** Solana-family wallet block (`svm`). */
export interface UserStateSvm extends Record<string, unknown> {
  address?: string | null;
  cluster?: string | null;
  wallet_name?: string | null;
  transport?: string | null;
  /** Wallet-Standard capability identifiers, e.g. `"can_sign_message"`. */
  capabilities?: string[] | null;
}

/**
 * Backend-pushed in-flight wallet requests, chain-bucketed. Shape is owned by
 * the backend; parsed by helpers like `pendingTxsFromBackendUserState`. The
 * client forwards them transparently via reconciliation.
 */
export interface UserStatePending extends Record<string, unknown> {
  evm_txs?: Record<string, unknown> | null;
  evm_sigs?: Record<string, unknown> | null;
  svm_ixs?: Record<string, unknown> | null;
  svm_sigs?: Record<string, unknown> | null;
}

/**
 * Client-side user state, in the backend's canonical nested snake_case wire
 * shape. EVM and Solana identities are independent blocks (`evm` / `svm`) so a
 * single session can carry both families at once. This nested shape is the only
 * input shape; `normalize` just canonicalizes it (camelCase→snake_case key
 * aliases, null-pruning of non-`Option` wire fields, pending-bucket aliasing).
 */
export interface UserState extends Record<string, unknown> {
  connection?: UserStateConnection | null;
  /**
   * EVM operating wallets, one entry per selected chain (plus an optional
   * chain-agnostic default with no `chain_id`). Serializes as a JSON array,
   * mirroring the backend `EvmWalletState`. `normalize` also accepts the legacy
   * single-object shape and folds it into a one-element array.
   */
  evm?: UserStateEvm[] | null;
  svm?: UserStateSvm | null;
  pending?: UserStatePending | null;
  ext?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
}

/**
 * Known client surfaces that may want backend-specific UX strategies.
 * Additional string values are allowed for forward compatibility.
 */
export type AomiClientType = "ts_cli" | "web_ui" | (string & {});

export const CLIENT_TYPE_TS_CLI: AomiClientType = "ts_cli";
export const CLIENT_TYPE_WEB_UI: AomiClientType = "web_ui";

export namespace UserState {
  export const normalize = normalizeUserState;
  export const reconcile = reconcileUserState;
  export const address = accessors.address;
  export const evmAddress = accessors.evmAddress;
  export const svmAddress = accessors.svmAddress;
  export const chainId = accessors.chainId;
  export const ensName = accessors.ensName;
  export const aaMode = accessors.aaMode;
  export const SmartAccount4337 = accessors.SmartAccount4337;
  export const Delegation7702 = accessors.Delegation7702;
  export const walletKind = accessors.walletKind;
  export const isConnected = accessors.isConnected;
  export const walletProvider = accessors.walletProvider;
  export const walletProviderSubject = accessors.walletProviderSubject;
  export const authMethod = accessors.authMethod;
  export const authValue = accessors.authValue;
  export const authVerifiedAt = accessors.authVerifiedAt;
  export const sponsored = accessors.sponsored;
  export const sponsorProvider = accessors.sponsorProvider;
  export const sponsorAccount = accessors.sponsorAccount;
  export const withExt = accessors.withExt;
}

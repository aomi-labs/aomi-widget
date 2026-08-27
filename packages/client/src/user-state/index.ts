import * as accessors from "./accessors";
import {
  normalizeUserState,
  reconcileUserState,
  toOwnedUserState,
} from "./normalize";

/**
 * Client-side user state synced with the backend.
 * Typically wallet connection info, but can be any key-value data.
 *
 * Account-abstraction and sponsorship are backend authority: they are resolved
 * by the `execution-profile` endpoint and per-execution operation payloads, and
 * are deliberately NOT part of this wire shape. The client never sends or stores
 * them here.
 */
export type UserStateAAMode = "none" | "4337" | "7702";
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

/** EVM-family wallet block (`evm`). */
export interface UserStateEvm extends Record<string, unknown> {
  address?: string | null;
  chain_id?: number | string | null;
  ens_name?: string | null;
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
 * Client-side user state, canonicalized to the backend's nested snake_case
 * wire shape. EVM and Solana identities are independent blocks (`evm` / `svm`)
 * so a single session can carry both families at once. `normalize` accepts the
 * backend's nested camelCase responses and legacy flat host input, and emits
 * this canonical shape.
 */
export interface UserState extends Record<string, unknown> {
  connection?: UserStateConnection | null;
  evm?: UserStateEvm | null;
  svm?: UserStateSvm | null;
  ext?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
}

/**
 * The client owns every field in UserState. Runtime execution and continuation
 * data live only in durable Actions and cannot enter this shape.
 */
export type OwnedUserState = UserState;

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
  export const toOwned = toOwnedUserState;
  export const address = accessors.address;
  export const evmAddress = accessors.evmAddress;
  export const svmAddress = accessors.svmAddress;
  export const chainId = accessors.chainId;
  export const ensName = accessors.ensName;
  export const isConnected = accessors.isConnected;
  export const walletProvider = accessors.walletProvider;
  export const walletProviderSubject = accessors.walletProviderSubject;
  export const authMethod = accessors.authMethod;
  export const authValue = accessors.authValue;
  export const authVerifiedAt = accessors.authVerifiedAt;
  export const withExt = accessors.withExt;
}

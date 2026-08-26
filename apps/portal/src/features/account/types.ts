/**
 * Wallet signing ACL types — synced from the design mock
 * (aomi-chat-design contracts.ts). Mirrors the backend `SigningMode`
 * on the canonical account response.
 */

/**
 * ACL policy axis — the `public_keys.signing_mode` a user *wants* a wallet to
 * stay in (desired state). The runtime reconciles toward it; it is not the
 * runtime's live mode. Mirrors the backend `SigningMode` enum.
 */
export type SignerMode = "manual" | "client_auto" | "auto" | "denied";

/**
 * How a wallet was proven and attached — the tidy provenance set that mirrors
 * the kernel's `auth_providers.provider`. Custody is *derived* from it:
 * siwe/siws → self-custody, privy/para → embedded.
 */
export type LinkedVia = "siwe" | "siws" | "privy" | "para";

/**
 * One `public_keys` row as the account owns it: identity + the ACL (desired
 * signing policy). Chain topology is deliberately absent — that's thread state.
 */
export interface WalletPolicy {
  id: string;
  chain: "evm" | "svm";
  address: string;
  /** How the wallet was proven/attached; drives custody + valid signer modes. */
  linkedVia: LinkedVia;
  /**
   * EIP-6963 rdns (EVM) / wallet-adapter id (SVM) captured at connect time,
   * when known — e.g. "io.metamask", "app.phantom". Display-only; the proof is
   * still `linkedVia`. Absent for older/backfilled wallets → falls back to it.
   */
  rdns?: string;
  primary?: boolean;
  /** The ACL — the committed desired signing mode. */
  desiredMode: SignerMode;
  /** Whether a live delegated grant currently backs `auto` (capability axis). */
  grantActive?: boolean;
  /** Human label for the backing grant's expiry, when relevant. */
  grantExpiresLabel?: string;
  /** Monotonic authorization_version (bumped by each committed permit). */
  authVersion: number;
  /** Audit label of the last permit that set the mode. */
  lastPermit?: string;
  /** Raw `auth_providers.provider` — what a grant revoke is keyed on. */
  provider?: string;
  /**
   * Backend truth for whether `auto` is offerable (provenance AND a live
   * grant). The client must not re-derive this from `linkedVia`: a Para or
   * Privy wallet with no grant still can't go auto.
   */
  canUseAuto?: boolean;
  /**
   * A provisioned agent wallet — only the provider holds key material, so the
   * client-side modes (`manual`, `client_auto`) are meaningless for it.
   */
  providerManaged?: boolean;
}

/**
 * A `DelegatedAccount` — the capability axis. Its presence + validity is
 * what lets an `auto` ACL actually reconcile.
 */
export interface DelegationGrant {
  id: string;
  /** Display name, e.g. "Privy". */
  provider: string;
  /** Raw provider key the revoke route is addressed by, e.g. "privy". */
  providerKey?: string;
  /** What the grant is scoped to, e.g. "Solana · 8xKn…9QpS". */
  scope: string;
  kind: string;
  status: "active" | "expired" | "revoked";
  expiresLabel: string;
}

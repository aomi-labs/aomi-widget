/**
 * Wallet signing ACL types — synced from the design mock
 * (aomi-chat-design contracts.ts). Mirrors the backend `SigningMode`
 * on `public_keys` and `delegated_approval` rows.
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
}

/**
 * A `delegated_approval` row — the capability axis. Its presence + validity is
 * what lets an `auto` ACL actually reconcile.
 */
export interface DelegationGrant {
  id: string;
  provider: string;
  /** What the grant is scoped to, e.g. "Solana · 8xKn…9QpS". */
  scope: string;
  kind: string;
  status: "active" | "expired" | "revoked";
  expiresLabel: string;
}

// =============================================================================
// @aomi-labs/auth — types
// =============================================================================
//
// Wire types shared between the programmatic API, route handlers, and any
// caller (mcp-core or the Rust BE). The store / secret-store interfaces and
// provider contract live alongside.

/** Stable identifier for an Aomi user. v1: arbitrary UUID; future: resolved
 * from plugin-level OAuth bearer. Treated as opaque by `auth`. */
export type UserId = string;

/** Opaque pointer into the secret store. The value behind it never appears
 *  in any DB column or log line. */
export type SecretHandle = string;

/** Which path kicked the auth flow off — pure audit, not behavior. */
export type Initiator = "mcp" | "be";

/** A row in `access_approval` (BE Postgres; portal mirrors in-memory).
 *  Identity-scoped via auth_identity, which carries `(application,
 *  wallet_provider)`. We carry both fields here so portal lookups can be
 *  done without a join. No secret material. */
export interface AccessApproval {
  id: string;
  userId: UserId;
  /** Aomi-app the identity is scoped to. `null` = global identity
   *  (`DbAuthIdentity.application` IS NULL). */
  application: string | null;
  /** Wallet-provider name behind the identity: `'privy' | 'para' |
   *  'dummy' | ...`. Matches `DbAuthIdentity.wallet_provider`. */
  walletProvider: string;
  displayLabel?: string;
  /** Opaque pointer the BE uses to find the secrets. v1 form:
   *  `identity:<id>` — SecretVault resolves slots by identity id. */
  secretHandle: SecretHandle;
  grantedAt: number;
  revokedAt?: number;
}

/** A row in `pending_auths` (portal-memory only; BE has no table).
 *  The MCP/BE awaits on it. */
export interface PendingAuth {
  stateToken: string;
  userId: UserId;
  /** Aomi-app the upcoming approval will be scoped to. `null` = global. */
  application: string | null;
  /** Wallet provider this auth flow targets. */
  walletProvider: string;
  initiator: Initiator;
  startedAt: number;
  completedAt?: number;
  resultApprovalId?: string;
  error?: string;
}

/** Result of `awaitAuth` (programmatic shape; HTTP wire uses snake_case). */
export type AwaitResult =
  | { status: "pending" }
  | { status: "completed"; approvalId: string }
  | { status: "failed"; error: string };

/** Result of `beginAuth`. */
export interface BeginResult {
  stateToken: string;
  authUrl: string;
  expiresAt: number;
}

/** Caller-supplied context. v1 just needs userId; future: bearer, scopes. */
export interface AuthCtx {
  userId: UserId;
  initiator: Initiator;
}

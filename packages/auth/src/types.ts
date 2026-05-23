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

/** A row in `access_approval` (v1: in-memory; BE has the persistent table).
 *  No secret material. */
export interface AccessApproval {
  id: string;
  userId: UserId;
  application: string;
  displayLabel?: string;
  /** JSON-serialized `Record<string, SecretHandle>` returned by the secret
   *  store. The proxy decodes by `JSON.parse` when it lands post-v1. */
  secretHandle: SecretHandle;
  grantedAt: number;
  revokedAt?: number;
}

/** A row in `pending_auths` (v1: in-memory). The MCP/BE awaits on it. */
export interface PendingAuth {
  stateToken: string;
  userId: UserId;
  provider: string;
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

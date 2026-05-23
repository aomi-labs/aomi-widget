// =============================================================================
// SecretStore interface — where the actual credential material lives.
// =============================================================================
//
// v1 backend: `./be-vault.ts` — thin client over the BE's existing
// SecretVault via POST /api/_internal/secrets. Production: vercel-kv.ts +
// KMS envelope (post-v1).
//
// Both impls return an opaque handle string that `auth` stores in
// `app_grants.secret_handle`. The value is never returned to MCP, never
// logged, never read by the auth runtime — only the BE (v1) or the proxy
// (post-v1) ever dereferences it.

import type { SecretHandle, UserId } from "../types";

export interface SecretStore {
  /** Stash a set of named credential slots and return their handles. */
  put(args: {
    userId: UserId;
    application: string;
    secrets: Record<string, string>;
  }): Promise<Record<string, SecretHandle>>;
}

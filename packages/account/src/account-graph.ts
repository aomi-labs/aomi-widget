import { randomUUID } from "node:crypto";

import { getPool } from "./db";

/**
 * The portal's resolve-or-create of the **canonical user id** — a faithful TS
 * port of the Rust backend's `DbUser::insert_for_identity`
 * (aomi/crates/database/src/entities/user.rs). It writes the same `users` /
 * `auth_providers` rows the backend reads, so the canonical UUID the portal
 * signs into the AccountBearer `sub` is one the backend's find-only `DbUser::get`
 * resolves immediately.
 *
 * Identity model (see service-identity.md "Identity root"): the provider
 * (`privy`/`para`) is a *linked credential*, keyed by `(provider, subject)`. The
 * canonical user is *ours* — a stable UUID in `users.id`. A returning user
 * resolves to her existing UUID (Alice keeps her sessions); only a genuinely new
 * `(provider, subject)` mints a new user.
 */
export type ResolveInput = {
  /** Credential provider, e.g. `"privy"` / `"para"`. Stored verbatim. */
  provider: string;
  /** Provider subject, e.g. `did:privy:…`. The credential key, never the `sub`. */
  subject: string;
  /**
   * TMP(account-graph): an EVM address from the verified-login exchange. When it
   * matches an existing `public_keys` row, resolve to that account — this
   * bridges returning wallet-first users (created via `wallet_bind`, keyed by
   * address, with no provider identity yet) to their existing sessions. Trusted
   * as supplied — a deliberate stopgap for this week; the account-graph refactor
   * replaces this with proper credential linking and wallet-ownership proof.
   */
  walletAddress?: string;
};

export type CanonicalUser = {
  /** Stable canonical user id (`users.id`, a UUID string) → the bearer `sub`. */
  userId: string;
  /** True only when this call created the account (first login). */
  created: boolean;
};

/** Mirrors `DbAuthProvider::normalize_value` (trim + ASCII-lowercase). */
function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Resolve the canonical user for `(provider, subject)`, creating one on first
 * login. Atomic enough for concurrent first logins: the create races on the
 * `auth_providers` unique index `(provider, subject) where subject is not
 * null`; the loser catches the unique violation (SQLSTATE 23505), rolls back
 * its orphan `users` row, and re-reads the winner — so two concurrent first
 * logins converge on one user, matching the backend.
 */
export async function resolveOrCreateCanonicalUser(
  input: ResolveInput,
): Promise<CanonicalUser> {
  const provider = input.provider.trim();
  const subject = input.subject.trim();
  if (!provider || !subject) {
    throw new Error(
      "resolveOrCreateCanonicalUser requires provider and subject",
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    // TMP(account-graph): wallet-first restore. If the exchange passed a wallet
    // address matching an existing `public_keys` row, resolve to that account
    // so returning wallet-first users keep their sessions. Read-only on
    // purpose — it never writes the `(provider, subject)` link, so a wrong address
    // can't corrupt the graph the refactor inherits. The key mirrors the
    // backend's `DbPublicKey::user_by_wallet` (`chain_type = 'evm'`, address
    // stored lowercased). Remove when the account graph links credentials.
    // See ResolveInput.walletAddress.
    if (input.walletAddress) {
      const byWallet = await client.query(
        `select user_id from public_keys
          where chain_type = 'evm'
            and address = $1
          limit 1`,
        [normalizeValue(input.walletAddress)],
      );
      const walletUserId = byWallet.rows[0]?.user_id as string | undefined;
      if (walletUserId) return { userId: walletUserId, created: false };
    }

    const existing = await findUserIdBySubject(client, provider, subject);
    if (existing) return { userId: existing, created: false };

    const userId = randomUUID();
    // Unix *seconds* — the backend's `users`/`auth_providers` timestamps are
    // `bigint` seconds (`chrono::Utc::now().timestamp()`), not millis.
    const now = Math.floor(Date.now() / 1000);
    try {
      await client.query("begin");
      // Minimal column set, matching `insert_for_identity`: DB defaults fill
      // `applications` / `tier` / `status`.
      await client.query(
        `insert into users (id, username, created_at, updated_at)
         values ($1, null, $2, $2)`,
        [userId, now],
      );
      // `method`/`value` mirror `insert_for_identity` (both set to the
      // provider/subject pair); lookups by value use the functional index on
      // `lower(value)`, so no normalized column is stored.
      await client.query(
        `insert into auth_providers
           (user_id, provider, subject, method, value,
            verified_at, is_primary, provider_metadata, created_at, updated_at)
         values ($1, $2, $3, $2, $3, $4, true, $5, $4, $4)`,
        [
          userId,
          provider,
          subject,
          now,
          JSON.stringify({ source: "portal_resolve_or_create" }),
        ],
      );
      await client.query("commit");
      return { userId, created: true };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      // A concurrent first login won the race; re-read the canonical winner.
      if (isUniqueViolation(error)) {
        const winner = await findUserIdBySubject(client, provider, subject);
        if (winner) return { userId: winner, created: false };
      }
      throw error;
    }
  } finally {
    client.release();
  }
}

/**
 * Resolve-or-create the canonical user for a **wallet-proven** identity (base's
 * SIWE login). Unlike the provider exchange, there is no `(provider, subject)`
 * credential — only an EVM address whose ownership the SIWE signature proved
 * server-side. Keyed by `wallet_provider = 'wallet'` and
 * `auth_value_normalized = lower(address)`, so wallet identities are only
 * resolved from a proven wallet-ownership path.
 *
 * Mirrors `insert_for_identity`'s column set + the unique-index race handling.
 */
export async function resolveOrCreateByWallet(
  address: string,
): Promise<CanonicalUser> {
  const normalized = normalizeValue(address);
  if (!normalized) {
    throw new Error("resolveOrCreateByWallet requires a wallet address");
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    const existing = await findUserIdByWallet(client, normalized);
    if (existing) return { userId: existing, created: false };

    const userId = randomUUID();
    // Unix *seconds* — the backend's timestamps are `bigint` seconds.
    const now = Math.floor(Date.now() / 1000);
    try {
      await client.query("begin");
      await client.query(
        `insert into users (id, username, created_at, updated_at)
         values ($1, null, $2, $2)`,
        [userId, now],
      );
      await client.query(
        `insert into auth_identities
           (user_id, application, wallet_provider, wallet_provider_subject,
            auth_method, auth_value, auth_value_normalized,
            auth_verified_at, is_primary, metadata, created_at, updated_at)
         values ($1, null, 'wallet', $2, 'wallet', $3, $2, $4, true, $5, $4, $4)`,
        [
          userId,
          normalized,
          address,
          now,
          JSON.stringify({ source: "base_siwe" }),
        ],
      );
      await client.query("commit");
      return { userId, created: true };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      if (isUniqueViolation(error)) {
        const winner = await findUserIdByWallet(client, normalized);
        if (winner) return { userId: winner, created: false };
      }
      throw error;
    }
  } finally {
    client.release();
  }
}

async function findUserIdByWallet(
  client: { query: PoolClientQuery },
  normalizedAddress: string,
): Promise<string | null> {
  const result = await client.query(
    `select user_id from auth_identities
      where application is null
        and wallet_provider = 'wallet'
        and auth_value_normalized = $1
      limit 1`,
    [normalizedAddress],
  );
  return (result.rows[0]?.user_id as string | undefined) ?? null;
}

async function findUserIdBySubject(
  client: { query: PoolClientQuery },
  provider: string,
  subject: string,
): Promise<string | null> {
  // Provider identities are global per user (no app scoping), matching the
  // backend's `DbAuthProvider::find_by_subject`.
  const result = await client.query(
    `select user_id from auth_providers
      where provider = $1
        and subject = $2
      limit 1`,
    [provider, subject],
  );
  return (result.rows[0]?.user_id as string | undefined) ?? null;
}

type PoolClientQuery = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: Array<Record<string, unknown>> }>;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

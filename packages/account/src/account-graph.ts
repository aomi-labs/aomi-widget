import { randomUUID } from "node:crypto";

import { getPool } from "./db";

/**
 * The portal's resolve-or-create of the **canonical user id** — a faithful TS
 * port of the Rust backend's account resolution helpers
 * (aomi/crates/database/src/entities/user.rs). It writes the same `users` /
 * `auth_providers` rows the backend reads, so the canonical UUID the portal
 * signs into the AccountBearer `sub` is one the backend's find-only `DbUser::get`
 * resolves immediately.
 *
 * Identity model (see service-identity.md "Identity root"): the provider
 * (`privy`/`para`) is a *linked credential*, keyed by `(provider, subject)`. The
 * canonical user is *ours* — a stable UUID in `users.id`. A returning user
 * resolves to her existing UUID (Alice keeps her threads); only a genuinely new
 * `(provider, subject)` mints a new user.
 */
export type ResolveInput = {
  /** Credential provider, e.g. `"privy"` / `"para"`. Stored verbatim. */
  provider: string;
  /** Provider subject, e.g. `did:privy:…`. The credential key, never the `sub`. */
  subject: string;
  /**
   * Optional already-resolved account id to use as the backend `users.id`.
   * Better Auth sessions pass the Aomi account id here so linked wallets share
   * one backend thread owner.
   */
  canonicalUserId?: string;
};

export type CanonicalUser = {
  /** Stable canonical user id (`users.id`, a UUID string) → the bearer `sub`. */
  userId: string;
  /** True only when this call created the account (first login). */
  created: boolean;
};

/**
 * Resolve the canonical user for `(provider, subject)`, creating one on first
 * login. Atomic enough for concurrent first logins: the create races on the
 * `auth_providers` unique index `(provider, subject)`; the loser catches the unique violation (SQLSTATE
 * 23505), rolls back its orphan `users` row, and re-reads the winner — so two
 * concurrent first logins converge on one user, matching the backend.
 */
export async function resolveOrCreateCanonicalUser(
  input: ResolveInput,
): Promise<CanonicalUser> {
  const provider = backendProvider(input.provider);
  const subject = input.subject.trim();
  const canonicalUserId = input.canonicalUserId?.trim();
  if (!provider || !subject) {
    throw new Error(
      "resolveOrCreateCanonicalUser requires provider and subject",
    );
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    const existing = await findUserIdBySubject(client, provider, subject);
    if (existing) {
      if (!canonicalUserId || existing === canonicalUserId) {
        return { userId: existing, created: false };
      }
      await rebindIdentityToCanonicalUser(client, {
        userId: canonicalUserId,
        previousUserId: existing,
        provider,
        subject,
      });
      return { userId: canonicalUserId, created: false };
    }

    const userId = canonicalUserId ?? randomUUID();
    // Unix *seconds* — the backend's account timestamps are
    // `bigint` seconds (`chrono::Utc::now().timestamp()`), not millis.
    const now = Math.floor(Date.now() / 1000);
    try {
      await client.query("begin");
      // Minimal column set, matching backend account creation: DB defaults fill
      // `applications` / `tier` / `status`.
      await ensureBackendUser(client, userId, now);
      await insertAuthProvider(client, {
        userId,
        provider,
        subject,
        method: provider,
        value: subject,
        verifiedAt: now,
        isPrimary: true,
        metadata: { source: "portal_resolve_or_create" },
        now,
      });
      await client.query("commit");
      return { userId, created: true };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      // A concurrent first login won the race; re-read the canonical winner.
      if (isUniqueViolation(error)) {
        const winner = await findUserIdBySubject(client, provider, subject);
        if (winner) {
          if (canonicalUserId && winner !== canonicalUserId) {
            await rebindIdentityToCanonicalUser(client, {
              userId: canonicalUserId,
              previousUserId: winner,
              provider,
              subject,
            });
            return { userId: canonicalUserId, created: false };
          }
          return { userId: winner, created: false };
        }
      }
      throw error;
    }
  } finally {
    client.release();
  }
}

function backendProvider(provider: string): string {
  const normalized = provider.trim();
  return normalized === "better_auth" ? "betterauth" : normalized;
}

async function insertAuthProvider(
  client: { query: PoolClientQuery },
  input: {
    userId: string;
    provider: string;
    subject: string;
    method: string;
    value: string;
    verifiedAt: number;
    isPrimary: boolean;
    metadata: Record<string, unknown>;
    now: number;
  },
): Promise<number> {
  const result = await client.query(
    `insert into auth_providers
       (user_id, provider, subject, method, value, verified_at, is_primary,
        provider_metadata, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $9)
     returning id`,
    [
      input.userId,
      input.provider,
      input.subject,
      input.method,
      input.value.trim(),
      input.verifiedAt,
      input.isPrimary,
      JSON.stringify(input.metadata),
      input.now,
    ],
  );
  const id = result.rows[0]?.id;
  if (typeof id !== "number" && typeof id !== "string") {
    throw new Error("auth provider insert did not return id");
  }
  return Number(id);
}

async function ensureBackendUser(
  client: { query: PoolClientQuery },
  userId: string,
  now: number,
): Promise<void> {
  await client.query(
    `insert into users (id, username, created_at, updated_at)
     values ($1, null, $2, $2)
     on conflict (id) do update set updated_at = excluded.updated_at`,
    [userId, now],
  );
}

async function rebindIdentityToCanonicalUser(
  client: { query: PoolClientQuery },
  input: {
    userId: string;
    previousUserId: string;
    provider: string;
    subject: string;
  },
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await client.query("begin");
  try {
    await ensureBackendUser(client, input.userId, now);
    await client.query(
      `update auth_providers
       set user_id = $1,
           provider_metadata = coalesce(provider_metadata, '{}'::jsonb) || $5::jsonb,
           updated_at = $6
       where provider = $2
         and subject = $3
         and user_id = $4`,
      [
        input.userId,
        input.provider,
        input.subject,
        input.previousUserId,
        JSON.stringify({
          source: "portal_better_auth_account_rebind",
          previous_user_id: input.previousUserId,
        }),
        now,
      ],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}

async function findUserIdBySubject(
  client: { query: PoolClientQuery },
  provider: string,
  subject: string,
): Promise<string | null> {
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

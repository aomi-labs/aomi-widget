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

/** Mirrors `DbAuthIdentity::normalize_value` (trim + ASCII-lowercase). */
function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

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

/**
 * Resolve-or-create the canonical user for a wallet-proven identity. SIWE paths
 * key this by normalized wallet address after server-side signature verification.
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
    if (existing) {
      await ensureExistingWalletLink(client, existing, normalized);
      return { userId: existing, created: false };
    }

    const userId = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    try {
      await client.query("begin");
      await ensureBackendUser(client, userId, now);
      const authProviderId = await insertAuthProvider(client, {
        userId,
        provider: "wallet",
        subject: normalized,
        method: "wallet",
        value: normalized,
        verifiedAt: now,
        isPrimary: true,
        metadata: { source: "base_siwe" },
        now,
      });
      await upsertOwnedPublicKey(client, {
        userId,
        authProviderId,
        address: normalized,
        now,
      });
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

async function ensureWalletLink(
  client: { query: PoolClientQuery },
  input: {
    userId: string;
    normalizedAddress: string;
    now: number;
  },
): Promise<void> {
  const existing = await client.query(
    `select id, user_id
       from auth_providers
      where provider = 'wallet'
        and subject = $1
      limit 1`,
    [input.normalizedAddress],
  );
  const existingRow = existing.rows[0];
  if (existingRow) {
    if (existingRow.user_id !== input.userId) {
      throw new Error(
        `wallet ${input.normalizedAddress} is already bound to user ${existingRow.user_id}`,
      );
    }
    await upsertOwnedPublicKey(client, {
      userId: input.userId,
      authProviderId: Number(existingRow.id),
      address: input.normalizedAddress,
      now: input.now,
    });
    return;
  }

  const authProviderId = await insertAuthProvider(client, {
    userId: input.userId,
    provider: "wallet",
    subject: input.normalizedAddress,
    method: "wallet",
    value: input.normalizedAddress,
    verifiedAt: input.now,
    isPrimary: true,
    metadata: { source: "base_siwe" },
    now: input.now,
  });
  await upsertOwnedPublicKey(client, {
    userId: input.userId,
    authProviderId,
    address: input.normalizedAddress,
    now: input.now,
  });
}

async function upsertOwnedPublicKey(
  client: { query: PoolClientQuery },
  input: {
    userId: string;
    authProviderId: number;
    address: string;
    now: number;
  },
): Promise<void> {
  const owner = await client.query(
    `select user_id
       from public_keys
      where chain_type = 'evm'
        and address = $1
      limit 1`,
    [input.address],
  );
  const ownerId = owner.rows[0]?.user_id;
  if (ownerId && ownerId !== input.userId) {
    throw new Error(
      `public key ${input.address} is already bound to user ${ownerId}`,
    );
  }

  await client.query(
    `insert into public_keys
       (chain_type, address, user_id, auth_provider_id, is_primary, created_at, updated_at)
     values ('evm', $1, $2, $3, true, $4, $4)
     on conflict (chain_type, address)
     do update set
       user_id = excluded.user_id,
       auth_provider_id = excluded.auth_provider_id,
       is_primary = excluded.is_primary,
       updated_at = excluded.updated_at`,
    [input.address, input.userId, input.authProviderId, input.now],
  );
}

async function ensureExistingWalletLink(
  client: { query: PoolClientQuery },
  userId: string,
  normalizedAddress: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await ensureWalletLink(client, {
    userId,
    normalizedAddress,
    now,
  });
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

async function findUserIdByWallet(
  client: { query: PoolClientQuery },
  normalizedAddress: string,
): Promise<string | null> {
  const publicKey = await client.query(
    `select user_id from public_keys
      where chain_type = 'evm'
        and address = $1
      limit 1`,
    [normalizedAddress],
  );
  const publicKeyOwner =
    (publicKey.rows[0]?.user_id as string | undefined) ?? null;
  if (publicKeyOwner) return publicKeyOwner;

  const provider = await client.query(
    `select user_id from auth_providers
      where provider = 'wallet'
        and (subject = $1 or (method = 'wallet' and lower(value) = $1))
      limit 1`,
    [normalizedAddress],
  );
  return (provider.rows[0]?.user_id as string | undefined) ?? null;
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

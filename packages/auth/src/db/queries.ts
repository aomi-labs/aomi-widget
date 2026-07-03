import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool, PoolClient, QueryResult } from "pg";
import { pool as defaultPool } from "./pool";
import type {
  AccountWallet,
  AomiAccountResponse,
  AomiUserId,
  AuthIdentityProvider,
  BetterAuthUserId,
  DbAomiAuthIdentity,
  DbAomiUser,
  DbAomiWallet,
  LinkedAuthAccount,
  LinkedVia,
  SignalRef,
  WalletFamily,
  WalletKind,
} from "../types";
import {
  caip10,
  normalizeWalletAddress,
} from "../service/wallet-normalization";

type Db = Pool | PoolClient;
type Row = Record<string, unknown>;

function readSchemaSql(): string {
  try {
    return readFileSync(
      fileURLToPath(new URL("./schema.sql", import.meta.url)),
      "utf8",
    );
  } catch {
    for (const candidate of [
      path.resolve(process.cwd(), "../../packages/auth/src/db/schema.sql"),
      path.resolve(process.cwd(), "packages/auth/src/db/schema.sql"),
    ]) {
      try {
        return readFileSync(candidate, "utf8");
      } catch {
        // Try the next monorepo-relative location.
      }
    }
    throw new Error("Could not load Aomi auth schema.sql");
  }
}

const schemaSql = readSchemaSql();

export async function runAomiAuthSchema(db: Db = defaultPool): Promise<void> {
  await db.query(schemaSql);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
  db: Pool = defaultPool,
): Promise<T> {
  const client = await db.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function findAomiUserByBetterAuthId(
  betterAuthUserId: BetterAuthUserId,
  db: Db = defaultPool,
): Promise<DbAomiUser | null> {
  const direct = await db.query(
    `select * from aomi_users
     where better_auth_user_id = $1 and deactivated_at is null
     limit 1`,
    [betterAuthUserId],
  );
  if (direct.rows[0]) return mapUser(direct.rows[0]);
  const identity = await db.query(
    `select u.* from aomi_auth_identities i
     join aomi_users u on u.id = i.user_id
     where i.provider = 'better_auth'
       and i.subject = $1
       and i.revoked_at is null
       and u.deactivated_at is null
     limit 1`,
    [betterAuthUserId],
  );
  return identity.rows[0] ? mapUser(identity.rows[0]) : null;
}

export async function findAomiUserById(
  userId: AomiUserId,
  db: Db = defaultPool,
): Promise<DbAomiUser | null> {
  const result = await db.query(
    `select * from aomi_users
     where id = $1 and deactivated_at is null
     limit 1`,
    [userId],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function createAomiUserForBetterAuth(input: {
  userId?: AomiUserId;
  betterAuthUserId: BetterAuthUserId;
  email?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  db?: Db;
}): Promise<DbAomiUser> {
  const db = input.db ?? defaultPool;
  if (input.userId) {
    const result = await db.query(
      `insert into aomi_users
         (id, better_auth_user_id, primary_email, display_name, avatar_url)
       values ($1, $2, $3, $4, $5)
       on conflict (id)
       do update set
         updated_at = now(),
         better_auth_user_id = coalesce(aomi_users.better_auth_user_id, excluded.better_auth_user_id),
         primary_email = coalesce(aomi_users.primary_email, excluded.primary_email),
         display_name = coalesce(aomi_users.display_name, excluded.display_name),
         avatar_url = coalesce(aomi_users.avatar_url, excluded.avatar_url)
       returning *`,
      [
        input.userId,
        input.betterAuthUserId,
        input.email ?? null,
        input.displayName ?? input.name ?? deriveDisplayName(input.email),
        input.avatarUrl ?? null,
      ],
    );
    return mapUser(result.rows[0]);
  }
  const result = await db.query(
    `insert into aomi_users
       (better_auth_user_id, primary_email, display_name, avatar_url)
     values ($1, $2, $3, $4)
     on conflict (better_auth_user_id)
     do update set
       updated_at = now(),
       primary_email = coalesce(aomi_users.primary_email, excluded.primary_email),
       display_name = coalesce(aomi_users.display_name, excluded.display_name),
       avatar_url = coalesce(aomi_users.avatar_url, excluded.avatar_url)
     returning *`,
    [
      input.betterAuthUserId,
      input.email ?? null,
      input.displayName ?? input.name ?? deriveDisplayName(input.email),
      input.avatarUrl ?? null,
    ],
  );
  return mapUser(result.rows[0]);
}

export async function findLegacyBackendUserIdByWallet(
  normalizedAddress: string,
  db: Db = defaultPool,
): Promise<AomiUserId | null> {
  try {
    const publicKey = await db.query(
      `select user_id from public_keys
        where chain_type = 'evm'
          and lower(address) = $1
        limit 1`,
      [normalizedAddress],
    );
    const publicKeyOwner =
      (publicKey.rows[0]?.user_id as string | undefined) ?? null;
    if (publicKeyOwner) return publicKeyOwner;
  } catch (error) {
    if (!isMissingRelation(error)) throw error;
  }

  try {
    const provider = await db.query(
      `select user_id from auth_providers
        where provider = 'wallet'
          and (lower(subject) = $1 or (method = 'wallet' and lower(value) = $1))
        limit 1`,
      [normalizedAddress],
    );
    return (provider.rows[0]?.user_id as string | undefined) ?? null;
  } catch (error) {
    if (!isMissingRelation(error)) throw error;
  }
  return null;
}

export async function touchAomiUser(
  userId: AomiUserId,
  db: Db = defaultPool,
): Promise<void> {
  await db.query("update aomi_users set updated_at = now() where id = $1", [
    userId,
  ]);
}

export async function logAccountEvent(input: {
  userId?: AomiUserId | null;
  actorUserId?: AomiUserId | null;
  eventType: string;
  data?: Record<string, unknown>;
  db?: Db;
}): Promise<void> {
  const db = input.db ?? defaultPool;
  await db.query(
    `insert into aomi_account_events (user_id, actor_user_id, event_type, data)
     values ($1, $2, $3, $4::jsonb)`,
    [
      input.userId ?? null,
      input.actorUserId ?? input.userId ?? null,
      input.eventType,
      JSON.stringify(input.data ?? {}),
    ],
  );
}

export async function findSignalOwner(
  signal: SignalRef,
  db: Db = defaultPool,
): Promise<AomiUserId | null> {
  if (signal.type === "wallet") {
    const result = await db.query(
      `select user_id from aomi_wallets w
       join aomi_users u on u.id = w.user_id
       where w.family = $1
         and w.normalized_address = $2
         and coalesce(w.chain_scope, '*') = coalesce($3, '*')
         and w.revoked_at is null
         and u.deactivated_at is null
       limit 1`,
      [signal.family, signal.normalizedAddress, signal.chainScope],
    );
    return (result.rows[0]?.user_id as string | undefined) ?? null;
  }
  if (signal.type === "identity") {
    const result = await db.query(
      `select i.user_id from aomi_auth_identities i
       join aomi_users u on u.id = i.user_id
       where i.provider = $1 and i.subject = $2
         and i.revoked_at is null
         and u.deactivated_at is null
       limit 1`,
      [signal.provider, signal.subject],
    );
    return (result.rows[0]?.user_id as string | undefined) ?? null;
  }
  const result = await db.query(
    `select i.user_id from aomi_auth_identities i
     join aomi_users u on u.id = i.user_id
     where i.provider = 'email' and i.email = $1
       and i.revoked_at is null
       and u.deactivated_at is null
     limit 1`,
    [signal.email],
  );
  return (result.rows[0]?.user_id as string | undefined) ?? null;
}

export async function countLoginFactors(
  userId: AomiUserId,
  db: Db = defaultPool,
): Promise<number> {
  const result = await db.query(
    `select
       (select count(*)::int from aomi_wallets
        where user_id = $1 and revoked_at is null)
       +
       (select count(*)::int from aomi_auth_identities
        where user_id = $1 and revoked_at is null
          and provider not in ('better_auth', 'siwe', 'email')) as count`,
    [userId],
  );
  return Number(result.rows[0]?.count ?? 0);
}

export async function upsertAuthIdentity(input: {
  userId: AomiUserId;
  provider: AuthIdentityProvider;
  subject: string;
  email?: string | null;
  displayLabel?: string | null;
  providerMetadata?: Record<string, unknown>;
  db?: Db;
}): Promise<DbAomiAuthIdentity> {
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `insert into aomi_auth_identities
       (user_id, provider, subject, email, display_label, provider_metadata)
     values ($1, $2, $3, $4, $5, $6::jsonb)
     on conflict (provider, subject) where revoked_at is null
     do update set
       email = coalesce(excluded.email, aomi_auth_identities.email),
       display_label = coalesce(excluded.display_label, aomi_auth_identities.display_label),
       provider_metadata = aomi_auth_identities.provider_metadata || excluded.provider_metadata,
       last_seen_at = now()
     where aomi_auth_identities.user_id = excluded.user_id
     returning *`,
    [
      input.userId,
      input.provider,
      input.subject,
      input.email ?? null,
      input.displayLabel ?? null,
      JSON.stringify(input.providerMetadata ?? {}),
    ],
  );
  if (!result.rows[0]) {
    throw new Error("identity_already_linked_to_another_account");
  }
  return mapIdentity(result.rows[0]);
}

export async function upsertEmailIdentity(input: {
  userId: AomiUserId;
  email: string;
  db?: Db;
}): Promise<DbAomiAuthIdentity> {
  return upsertAuthIdentity({
    userId: input.userId,
    provider: "email",
    subject: input.email.toLowerCase(),
    email: input.email,
    db: input.db,
  });
}

export async function revokeAuthIdentity(input: {
  userId: AomiUserId;
  provider: AuthIdentityProvider;
  subject: string;
  db?: Db;
}): Promise<boolean> {
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `update aomi_auth_identities
     set revoked_at = now(), last_seen_at = now()
     where user_id = $1 and provider = $2 and subject = $3
       and revoked_at is null`,
    [input.userId, input.provider, input.subject],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function clearAomiBetterAuthUserIds(input: {
  userId: AomiUserId;
  betterAuthUserIds: readonly string[];
  db?: Db;
}): Promise<boolean> {
  if (input.betterAuthUserIds.length === 0) return false;
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `update aomi_users
     set better_auth_user_id = null, updated_at = now()
     where id = $1
       and better_auth_user_id = any($2::text[])`,
    [input.userId, [...input.betterAuthUserIds]],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function upsertWallet(input: {
  userId: AomiUserId;
  family: WalletFamily;
  address: string;
  chainId?: number;
  chainScope?: string | null;
  kind: WalletKind;
  provider?: string | null;
  providerWalletId?: string | null;
  linkedVia: LinkedVia;
  label?: string | null;
  db?: Db;
}): Promise<DbAomiWallet> {
  const db = input.db ?? defaultPool;
  const normalized = normalizeWalletAddress(input.family, input.address);
  const result = await db.query(
    `insert into aomi_wallets
       (user_id, family, address, normalized_address, caip10, chain_scope, kind,
        provider, provider_wallet_id, linked_via, label)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     on conflict (family, normalized_address, coalesce(chain_scope, '*')) where revoked_at is null
     do update set
       address = excluded.address,
       caip10 = excluded.caip10,
       kind = excluded.kind,
       provider = excluded.provider,
       provider_wallet_id = excluded.provider_wallet_id,
       linked_via = excluded.linked_via,
       label = coalesce(aomi_wallets.label, excluded.label),
       last_seen_at = now()
     where aomi_wallets.user_id = excluded.user_id
     returning *`,
    [
      input.userId,
      input.family,
      input.address,
      normalized,
      caip10(input),
      input.chainScope ?? null,
      input.kind,
      input.provider ?? null,
      input.providerWalletId ?? null,
      input.linkedVia,
      input.label ?? null,
    ],
  );
  if (!result.rows[0]) {
    throw new Error("wallet_already_linked_to_another_account");
  }
  return mapWallet(result.rows[0]);
}

export async function listIdentitiesForUser(
  userId: AomiUserId,
  db: Db = defaultPool,
): Promise<DbAomiAuthIdentity[]> {
  const result = await db.query(
    `select * from aomi_auth_identities
     where user_id = $1 and revoked_at is null
     order by linked_at asc`,
    [userId],
  );
  return result.rows.map(mapIdentity);
}

export async function listWalletsForUser(
  userId: AomiUserId,
  db: Db = defaultPool,
): Promise<DbAomiWallet[]> {
  const result = await db.query(
    `select * from aomi_wallets
     where user_id = $1 and revoked_at is null
     order by verified_at asc`,
    [userId],
  );
  return result.rows.map(mapWallet);
}

export async function updateAomiUserProfile(input: {
  userId: AomiUserId;
  displayName?: string | null;
  primaryEmail?: string | null;
  avatarUrl?: string | null;
  db?: Db;
}): Promise<DbAomiUser> {
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `update aomi_users
     set display_name = coalesce($2, display_name),
         primary_email = coalesce($3, primary_email),
         avatar_url = case when $4 then $5 else avatar_url end,
         updated_at = now()
     where id = $1 and deactivated_at is null
     returning *`,
    [
      input.userId,
      input.displayName ?? null,
      input.primaryEmail ?? null,
      input.avatarUrl !== undefined,
      input.avatarUrl ?? null,
    ],
  );
  return mapUser(result.rows[0]);
}

export async function deactivateAomiUser(input: {
  userId: AomiUserId;
  db?: Db;
}): Promise<DbAomiUser | null> {
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `update aomi_users
     set deactivated_at = now(),
         better_auth_user_id = null,
         updated_at = now()
     where id = $1 and deactivated_at is null
     returning *`,
    [input.userId],
  );
  return result.rows[0] ? mapUser(result.rows[0]) : null;
}

export async function findAuthIdentityById(
  identityId: string,
  db: Db = defaultPool,
): Promise<DbAomiAuthIdentity | null> {
  const result = await db.query(
    `select * from aomi_auth_identities
     where id = $1 and revoked_at is null
     limit 1`,
    [identityId],
  );
  return result.rows[0] ? mapIdentity(result.rows[0]) : null;
}

export async function updateAuthIdentityLabel(input: {
  userId: AomiUserId;
  identityId: string;
  displayLabel: string | null;
  db?: Db;
}): Promise<DbAomiAuthIdentity | null> {
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `update aomi_auth_identities
     set display_label = $3, last_seen_at = now()
     where id = $1 and user_id = $2 and revoked_at is null
     returning *`,
    [input.identityId, input.userId, input.displayLabel],
  );
  return result.rows[0] ? mapIdentity(result.rows[0]) : null;
}

export async function updateWalletLabel(input: {
  userId: AomiUserId;
  walletId: string;
  label: string | null;
  db?: Db;
}): Promise<DbAomiWallet | null> {
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `update aomi_wallets
     set label = $3, last_seen_at = now()
     where id = $1 and user_id = $2 and revoked_at is null
     returning *`,
    [input.walletId, input.userId, input.label],
  );
  return result.rows[0] ? mapWallet(result.rows[0]) : null;
}

export async function revokeWallet(input: {
  userId: AomiUserId;
  walletId: string;
  db?: Db;
}): Promise<boolean> {
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `update aomi_wallets
     set revoked_at = now(), last_seen_at = now()
     where id = $1 and user_id = $2 and revoked_at is null`,
    [input.walletId, input.userId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function revokeAllAuthIdentitiesForUser(input: {
  userId: AomiUserId;
  db?: Db;
}): Promise<number> {
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `update aomi_auth_identities
     set revoked_at = now(), last_seen_at = now()
     where user_id = $1 and revoked_at is null`,
    [input.userId],
  );
  return result.rowCount ?? 0;
}

export async function revokeAllWalletsForUser(input: {
  userId: AomiUserId;
  db?: Db;
}): Promise<number> {
  const db = input.db ?? defaultPool;
  const result = await db.query(
    `update aomi_wallets
     set revoked_at = now(), last_seen_at = now()
     where user_id = $1 and revoked_at is null`,
    [input.userId],
  );
  return result.rowCount ?? 0;
}

export async function findWalletById(
  walletId: string,
  db: Db = defaultPool,
): Promise<DbAomiWallet | null> {
  const result = await db.query(
    `select * from aomi_wallets where id = $1 and revoked_at is null limit 1`,
    [walletId],
  );
  return result.rows[0] ? mapWallet(result.rows[0]) : null;
}

export async function buildAccountResponse(input: {
  user: DbAomiUser;
  betterAuthUserId: string;
  sessionExpiresAt?: Date | string | number | null;
  sessionFresh?: boolean;
  db?: Db;
}): Promise<AomiAccountResponse> {
  const [identities, wallets] = await Promise.all([
    listIdentitiesForUser(input.user.id, input.db),
    listWalletsForUser(input.user.id, input.db),
  ]);
  return {
    user: {
      id: input.user.id,
      displayName: input.user.displayName ?? undefined,
      email: input.user.primaryEmail ?? undefined,
      avatarUrl: input.user.avatarUrl ?? undefined,
    },
    linkedAccounts: identities.map(toLinkedAccount),
    wallets: wallets.map(toAccountWallet),
    session: {
      betterAuthUserId: input.betterAuthUserId,
      expiresAt: toMillis(input.sessionExpiresAt),
      fresh: input.sessionFresh,
    },
  };
}

export async function listBetterAuthSiweWallets(
  betterAuthUserId: string,
  db: Db = defaultPool,
): Promise<
  Array<{
    betterAuthUserId: string;
    address: string;
    chainId: number;
    isPrimary: boolean;
    createdAt: Date;
  }>
> {
  const candidates = [
    {
      table: '"walletAddress"',
      userId: '"userId"',
      chainId: '"chainId"',
      isPrimary: '"isPrimary"',
      createdAt: '"createdAt"',
    },
    {
      table: "wallet_address",
      userId: "user_id",
      chainId: "chain_id",
      isPrimary: "is_primary",
      createdAt: "created_at",
    },
  ];
  for (const candidate of candidates) {
    try {
      const result = await db.query(
        `select ${candidate.userId} as better_auth_user_id,
                address,
                ${candidate.chainId} as chain_id,
                ${candidate.isPrimary} as is_primary,
                ${candidate.createdAt} as created_at
         from ${candidate.table}
         where ${candidate.userId} = $1`,
        [betterAuthUserId],
      );
      return result.rows.map((row) => ({
        betterAuthUserId: String(row.better_auth_user_id),
        address: String(row.address),
        chainId: Number(row.chain_id),
        isPrimary: Boolean(row.is_primary),
        createdAt: new Date(row.created_at as string | Date),
      }));
    } catch (error) {
      if (!isMissingRelation(error)) throw error;
    }
  }
  return [];
}

export async function deleteBetterAuthSiweWallet(input: {
  address: string;
  chainId?: number | null;
  syntheticEmails?: readonly string[];
  db?: Db;
}): Promise<{ deleted: boolean; betterAuthUserIds: string[] }> {
  const db = input.db ?? defaultPool;
  const betterAuthUserIds = new Set<string>();
  let deletedCount = 0;
  let walletAddressUserLookup: { table: string; userId: string } | null = null;
  const walletAddressCandidates = [
    {
      table: '"walletAddress"',
      userId: '"userId"',
      chainId: '"chainId"',
    },
    {
      table: "wallet_address",
      userId: "user_id",
      chainId: "chain_id",
    },
  ];
  for (const candidate of walletAddressCandidates) {
    try {
      const result = await db.query(
        `delete from ${candidate.table}
         where lower(address) = lower($1)
           and ($2::int is null or ${candidate.chainId} = $2)
         returning ${candidate.userId} as better_auth_user_id`,
        [input.address, input.chainId ?? null],
      );
      deletedCount += result.rowCount ?? 0;
      for (const row of result.rows) {
        betterAuthUserIds.add(String(row.better_auth_user_id));
      }
      walletAddressUserLookup = candidate;
      break;
    } catch (error) {
      if (!isMissingRelation(error)) throw error;
    }
  }

  try {
    const result = await db.query(
      `delete from "account"
       where "providerId" = 'siwe'
         and lower(split_part("accountId", ':', 1)) = lower($1)
         and ($2::int is null or split_part("accountId", ':', 2) = $2::text)
       returning "userId" as better_auth_user_id`,
      [input.address, input.chainId ?? null],
    );
    deletedCount += result.rowCount ?? 0;
    for (const row of result.rows) {
      betterAuthUserIds.add(String(row.better_auth_user_id));
    }
  } catch (error) {
    if (!isMissingRelation(error)) throw error;
  }

  const ids = [...betterAuthUserIds];
  const syntheticEmails = uniqueLower(input.syntheticEmails ?? []);
  if (ids.length > 0 && syntheticEmails.length > 0) {
    try {
      const walletAddressEmpty = walletAddressUserLookup
        ? `and not exists (
             select 1 from ${walletAddressUserLookup.table} w
             where w.${walletAddressUserLookup.userId} = u.id
           )`
        : "";
      const deletableUsers = await db.query(
        `select u.id
         from "user" u
         where u.id = any($1::text[])
           and lower(u.email) = any($2::text[])
           and not exists (
             select 1 from "account" a where a."userId" = u.id
           )
           ${walletAddressEmpty}`,
        [ids, syntheticEmails],
      );
      const deletableIds = deletableUsers.rows.map((row) => String(row.id));
      if (deletableIds.length > 0) {
        try {
          await db.query(
            `delete from "session" where "userId" = any($1::text[])`,
            [deletableIds],
          );
        } catch (error) {
          if (!isMissingRelation(error)) throw error;
        }
        const result = await db.query(
          `delete from "user" where id = any($1::text[])`,
          [deletableIds],
        );
        deletedCount += result.rowCount ?? 0;
      }
    } catch (error) {
      if (!isMissingRelation(error)) throw error;
    }
  }

  return { deleted: deletedCount > 0, betterAuthUserIds: ids };
}

function mapUser(row: Row): DbAomiUser {
  return {
    id: String(row.id),
    betterAuthUserId: nullableString(row.better_auth_user_id),
    displayName: nullableString(row.display_name),
    primaryEmail: nullableString(row.primary_email),
    avatarUrl: nullableString(row.avatar_url),
    metadata: asRecord(row.metadata),
    deactivatedAt: nullableDate(row.deactivated_at),
    createdAt: new Date(row.created_at as string | Date),
    updatedAt: new Date(row.updated_at as string | Date),
  };
}

function mapIdentity(row: Row): DbAomiAuthIdentity {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    provider: row.provider as AuthIdentityProvider,
    subject: String(row.subject),
    email: nullableString(row.email),
    displayLabel: nullableString(row.display_label),
    providerMetadata: asRecord(row.provider_metadata),
    linkedAt: new Date(row.linked_at as string | Date),
    lastSeenAt: new Date(row.last_seen_at as string | Date),
    revokedAt: nullableDate(row.revoked_at),
  };
}

function mapWallet(row: Row): DbAomiWallet {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    family: row.family as WalletFamily,
    address: String(row.address),
    normalizedAddress: String(row.normalized_address),
    caip10: nullableString(row.caip10),
    chainScope: nullableString(row.chain_scope),
    kind: row.kind as WalletKind,
    provider: nullableString(row.provider),
    providerWalletId: nullableString(row.provider_wallet_id),
    linkedVia: row.linked_via as LinkedVia,
    label: nullableString(row.label),
    displayMetadata: asRecord(row.display_metadata),
    verifiedAt: new Date(row.verified_at as string | Date),
    lastSeenAt: new Date(row.last_seen_at as string | Date),
    revokedAt: nullableDate(row.revoked_at),
  };
}

function toLinkedAccount(identity: DbAomiAuthIdentity): LinkedAuthAccount {
  return {
    id: identity.id,
    provider: identity.provider,
    subject: identity.subject,
    email: identity.email ?? undefined,
    displayLabel: identity.displayLabel ?? undefined,
    linkedAt: identity.linkedAt.getTime(),
    lastSeenAt: identity.lastSeenAt.getTime(),
  };
}

function toAccountWallet(wallet: DbAomiWallet): AccountWallet {
  return {
    id: wallet.id,
    family: wallet.family,
    address: wallet.address,
    kind: wallet.kind,
    provider: wallet.provider ?? undefined,
    providerWalletId: wallet.providerWalletId ?? undefined,
    chainScope: wallet.chainScope ?? undefined,
    chainId: chainIdFromCaip10(wallet.caip10) ?? undefined,
    linkedVia: wallet.linkedVia,
    label: wallet.label ?? undefined,
    verifiedAt: wallet.verifiedAt.getTime(),
    lastSeenAt: wallet.lastSeenAt.getTime(),
  };
}

function chainIdFromCaip10(caip10Value: string | null): number | null {
  const match = caip10Value?.match(/^eip155:(\d+):/);
  if (!match) return null;
  const chainId = Number(match[1]);
  return Number.isInteger(chainId) && chainId > 0 ? chainId : null;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function uniqueLower(values: readonly string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  ];
}

function nullableDate(value: unknown): Date | null {
  return value ? new Date(value as string | Date) : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function toMillis(
  value: Date | string | number | null | undefined,
): number | undefined {
  if (value == null) return undefined;
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function deriveDisplayName(email?: string | null): string | null {
  if (!email) return null;
  return email.split("@")[0]?.slice(0, 80) || null;
}

function isMissingRelation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

export type { QueryResult };

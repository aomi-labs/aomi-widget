import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { getPool } from "../db/pool";
import { observeAccountInternalFailure } from "../observability";

const RATE_LIMIT_NAMESPACE = "aomi:widget:rate:";
const EXPIRED_SWEEP_PROBABILITY = 0.02;

type Db = Pool | PoolClient;
type RateLimitRow = QueryResultRow & { allowed: boolean };

/**
 * Increment a shared fixed-window counter in Better Auth's verification store.
 * The origin and address are hashed before persistence, and an advisory lock
 * serializes concurrent increments without requiring a new table or migration.
 */
export async function checkWidgetAuthRateLimit(input: {
  origin: string;
  clientAddress: string;
  now?: Date;
  limit?: number;
  windowMs?: number;
  db?: Db;
}): Promise<{ allowed: boolean }> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 60;
  const windowMs = input.windowMs ?? 60_000;
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new Error("Widget auth rate-limit size must be a positive integer");
  }
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) {
    throw new Error("Widget auth rate-limit window must be a positive integer");
  }

  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;
  const expiresAt = new Date(windowStart + windowMs);
  const digest = createHash("sha256")
    .update(`${input.origin}\n${input.clientAddress}\n${windowStart}`)
    .digest("hex");
  const identifier = `${RATE_LIMIT_NAMESPACE}${digest}`;
  const db = input.db ?? getPool();

  const result = await db.query<RateLimitRow>(
    `with lock as materialized (
       select pg_advisory_xact_lock(hashtextextended($1, 0))
     ), current_count as materialized (
       select coalesce(max(
         case when value ~ '^[0-9]+$' and length(value) <= 18
              then value::bigint else $5::bigint end
       ), 0)::bigint as count
       from ba_verifications cross join lock
       where identifier = $1 and expires_at > $2
     ), removed as (
       delete from ba_verifications where identifier = $1 returning 1
     ), inserted as (
       insert into ba_verifications
         (id, identifier, value, expires_at, created_at, updated_at)
       select $3, $1, (current_count.count + 1)::text, $4, now(), now()
       from current_count
       where (select count(*) from removed) >= 0
       returning value::bigint as count
     )
     select count <= $5::bigint as allowed from inserted`,
    [identifier, now, randomUUID(), expiresAt, limit],
  );

  await sweepExpiredRateLimits(db);
  return { allowed: result.rows[0]?.allowed === true };
}

async function sweepExpiredRateLimits(db: Db): Promise<void> {
  if (Math.random() >= EXPIRED_SWEEP_PROBABILITY) return;
  try {
    await db.query(
      `delete from ba_verifications
        where identifier like $1 and expires_at <= now()`,
      [`${RATE_LIMIT_NAMESPACE}%`],
    );
  } catch (error) {
    observeAccountInternalFailure({ kind: "widget_rate_limit_sweep", error });
  }
}

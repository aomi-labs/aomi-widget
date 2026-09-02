import { createHash, randomUUID } from "node:crypto";
import type { Pool, PoolClient, QueryResultRow } from "pg";
import { getPool } from "../db/pool";
import { observeAccountInternalFailure } from "../observability";

const RATE_LIMIT_NAMESPACE = "aomi:widget:rate:";
const EXPIRED_SWEEP_PROBABILITY = 0.02;

type Queryable = Pick<PoolClient, "query">;
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
  db?: Pool;
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
  const pool = input.db ?? getPool();
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("begin isolation level read committed");
    transactionOpen = true;
    // The lock must be acquired in a statement before the counter read. Under
    // READ COMMITTED, a statement takes its snapshot before a lock CTE waits,
    // which can otherwise lose concurrent increments after the wait ends.
    await client.query(
      "select pg_advisory_xact_lock(hashtextextended($1, 0))",
      [identifier],
    );
    const result = await client.query<RateLimitRow>(
      `with current_count as materialized (
       select coalesce(max(
         case when value ~ '^[0-9]+$' and length(value) <= 18
              then value::bigint else $5::bigint end
       ), 0)::bigint as count
       from ba_verifications
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
    await client.query("commit");
    transactionOpen = false;
    await sweepExpiredRateLimits(client);
    return { allowed: result.rows[0]?.allowed === true };
  } catch (error) {
    if (transactionOpen) {
      await client.query("rollback").catch(() => undefined);
    }
    throw error;
  } finally {
    client.release();
  }
}

async function sweepExpiredRateLimits(db: Queryable): Promise<void> {
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

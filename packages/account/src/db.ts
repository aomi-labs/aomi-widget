import { Pool } from "pg";

/**
 * Postgres pool for the shared BetterAuth + canonical account database.
 *
 * The portal owns **resolve-or-create** of the canonical user. It connects to
 * the same database BetterAuth uses for sessions and the Rust backend uses for
 * canonical account reads, so a user the portal creates is immediately found by
 * the backend's find-only `DbUser::get`.
 *
 * Connection string comes from `DATABASE_URL`, matching BetterAuth.
 * Never hard-code this value; it carries the DB password. Node runtime only
 * (not Edge).
 */
let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — the portal account graph needs the shared Postgres URL",
    );
  }
  pool = new Pool({
    connectionString,
    // The portal is one of several DB clients; keep its footprint small so it
    // never starves the backend on the shared Supabase pooler.
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return pool;
}

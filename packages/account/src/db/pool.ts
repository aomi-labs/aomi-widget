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
let cachedPool: Pool | undefined;

export function getPool(): Pool {
  if (cachedPool) return cachedPool;
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — the portal account graph needs the shared Postgres URL",
    );
  }
  cachedPool = new Pool({
    connectionString,
    // The portal is one of several DB clients; keep its footprint small so it
    // never starves the backend on the shared Supabase pooler.
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
  return cachedPool;
}

/**
 * Alias kept for the BetterAuth/account-service consumers that historically
 * lived in `@aomi-labs/auth`. There is exactly one canonical pool now.
 */
export const getAccountPool = getPool;

/**
 * Default pool handle used by the query/service layer. Lazy: it defers to the
 * single canonical `getPool()` on first access, so importing the query/service
 * modules never constructs a pool (or throws on a missing `DATABASE_URL`) at
 * module-load time — matching the pre-merge `@aomi-labs/auth` import behavior.
 * Still exactly one underlying `new Pool(...)`.
 */
export const pool = new Proxy({} as Pool, {
  get(_target, property) {
    const real = getPool();
    const value = Reflect.get(real, property, real);
    // Bind methods to the real pool so `this` is the Pool, not the Proxy.
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, property) {
    return Reflect.has(getPool(), property);
  },
}) as Pool;

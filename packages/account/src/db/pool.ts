import { Pool } from "pg";

/**
 * The single Postgres pool for the one shared database: BetterAuth's session
 * tables and the canonical account graph (`users` / `auth_providers` /
 * `public_keys`) live side by side, so a user the portal creates is
 * immediately found by the backend's find-only `DbUser::get`.
 *
 * Connection string comes from `DATABASE_URL` — the only DB env var in this
 * package. Never hard-code it; it carries the DB password. Node runtime only
 * (not Edge). Lazy: constructed on first use, so importing query/service
 * modules never requires the env (pg also defers connecting until the first
 * query).
 */
let cachedPool: Pool | undefined;

export function getPool(): Pool {
  if (cachedPool) return cachedPool;
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — the account package needs the one shared Postgres URL",
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

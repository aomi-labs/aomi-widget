import { Pool } from "pg";

/**
 * The single Postgres pool for this environment's database: BetterAuth's
 * session tables and the canonical account graph (`users` /
 * `auth_providers` / `public_keys`) live side by side, so a user the portal
 * creates is immediately found by the backend connected to the same
 * environment. Staging and production use different databases.
 *
 * Connection string comes from `DATABASE_URL` — the only DB env var in this
 * package. Never hard-code it; it carries the DB password. Node runtime only
 * (not Edge). Lazy: constructed on first use, so importing query/service
 * modules never requires the env (pg also defers connecting until the first
 * query).
 */
let cachedPool: Pool | undefined;

export type AccountPoolOptions = {
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
};

/**
 * Vercel can keep a separate warm function instance for each API route. A
 * four-connection pool per instance quickly exhausts Supabase's session-mode
 * client cap, so serverless instances must keep a single, short-lived client.
 */
export function resolveAccountPoolOptions(
  env: NodeJS.ProcessEnv = process.env,
): AccountPoolOptions {
  const isVercel = Boolean(env.VERCEL);
  return {
    max: isVercel ? 1 : 4,
    idleTimeoutMillis: isVercel ? 5_000 : 30_000,
    connectionTimeoutMillis: 10_000,
  };
}

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
    ...resolveAccountPoolOptions(),
  });
  return cachedPool;
}

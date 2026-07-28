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
 * Supabase's port 5432 pooler is session mode: every warm Vercel function can
 * consume one of its small fixed client allowance. Port 6543 is transaction
 * mode and multiplexes those short serverless queries instead. Preserve all
 * credentials and target identity while selecting the serverless-safe mode.
 */
export function resolveAccountConnectionString(
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (!env.VERCEL) return connectionString;

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    return connectionString;
  }
  if (
    url.hostname.endsWith(".pooler.supabase.com") &&
    (url.port === "" || url.port === "5432")
  ) {
    url.port = "6543";
    return url.toString();
  }
  return connectionString;
}

/**
 * Vercel can keep a separate warm function instance for each API route. A
 * transaction pooler is still shared infrastructure, so each instance keeps a
 * single, short-lived client instead of multiplying a larger local pool.
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
    connectionString: resolveAccountConnectionString(connectionString),
    application_name: "aomi-portal",
    ...resolveAccountPoolOptions(),
  });
  return cachedPool;
}

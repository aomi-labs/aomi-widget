import { Pool } from "pg";

/**
 * Postgres pool for the portal's account-graph reads/writes.
 *
 * The portal owns **resolve-or-create** of the canonical user (option (a):
 * FE read+write). It connects to the *same* database the Rust backend reads,
 * so a user the portal creates is immediately found by the backend's find-only
 * `DbUser::get` — see docs/topics/account-authentication/facts/service-identity.md
 * ("Account resolution — FE-driven, backend find-only").
 *
 * This is the stripped-down, in-repo precursor to arixoneth's Better-Auth
 * account graph: it targets the backend's existing `users` / `auth_identities`
 * tables (which forward-migrate into his `aomi_users` / `aomi_auth_identities`),
 * so the cutover is a store swap behind this module, not a contract change.
 *
 * Connection string comes from `AOMI_ACCOUNT_DATABASE_URL` (preferred) or
 * `AOMI_BACKEND_DATABASE_URL`, falling back to `DATABASE_URL` for the older
 * bff-unification stack. This keeps BetterAuth's own database separate from the
 * backend-readable account graph when both run in the same portal process.
 * Never hard-code this value; it carries the DB password. Node runtime only
 * (not Edge).
 */
let pool: Pool | undefined;

export function getPool(): Pool {
  if (pool) return pool;
  const connectionString = (
    process.env.AOMI_ACCOUNT_DATABASE_URL ??
    process.env.AOMI_BACKEND_DATABASE_URL ??
    process.env.DATABASE_URL
  )?.trim();
  if (!connectionString) {
    throw new Error(
      "AOMI_ACCOUNT_DATABASE_URL is not set — the portal account graph needs the backend's Postgres URL",
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

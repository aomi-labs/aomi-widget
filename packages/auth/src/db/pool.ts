import { Pool } from "pg";
import { readAccountAuthEnv } from "../better-auth/env";

let singleton: Pool | undefined;

export function getAccountPool(): Pool {
  if (!singleton) {
    const env = readAccountAuthEnv();
    singleton = new Pool({
      connectionString: env.databaseUrl,
      max: Number(process.env.AOMI_AUTH_DB_POOL_MAX ?? 5),
    });
  }
  return singleton;
}

export const pool = getAccountPool();

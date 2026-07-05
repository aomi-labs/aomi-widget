import pg from "pg";

const { Pool } = pg;

type GlobalWithPool = typeof globalThis & {
  __aomiBffPgPool?: pg.Pool;
};

function databaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  return url ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres";
}

export function getPool(): pg.Pool {
  const globalRef = globalThis as GlobalWithPool;
  if (!globalRef.__aomiBffPgPool) {
    globalRef.__aomiBffPgPool = new Pool({
      connectionString: databaseUrl(),
      max: Number(process.env.AOMI_BFF_DB_POOL_SIZE ?? "4"),
      ssl:
        process.env.AOMI_BFF_DB_SSL === "disable"
          ? false
          : { rejectUnauthorized: false },
    });
  }
  return globalRef.__aomiBffPgPool;
}

export type PgClient = pg.PoolClient;

export async function withTransaction<T>(
  fn: (client: PgClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

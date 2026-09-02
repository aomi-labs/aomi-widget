// @vitest-environment node
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { checkWidgetAuthRateLimit } from "./rate-limit";

const baseDatabaseUrl = process.env.AOMI_AUTH_TEST_DATABASE_URL?.trim();
const schemaName = `aomi_widget_rate_${randomUUID().replaceAll("-", "")}`;
const describePostgres = isLoopbackPostgres(baseDatabaseUrl)
  ? describe
  : describe.skip;

describePostgres("shared widget auth rate limit in PostgreSQL", () => {
  let adminPool: Pool;
  let pool: Pool;

  beforeAll(async () => {
    adminPool = new Pool({ connectionString: baseDatabaseUrl });
    await adminPool.query(`create schema "${schemaName}"`);
    await adminPool.query(
      `create table "${schemaName}".ba_verifications (
         id text primary key,
         identifier text not null,
         value text not null,
         expires_at timestamptz not null,
         created_at timestamptz not null default now(),
         updated_at timestamptz not null default now()
       )`,
    );
    pool = new Pool({
      connectionString: withSearchPath(baseDatabaseUrl!, schemaName),
      max: 16,
    });
    vi.spyOn(Math, "random").mockReturnValue(1);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await pool?.end();
    try {
      await adminPool?.query(`drop schema if exists "${schemaName}" cascade`);
    } finally {
      await adminPool?.end();
    }
  });

  it("serializes 61 concurrent increments and recovers in the next window", async () => {
    const now = new Date(Math.floor(Date.now() / 60_000) * 60_000 + 1_000);
    const input = {
      origin: "https://partner.example",
      clientAddress: "203.0.113.8",
      now,
    };
    const results = await Promise.all(
      Array.from({ length: 61 }, () =>
        checkWidgetAuthRateLimit({
          ...input,
          db: pool,
        }),
      ),
    );

    expect(results.filter(({ allowed }) => allowed)).toHaveLength(60);
    expect(results.filter(({ allowed }) => !allowed)).toHaveLength(1);
    await expect(
      pool.query<{ value: string }>(
        "select value from ba_verifications order by identifier",
      ),
    ).resolves.toMatchObject({ rows: [{ value: "61" }] });

    await expect(
      checkWidgetAuthRateLimit({
        ...input,
        now: new Date(now.getTime() + 60_000),
        db: pool,
      }),
    ).resolves.toEqual({ allowed: true });
  });

  it("reconciles duplicate legacy rows under the same lock", async () => {
    const now = new Date(Math.floor(Date.now() / 60_000) * 60_000 + 1_000);
    const origin = "https://duplicate.example";
    const clientAddress = "203.0.113.9";
    const windowStart = Math.floor(now.getTime() / 60_000) * 60_000;
    const identifier = `aomi:widget:rate:${createHash("sha256")
      .update(`${origin}\n${clientAddress}\n${windowStart}`)
      .digest("hex")}`;
    await pool.query(
      `insert into ba_verifications
         (id, identifier, value, expires_at, created_at, updated_at)
       values ($1, $2, '3', $4, now(), now()),
              ($3, $2, '5', $4, now(), now())`,
      [randomUUID(), identifier, randomUUID(), new Date(windowStart + 60_000)],
    );

    await expect(
      checkWidgetAuthRateLimit({ origin, clientAddress, now, db: pool }),
    ).resolves.toEqual({ allowed: true });
    await expect(
      pool.query<{ value: string }>(
        "select value from ba_verifications where identifier = $1",
        [identifier],
      ),
    ).resolves.toMatchObject({ rows: [{ value: "6" }] });
  });
});

function isLoopbackPostgres(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      (url.protocol === "postgres:" || url.protocol === "postgresql:") &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function withSearchPath(databaseUrl: string, schema: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-csearch_path=${schema}`);
  return url.toString();
}

import { describe, expect, it } from "vitest";
import {
  resolveAccountConnectionString,
  resolveAccountPoolOptions,
} from "../src/db/pool";

describe("resolveAccountConnectionString", () => {
  const sessionPooler =
    "postgresql://postgres.project:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres";

  it("uses Supabase transaction pooling for Vercel functions", () => {
    const resolved = resolveAccountConnectionString(sessionPooler, {
      VERCEL: "1",
    });

    expect(new URL(resolved).port).toBe("6543");
    expect(new URL(resolved).username).toBe("postgres.project");
  });

  it("also normalizes an implicit session-pooler port", () => {
    const resolved = resolveAccountConnectionString(
      "postgresql://postgres.project:secret@aws-0-us-east-1.pooler.supabase.com/postgres",
      { VERCEL: "1" },
    );

    expect(new URL(resolved).port).toBe("6543");
  });

  it("preserves local and persistent-runtime URLs", () => {
    expect(resolveAccountConnectionString(sessionPooler, {})).toBe(
      sessionPooler,
    );
  });

  it("does not rewrite another Postgres provider", () => {
    const connectionString =
      "postgresql://user:secret@db.example.com:5432/aomi";

    expect(
      resolveAccountConnectionString(connectionString, { VERCEL: "1" }),
    ).toBe(connectionString);
  });
});

describe("resolveAccountPoolOptions", () => {
  it("uses one short-lived connection per Vercel function instance", () => {
    expect(resolveAccountPoolOptions({ VERCEL: "1" })).toEqual({
      max: 1,
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    });
  });

  it("keeps the local and persistent-runtime pool defaults", () => {
    expect(resolveAccountPoolOptions({})).toEqual({
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
  });
});

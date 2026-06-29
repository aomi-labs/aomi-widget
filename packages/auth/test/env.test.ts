// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readAccountAuthEnv } from "../src/better-auth/env";

const DEV_BETTER_AUTH_SECRET =
  "dev-better-auth-secret-change-me-at-least-32-bytes";
const DEV_DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/aomi_auth";

describe("readAccountAuthEnv", () => {
  it("keeps local/test defaults available for auth package tests", () => {
    const env = readAccountAuthEnv({
      BETTER_AUTH_URL: "http://localhost:3001",
      NODE_ENV: "test",
    });

    expect(env.betterAuthSecret).toBe(DEV_BETTER_AUTH_SECRET);
    expect(env.databaseUrl).toBe(DEV_DATABASE_URL);
  });

  it("requires BetterAuth secret outside development and test", () => {
    expect(() =>
      readAccountAuthEnv({
        BETTER_AUTH_URL: "https://app.aomi.dev",
        DATABASE_URL: "postgresql://prod.example/aomi",
        NODE_ENV: "production",
      }),
    ).toThrow(
      "BETTER_AUTH_SECRET must be configured outside NODE_ENV=development/test",
    );
  });

  it("requires database URL outside development and test", () => {
    expect(() =>
      readAccountAuthEnv({
        BETTER_AUTH_SECRET: "prod-secret",
        BETTER_AUTH_URL: "https://app.aomi.dev",
        NODE_ENV: "production",
      }),
    ).toThrow(
      "DATABASE_URL must be configured outside NODE_ENV=development/test",
    );
  });

  it("rejects explicit known dev defaults outside development and test", () => {
    expect(() =>
      readAccountAuthEnv({
        BETTER_AUTH_SECRET: DEV_BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: "https://app.aomi.dev",
        DATABASE_URL: DEV_DATABASE_URL,
        NODE_ENV: "production",
      }),
    ).toThrow(
      "BETTER_AUTH_SECRET must be configured outside NODE_ENV=development/test",
    );
  });
});

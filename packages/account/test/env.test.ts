// @vitest-environment node

import { describe, expect, it } from "vitest";
import { readAccountAuthEnv } from "../src/better-auth/env";

const DEV_BETTER_AUTH_SECRET =
  "dev-better-auth-secret-change-me-at-least-32-bytes";
const TEST_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/aomi";

describe("readAccountAuthEnv", () => {
  it("keeps the local/test secret default but never defaults the database", () => {
    const env = readAccountAuthEnv({
      BETTER_AUTH_URL: "http://localhost:3001",
      DATABASE_URL: TEST_DATABASE_URL,
      NODE_ENV: "test",
    });

    expect(env.betterAuthSecret).toBe(DEV_BETTER_AUTH_SECRET);
    expect(env.databaseUrl).toBe(TEST_DATABASE_URL);
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

  it("requires the one shared database URL in every environment", () => {
    for (const NODE_ENV of ["development", "test", "production"]) {
      expect(() =>
        readAccountAuthEnv({
          BETTER_AUTH_SECRET: "prod-secret",
          BETTER_AUTH_URL: "https://app.aomi.dev",
          NODE_ENV,
        }),
      ).toThrow("DATABASE_URL is not set");
    }
  });

  it("rejects the known dev secret outside development and test", () => {
    expect(() =>
      readAccountAuthEnv({
        BETTER_AUTH_SECRET: DEV_BETTER_AUTH_SECRET,
        BETTER_AUTH_URL: "https://app.aomi.dev",
        DATABASE_URL: "postgresql://prod.example/aomi",
        NODE_ENV: "production",
      }),
    ).toThrow(
      "BETTER_AUTH_SECRET must be configured outside NODE_ENV=development/test",
    );
  });

  it("derives preview auth URLs from arbitrary Vercel branch URLs", () => {
    const env = readAccountAuthEnv({
      BETTER_AUTH_SECRET: "preview-secret",
      BETTER_AUTH_URL: "https://chat-staging.aomi.dev",
      DATABASE_URL: "postgresql://preview.example/aomi",
      NODE_ENV: "production",
      VERCEL_ENV: "preview",
      VERCEL_BRANCH_URL:
        "chat-portal-git-codex-merge-bff-betterauth-aomi-labs.vercel.app",
      VERCEL_URL: "chat-portal-random-deployment-id-aomi-labs.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "chat.aomi.dev",
      AOMI_AUTH_DOMAIN: "chat-staging.aomi.dev",
      AOMI_TRUSTED_ORIGINS:
        "https://chat-staging.aomi.dev, https://extra-preview.aomi.dev",
    });

    expect(env.betterAuthUrl).toBe(
      "https://chat-portal-git-codex-merge-bff-betterauth-aomi-labs.vercel.app",
    );
    expect(env.siweDomain).toBe(
      "chat-portal-git-codex-merge-bff-betterauth-aomi-labs.vercel.app",
    );
    expect(env.trustedOrigins).toEqual([
      "https://chat-staging.aomi.dev",
      "https://extra-preview.aomi.dev",
      "https://chat-portal-git-codex-merge-bff-betterauth-aomi-labs.vercel.app",
      "https://chat-portal-random-deployment-id-aomi-labs.vercel.app",
      "https://chat.aomi.dev",
    ]);
  });

  it("keeps explicit production auth URL while trusting Vercel aliases", () => {
    const env = readAccountAuthEnv({
      BETTER_AUTH_SECRET: "prod-secret",
      BETTER_AUTH_URL: "https://chat.aomi.dev",
      DATABASE_URL: "postgresql://prod.example/aomi",
      NODE_ENV: "production",
      VERCEL_ENV: "production",
      VERCEL_URL: "chat-portal-prod-deployment-aomi-labs.vercel.app",
      VERCEL_PROJECT_PRODUCTION_URL: "chat.aomi.dev",
    });

    expect(env.betterAuthUrl).toBe("https://chat.aomi.dev");
    expect(env.siweDomain).toBe("chat.aomi.dev");
    expect(env.trustedOrigins).toEqual([
      "https://chat.aomi.dev",
      "https://chat-portal-prod-deployment-aomi-labs.vercel.app",
    ]);
  });
});

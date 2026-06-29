import { describe, expect, it, vi } from "vitest";

vi.mock("../src/service/account-service", () => ({
  getOrCreateAomiUserForBetterAuthSession: vi.fn(),
}));

import {
  AOMI_BACKEND_JWT_ALLOWED_CLAIMS,
  AOMI_BACKEND_JWT_SCOPE,
  createAomiBackendJwtOptions,
  defineAomiBackendJwtPayload,
  getAomiBackendJwtSubject,
} from "../src/better-auth/backend-jwt";
import type { AccountAuthEnv } from "../src/better-auth/env";

const session = {
  user: {
    id: "better-user-1",
    email: "user@example.com",
    emailVerified: true,
    name: "Aomi User",
    image: "https://example.com/avatar.png",
  },
  session: {
    id: "better-session-1",
  },
};

function authEnv(overrides: Partial<AccountAuthEnv> = {}): AccountAuthEnv {
  return {
    betterAuthSecret: "test-secret-with-at-least-32-bytes",
    betterAuthUrl: "https://portal.aomi.dev",
    databaseUrl: "postgresql://example",
    backendJwtIssuer: "https://portal.aomi.dev",
    backendJwtAudience: "aomi-backend",
    backendJwtExpiresIn: "15m",
    backendJwtJwksPath: "/.well-known/jwks.json",
    backendJwtScope: AOMI_BACKEND_JWT_SCOPE,
    siweDomain: "portal.aomi.dev",
    trustedOrigins: ["https://portal.aomi.dev"],
    ...overrides,
  };
}

describe("Aomi backend JWT contract", () => {
  it("defines only the Aomi-specific custom claims Rust needs", async () => {
    const resolveUser = vi.fn(async () => ({ id: "aomi-user-1" }));

    const payload = await defineAomiBackendJwtPayload(session, {
      resolveUser,
    });

    expect(payload).toEqual({
      sid: "better-session-1",
      aomi_user_id: "aomi-user-1",
      scope: AOMI_BACKEND_JWT_SCOPE,
    });
    expect(Object.keys(payload).sort()).toEqual([
      "aomi_user_id",
      "scope",
      "sid",
    ]);
    expect(resolveUser).toHaveBeenCalledWith({
      betterAuthUserId: "better-user-1",
      email: "user@example.com",
      emailVerified: true,
      name: "Aomi User",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("keeps the standard and custom allowed-claim list tight", () => {
    expect(AOMI_BACKEND_JWT_ALLOWED_CLAIMS).toEqual([
      "iss",
      "aud",
      "sub",
      "iat",
      "exp",
      "nbf",
      "jti",
      "sid",
      "aomi_user_id",
      "scope",
    ]);
  });

  it("builds Better Auth JWT options for explicit token fetches", async () => {
    const resolveUser = vi.fn(async () => ({ id: "aomi-user-2" }));
    const options = createAomiBackendJwtOptions(
      authEnv({
        backendJwtIssuer: "https://auth.aomi.dev",
        backendJwtAudience: "rust-api",
        backendJwtExpiresIn: "10m",
        backendJwtJwksPath: "/jwks",
        backendJwtScope: "aomi:custom",
      }),
      { resolveUser },
    );

    expect(options.disableSettingJwtHeader).toBe(true);
    expect(options.jwks?.jwksPath).toBe("/jwks");
    expect(options.jwt?.issuer).toBe("https://auth.aomi.dev");
    expect(options.jwt?.audience).toBe("rust-api");
    expect(options.jwt?.expirationTime).toBe("10m");
    expect(await options.jwt?.getSubject?.(session)).toBe("aomi-user-2");
    expect(await options.jwt?.definePayload?.(session)).toEqual({
      sid: "better-session-1",
      aomi_user_id: "aomi-user-2",
      scope: "aomi:custom",
    });
  });

  it("uses the canonical Aomi user id as the JWT subject", async () => {
    expect(
      await getAomiBackendJwtSubject(session, {
        resolveUser: async () => ({ id: "aomi-user-3" }),
      }),
    ).toBe("aomi-user-3");
  });
});

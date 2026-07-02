// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  createDefaultProviderCredentialVerifiers,
  providerSessionUserSeed,
  verifyProviderCredential,
} from "../src/providers/account-credentials";
import { readAccountAuthEnv } from "../src/better-auth/env";
import type { AccountAuthEnv } from "../src/better-auth/env";

const baseEnv: AccountAuthEnv = {
  betterAuthSecret: "secret",
  betterAuthUrl: "http://localhost:3001",
  databaseUrl: "postgresql://postgres:postgres@localhost:5432/aomi_auth",
  siweDomain: "localhost:3001",
  trustedOrigins: ["http://localhost:3001"],
};

describe("verifyProviderCredential", () => {
  it("accepts a Privy provider verifier override", async () => {
    const verifier = vi.fn(async () => ({
      provider: "privy",
      walletAttestationProvider: "privy",
      token: {
        subject: "did:privy:user-1",
        expiresAt: 4_102_444_800,
        email: "privy@example.com",
        emailVerified: true,
        displayLabel: "Privy Person",
        providerMetadata: { source: "test" },
      },
    }));

    const result = await verifyProviderCredential(
      {
        provider: "privy",
        providerToken: "privy-token",
      },
      { verifiers: { privy: verifier } },
    );

    expect(verifier).toHaveBeenCalledWith({
      provider: "privy",
      tokenKind: "identity_token",
      providerToken: "privy-token",
    });
    expect(result).toEqual({
      provider: "privy",
      walletAttestationProvider: "privy",
      token: {
        subject: "did:privy:user-1",
        expiresAt: 4_102_444_800,
        email: "privy@example.com",
        emailVerified: true,
        displayLabel: "Privy Person",
        providerMetadata: { source: "test" },
      },
    });
  });

  it("can still build the default Privy/Para verifier registry from env", () => {
    const verifiers = createDefaultProviderCredentialVerifiers({
      ...baseEnv,
      privyAppId: "privy-app",
      paraAudience: "para-app",
      paraJwksUrl: "https://example.com/.well-known/jwks.json",
    });

    expect(verifiers.privy).toEqual(expect.any(Function));
    expect(verifiers.para).toEqual(expect.any(Function));
  });

  it("prefers the explicit Para JWT audience over the public API key", () => {
    const env = readAccountAuthEnv({
      BETTER_AUTH_URL: "http://localhost:3001",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/aomi_auth",
      PARA_JWT_AUDIENCE: "para-audience-uuid",
      NEXT_PUBLIC_PARA_API_KEY: "beta_public_api_key",
      BETTER_AUTH_SECRET: "test-secret",
      NODE_ENV: "test",
    });

    expect(env.paraAudience).toBe("para-audience-uuid");
  });
});

describe("providerSessionUserSeed", () => {
  it("uses verified provider email for BetterAuth session lookup", () => {
    expect(
      providerSessionUserSeed({
        provider: "privy",
        walletAttestationProvider: "privy",
        token: {
          subject: "did:privy:user-1",
          expiresAt: 4_102_444_800,
          email: "person@example.com",
          emailVerified: true,
          providerMetadata: {},
        },
      }),
    ).toEqual({
      email: "person@example.com",
      emailVerified: true,
      name: "person@example.com",
    });
  });

  it("uses a provider-subject email when provider email is unverified", () => {
    expect(
      providerSessionUserSeed({
        provider: "para",
        walletAttestationProvider: "para",
        token: {
          subject: "para:user/123",
          expiresAt: 4_102_444_800,
          email: "claimed@example.com",
          emailVerified: false,
          providerMetadata: {},
        },
      }),
    ).toEqual({
      email: "para-para_user_123@auth.aomi.local",
      emailVerified: false,
      name: "para user",
    });
  });

  it("uses provider display label for synthetic-email BetterAuth users", () => {
    expect(
      providerSessionUserSeed({
        provider: "privy",
        walletAttestationProvider: "privy",
        token: {
          subject: "did:privy:user-1",
          expiresAt: 4_102_444_800,
          displayLabel: "alice",
          providerMetadata: {},
        },
      }),
    ).toEqual({
      email: "privy-did_privy_user-1@auth.aomi.local",
      emailVerified: false,
      name: "alice",
    });
  });
});

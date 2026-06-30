// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  createDefaultProviderCredentialVerifiers,
  providerSessionUserSeed,
  verifyProviderCredential,
} from "../src/providers/account-credentials";
import { readAccountAuthEnv } from "../src/better-auth/env";
import type { AccountAuthEnv } from "../src/better-auth/env";
import type { AomiAccountCredential } from "../src/types";

const baseEnv: AccountAuthEnv = {
  betterAuthSecret: "secret",
  betterAuthUrl: "http://localhost:3001",
  databaseUrl: "postgresql://postgres:postgres@localhost:5432/aomi_auth",
  siweDomain: "localhost:3001",
  trustedOrigins: ["http://localhost:3001"],
};

describe("verifyProviderCredential", () => {
  it("rejects unsupported provider token credentials explicitly", async () => {
    await expect(
      verifyProviderCredential({
        kind: "token",
        provider: "custom-provider",
        token: "token",
      }),
    ).rejects.toThrow(
      "Unsupported account credential provider: custom-provider",
    );
  });

  it("rejects unsupported provider exchange credentials explicitly", async () => {
    await expect(
      verifyProviderCredential({
        provider: "custom-provider",
        providerToken: "token",
      } as AomiAccountCredential),
    ).rejects.toThrow(
      "Unsupported account credential provider: custom-provider",
    );
  });

  it("accepts a custom provider verifier registry", async () => {
    const verifier = vi.fn(async () => ({
      provider: "custom-provider",
      walletAttestationProvider: "custom-provider",
      token: {
        subject: "custom-user",
        expiresAt: 4_102_444_800,
        email: "custom@example.com",
        emailVerified: true,
        displayLabel: "Custom Person",
        providerMetadata: { source: "test" },
      },
    }));

    const result = await verifyProviderCredential(
      {
        kind: "token",
        provider: "custom-provider",
        token: "custom-token",
        keyId: "kid-1",
      },
      { verifiers: { "custom-provider": verifier } },
    );

    expect(verifier).toHaveBeenCalledWith({
      provider: "custom-provider",
      providerToken: "custom-token",
      keyId: "kid-1",
    });
    expect(result).toEqual({
      provider: "custom-provider",
      walletAttestationProvider: "custom-provider",
      token: {
        subject: "custom-user",
        expiresAt: 4_102_444_800,
        email: "custom@example.com",
        emailVerified: true,
        displayLabel: "Custom Person",
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

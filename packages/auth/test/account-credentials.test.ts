// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  createDefaultProviderCredentialVerifiers,
  verifyProviderCredential,
} from "../src/providers/account-credentials";
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
});

// @vitest-environment node

import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { verifyPrivyToken } from "../src/providers/privy";

describe("verifyPrivyToken", () => {
  it("extracts email from SDK-verified identity-token accounts", async () => {
    const secret = new TextEncoder().encode("test-secret");
    const token = await new SignJWT()
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("did:privy:alice")
      .setIssuer("privy.io")
      .setAudience("privy-app")
      .setExpirationTime("5m")
      .sign(secret);

    await expect(
      verifyPrivyToken(
        {
          token,
          tokenKind: "identity_token",
          appId: "privy-app",
        },
        {
          verifyAccessToken: async () => {
            throw new Error("unexpected access-token verification");
          },
          verifyIdentityToken: async () => ({
            id: "did:privy:alice",
            linked_accounts: [
              {
                type: "wallet",
                address: "0x1111111111111111111111111111111111111111",
              },
              {
                type: "google_oauth",
                email: "alice@example.com",
              },
            ],
          }),
        },
      ),
    ).resolves.toMatchObject({
      subject: "did:privy:alice",
      email: "alice@example.com",
      emailVerified: true,
      displayLabel: "alice@example.com",
    });
  });

  it("maps SDK-verified access-token claims", async () => {
    await expect(
      verifyPrivyToken(
        {
          token: "access-token",
          tokenKind: "access_token",
          appId: "privy-app",
        },
        {
          verifyAccessToken: async () => ({
            user_id: "did:privy:alice",
            session_id: "session-id",
            expiration: 4_102_444_800,
          }),
          verifyIdentityToken: async () => {
            throw new Error("unexpected identity-token verification");
          },
        },
      ),
    ).resolves.toMatchObject({
      subject: "did:privy:alice",
      sessionId: "session-id",
      expiresAt: 4_102_444_800,
    });
  });
});

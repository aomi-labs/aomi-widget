// @vitest-environment node

import { exportSPKI, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { makePrivyProvider } from "../src/mcp-approvals/providers/privy";
import {
  createPrivyAccessTokenVerifier,
  verifyPrivyToken,
  type VerifyPrivyAccessToken,
} from "../src/providers/privy";
import type { PendingAuth } from "../src/types";

const pending: PendingAuth = {
  stateToken: "state-token",
  userId: "aomi-user",
  application: null,
  walletProvider: "privy",
  initiator: "be",
  startedAt: 1,
};

const body = {
  state: pending.stateToken,
  access_token: "access-token",
  user_id: "did:privy:alice",
  wallet_id: "wallet-id",
  wallet_address: "0x1111111111111111111111111111111111111111",
};

describe("makePrivyProvider", () => {
  it("rejects a browser-reported user that does not match the signed subject", async () => {
    const provider = makePrivyProvider({
      appId: "privy-app",
      verifyAccessToken: async () => ({
        userId: "did:privy:bob",
        sessionId: "session-id",
        expiration: 123,
      }),
    });

    await expect(
      provider.callback({ pending, query: {}, body }),
    ).rejects.toThrow("user_id does not match verified token subject");
  });

  it("persists the verified expiration and session ID", async () => {
    const provider = makePrivyProvider({
      appId: "privy-app",
      verifyAccessToken: verifiedAlice,
    });

    const result = await provider.callback({ pending, query: {}, body });

    expect(result.expiresAt).toBe(123);
    expect(result.walletProviderSubject).toBe(body.user_id);
    expect(result.identityMetadata).toMatchObject({
      privy_session_id: "session-id",
    });
  });
});

describe("createPrivyAccessTokenVerifier", () => {
  it("verifies issuer, audience, signature, subject, session, and expiration", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const jwtVerificationKey = await exportSPKI(publicKey);
    const verify = createPrivyAccessTokenVerifier({
      appId: "privy-app",
      jwtVerificationKey,
    });
    const accessToken = await new SignJWT({ sid: "session-id" })
      .setProtectedHeader({ alg: "ES256" })
      .setSubject("did:privy:alice")
      .setIssuer("privy.io")
      .setAudience("privy-app")
      .setExpirationTime("5m")
      .sign(privateKey);

    await expect(verify(accessToken)).resolves.toMatchObject({
      userId: "did:privy:alice",
      sessionId: "session-id",
    });
  });
});

describe("verifyPrivyToken", () => {
  it("extracts email from stringified linked accounts on identity tokens", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const identityTokenVerificationKey = await exportSPKI(publicKey);
    const token = await new SignJWT({
      linked_accounts: JSON.stringify([
        {
          type: "wallet",
          address: "0x1111111111111111111111111111111111111111",
        },
        {
          type: "google_oauth",
          email: "alice@example.com",
        },
      ]),
    })
      .setProtectedHeader({ alg: "ES256" })
      .setSubject("did:privy:alice")
      .setIssuer("privy.io")
      .setAudience("privy-app")
      .setExpirationTime("5m")
      .sign(privateKey);

    await expect(
      verifyPrivyToken({
        token,
        tokenKind: "identity_token",
        appId: "privy-app",
        identityTokenVerificationKey,
      }),
    ).resolves.toMatchObject({
      subject: "did:privy:alice",
      email: "alice@example.com",
      emailVerified: true,
      displayLabel: "alice@example.com",
    });
  });
});

const verifiedAlice: VerifyPrivyAccessToken = async () => ({
  userId: "did:privy:alice",
  sessionId: "session-id",
  expiration: 123,
});

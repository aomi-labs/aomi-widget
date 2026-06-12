// @vitest-environment node

import { exportSPKI, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
  makePrivyJwtVerifier,
  makePrivyProvider,
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

  it("persists Solana wallet slots when the login page reports one", async () => {
    const provider = makePrivyProvider({
      appId: "privy-app",
      verifyAccessToken: verifiedAlice,
    });
    const solAddress = "So11111111111111111111111111111111111111112";
    const bodyWithWallets = {
      ...body,
      wallets: [
        { id: body.wallet_id, address: body.wallet_address, chain_type: "ethereum" },
        { id: "sol-wallet-id", address: solAddress, chain_type: "solana" },
      ],
    } as unknown as Record<string, string>;

    const result = await provider.callback({
      pending,
      query: {},
      body: bodyWithWallets,
    });

    expect(result.secrets).toMatchObject({
      PRIVY_WALLET_ID: body.wallet_id,
      PRIVY_WALLET_ADDRESS: body.wallet_address,
      PRIVY_SOLANA_WALLET_ID: "sol-wallet-id",
      PRIVY_SOLANA_WALLET_ADDRESS: solAddress,
    });
    expect(result.identityMetadata).toMatchObject({
      solana_wallet_id: "sol-wallet-id",
      solana_wallet_address: solAddress,
    });
  });

  it("omits Solana slots when no solana wallet is reported", async () => {
    const provider = makePrivyProvider({
      appId: "privy-app",
      verifyAccessToken: verifiedAlice,
    });

    const result = await provider.callback({ pending, query: {}, body });

    expect(result.secrets).not.toHaveProperty("PRIVY_SOLANA_WALLET_ID");
    expect(result.secrets).not.toHaveProperty("PRIVY_SOLANA_WALLET_ADDRESS");
  });

  it("rejects a malformed wallets array", async () => {
    const provider = makePrivyProvider({
      appId: "privy-app",
      verifyAccessToken: verifiedAlice,
    });
    const bodyWithBadWallets = {
      ...body,
      wallets: [{ id: "", address: "x", chain_type: "solana" }],
    } as unknown as Record<string, string>;

    await expect(
      provider.callback({ pending, query: {}, body: bodyWithBadWallets }),
    ).rejects.toThrow("wallets[0]");
  });

  it("rejects a non-base58 solana address", async () => {
    const provider = makePrivyProvider({
      appId: "privy-app",
      verifyAccessToken: verifiedAlice,
    });
    const bodyWithBadSol = {
      ...body,
      wallets: [
        { id: "sol-wallet-id", address: "0xnotbase58!!", chain_type: "solana" },
      ],
    } as unknown as Record<string, string>;

    await expect(
      provider.callback({ pending, query: {}, body: bodyWithBadSol }),
    ).rejects.toThrow("base58");
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

describe("makePrivyJwtVerifier", () => {
  it("verifies issuer, audience, signature, subject, session, and expiration", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const jwtVerificationKey = await exportSPKI(publicKey);
    const verify = makePrivyJwtVerifier({
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

const verifiedAlice: VerifyPrivyAccessToken = async () => ({
  userId: "did:privy:alice",
  sessionId: "session-id",
  expiration: 123,
});

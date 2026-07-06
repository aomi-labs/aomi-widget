// @vitest-environment node

import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyParaJwt } from "../src/providers/para";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyParaJwt", () => {
  it("extracts email and wallets from the nested Para session data claim", async () => {
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const jwk = await exportJWK(publicKey);
    const jwksUrl = "https://para.example/.well-known/jwks-test.json";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ keys: [{ ...jwk, kid: "para-kid", alg: "ES256" }] }),
      ),
    );
    const token = await new SignJWT({
      data: {
        email: "alice@example.com",
        identifier: "alice",
        authType: "OAUTH",
        oAuthMethod: "GOOGLE",
        wallets: [{ id: "evm-wallet", type: "EVM" }],
        connectedWallets: [{ id: "svm-wallet", type: "SOLANA" }],
      },
    })
      .setProtectedHeader({ alg: "ES256", kid: "para-kid" })
      .setSubject("para-user-1")
      .setAudience("para-app")
      .setExpirationTime("5m")
      .sign(privateKey);

    await expect(
      verifyParaJwt({
        token,
        expectedAudience: "para-app",
        jwksUrl,
        keyId: "para-kid",
      }),
    ).resolves.toMatchObject({
      subject: "para-user-1",
      email: "alice@example.com",
      emailVerified: true,
      displayLabel: "alice@example.com",
      wallets: [{ id: "evm-wallet", type: "EVM" }],
      connectedWallets: [{ id: "svm-wallet", type: "SOLANA" }],
    });
  });
});

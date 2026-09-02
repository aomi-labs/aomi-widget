// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";

import { signInWithOAuthDevice } from "../../src/cli/oauth-device-auth";

const ORIGIN = "https://chat.aomi.dev";
const ISSUER = `${ORIGIN}/api/auth`;
const AGENT_RESOURCE = `${ORIGIN}/v1/agent` as const;
const SUBJECT = "user-1";

let signingKey: CryptoKey;
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair("EdDSA");
  signingKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: "test-key" };
});

afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("CLI OAuth device authorization", () => {
  it("registers a public client and verifies the resource and subject-bound JWT", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    const accessToken = await signedAccessToken();
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(Response.json({ client_id: "public-client" }))
      .mockResolvedValueOnce(deviceCodeResponse())
      .mockResolvedValueOnce(tokenResponse(accessToken))
      .mockResolvedValueOnce(Response.json({ keys: [publicJwk] }));

    const resultPromise = signInWithOAuthDevice({
      baseUrl: ORIGIN,
      resource: AGENT_RESOURCE,
      scopes: ["agent:read", "offline_access"],
      expectedSubject: SUBJECT,
      fetch: fetchImpl,
      openBrowser: vi.fn(),
    });
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toMatchObject({
      clientId: "public-client",
      accessToken,
      refreshToken: "refresh-token",
      issuer: ISSUER,
      origin: ORIGIN,
      subject: SUBJECT,
      resource: AGENT_RESOURCE,
      scopes: ["agent:read", "offline_access"],
      tokenType: "Bearer",
    });
    const registration = JSON.parse(
      String(fetchImpl.mock.calls[1]?.[1]?.body),
    ) as Record<string, unknown>;
    expect(registration).toMatchObject({
      token_endpoint_auth_method: "none",
      resources: [AGENT_RESOURCE],
      scope: "agent:read offline_access",
    });
    expect(registration).not.toHaveProperty("redirect_uris");
    const deviceBody = new URLSearchParams(
      String(fetchImpl.mock.calls[2]?.[1]?.body),
    );
    expect(deviceBody.get("resource")).toBe(AGENT_RESOURCE);
    expect(String(fetchImpl.mock.calls[4]?.[0])).toBe(`${ISSUER}/jwks`);
  });

  it("rejects a correctly-signed access token for a different subject", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    const accessToken = await signedAccessToken("different-user");
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(deviceCodeResponse())
      .mockResolvedValueOnce(tokenResponse(accessToken))
      .mockResolvedValueOnce(Response.json({ keys: [publicJwk] }))
      .mockResolvedValueOnce(Response.json({ success: true }));

    const result = signInWithOAuthDevice({
      baseUrl: ORIGIN,
      clientId: "existing-client",
      resource: AGENT_RESOURCE,
      scopes: ["agent:read", "offline_access"],
      expectedSubject: SUBJECT,
      fetch: fetchImpl,
      openBrowser: vi.fn(),
    });
    const rejection = result.catch((error: unknown) => error);
    await vi.runAllTimersAsync();

    await expect(rejection).resolves.toMatchObject({
      code: "subject_mismatch",
    });
    expect(String(fetchImpl.mock.calls[4]?.[0])).toBe(
      `${ISSUER}/oauth2/revoke`,
    );
  });

  it("rejects malformed successful token responses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(metadataResponse())
      .mockResolvedValueOnce(deviceCodeResponse())
      .mockResolvedValueOnce(
        Response.json({
          refresh_token: "refresh-token",
          expires_in: 300,
          scope: "agent:read offline_access",
        }),
      )
      .mockResolvedValueOnce(Response.json({ success: true }));

    const result = signInWithOAuthDevice({
      baseUrl: ORIGIN,
      clientId: "existing-client",
      resource: AGENT_RESOURCE,
      scopes: ["agent:read", "offline_access"],
      expectedSubject: SUBJECT,
      fetch: fetchImpl,
      openBrowser: vi.fn(),
    });
    const rejection = result.catch((error: unknown) => error);
    await vi.runAllTimersAsync();

    await expect(rejection).resolves.toMatchObject({
      code: "invalid_response",
      message: "OAuth response is missing access_token",
    });
    expect(String(fetchImpl.mock.calls[3]?.[0])).toBe(
      `${ISSUER}/oauth2/revoke`,
    );
  });

  it.each([
    ["missing expires_in", { expires_in: undefined }, "invalid_response"],
    ["missing token_type", { token_type: undefined }, "invalid_response"],
    ["non-string scope", { scope: ["agent:read"] }, "invalid_response"],
    ["expanded scope", { scope: "agent:read admin:*" }, "invalid_scope"],
    [
      "wrong response resource",
      { resource: `${ORIGIN}/v1/pipeline` },
      "invalid_target",
    ],
  ])(
    "rejects %s and revokes the issued token",
    async (_name, overrides, code) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2030-01-01T00:00:00.000Z"));
      const accessToken = await signedAccessToken();
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(metadataResponse())
        .mockResolvedValueOnce(deviceCodeResponse())
        .mockResolvedValueOnce(tokenResponse(accessToken, overrides))
        .mockResolvedValueOnce(Response.json({ success: true }));

      const result = signInWithOAuthDevice({
        baseUrl: ORIGIN,
        clientId: "existing-client",
        resource: AGENT_RESOURCE,
        scopes: ["agent:read", "offline_access"],
        expectedSubject: SUBJECT,
        fetch: fetchImpl,
        openBrowser: vi.fn(),
      });
      const rejection = result.catch((error: unknown) => error);
      await vi.runAllTimersAsync();

      await expect(rejection).resolves.toMatchObject({ code });
      expect(String(fetchImpl.mock.calls[3]?.[0])).toBe(
        `${ISSUER}/oauth2/revoke`,
      );
    },
  );
});

function metadataResponse(): Response {
  return Response.json({
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/oauth2/authorize`,
    token_endpoint: `${ISSUER}/oauth2/token`,
    revocation_endpoint: `${ISSUER}/oauth2/revoke`,
    device_authorization_endpoint: `${ISSUER}/device/code`,
    jwks_uri: `${ISSUER}/jwks`,
  });
}

function deviceCodeResponse(): Response {
  return Response.json({
    device_code: "device-code",
    user_code: "AOMI-1234",
    verification_uri: `${ORIGIN}/device`,
    expires_in: 60,
    interval: 1,
  });
}

function tokenResponse(
  accessToken: string,
  overrides: Record<string, unknown> = {},
): Response {
  return Response.json({
    access_token: accessToken,
    refresh_token: "refresh-token",
    expires_in: 300,
    scope: "agent:read offline_access",
    token_type: "bearer",
    ...overrides,
  });
}

async function signedAccessToken(subject = SUBJECT): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
    .setIssuer(ISSUER)
    .setAudience(AGENT_RESOURCE)
    .setSubject(subject)
    .setExpirationTime(
      Math.floor(Date.parse("2031-01-01T00:00:00.000Z") / 1000),
    )
    .sign(signingKey);
}

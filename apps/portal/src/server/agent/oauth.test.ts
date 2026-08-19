import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSiweMessage } from "viem/siwe";

const authHandler = vi.hoisted(() => vi.fn());
const canonical = vi.hoisted(() => vi.fn());

vi.mock("@aomi-labs/account", () => ({
  getPool: vi.fn(),
  getOrCreateAomiUserForBetterAuthSession: canonical,
}));
vi.mock("@aomi-labs/account/better-auth", () => ({
  auth: { handler: authHandler },
  parseSiwsMessage: vi.fn(),
}));

import {
  exchangeOAuthToken,
  authorizeOAuthClient,
  oauthChallenge,
  oauthMetadata,
  validateOAuthAccessToken,
  type OAuthPersistence,
} from "./oauth";

function persistence(
  overrides: Partial<OAuthPersistence> = {},
): OAuthPersistence {
  return {
    client: vi.fn(async () => null),
    claimRefresh: vi.fn(async () => null),
    finishRefresh: vi.fn(async () => undefined),
    restoreRefresh: vi.fn(async () => undefined),
    issueFromSession: vi.fn(async () => null),
    access: vi.fn(async () => null),
    ...overrides,
  };
}

function tokenRequest(body: Record<string, string>): Request {
  return new Request("https://chat.aomi.dev/api/auth/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
}

describe("BFF OAuth issuer", () => {
  beforeEach(() => {
    authHandler.mockReset();
    canonical.mockReset();
  });

  it("advertises only canonical BFF endpoints and S256", async () => {
    const response = await oauthMetadata(
      new Request(
        "https://chat.aomi.dev/.well-known/oauth-authorization-server",
      ),
    );
    expect(await response.json()).toMatchObject({
      issuer: "https://chat.aomi.dev",
      authorization_endpoint: "https://chat.aomi.dev/api/auth/oauth2/authorize",
      token_endpoint: "https://chat.aomi.dev/api/auth/oauth2/token",
      code_challenge_methods_supported: ["S256"],
    });
  });

  it("prefixes authorization-code tokens from the one Better Auth authority", async () => {
    const delegate = vi.fn(async () =>
      Response.json({
        access_token: "raw_access",
        refresh_token: "raw_refresh",
        token_type: "Bearer",
        expires_in: 3600,
        scope: "agent offline_access",
      }),
    );
    const response = await exchangeOAuthToken(
      tokenRequest({
        grant_type: "authorization_code",
        code: "code",
        client_id: "client",
        redirect_uri: "https://client.test/callback",
        code_verifier: "verifier",
      }),
      { persistence: persistence(), delegate },
    );
    expect(await response.json()).toMatchObject({
      access_token: "aomi_at_raw_access",
      refresh_token: "aomi_rt_raw_refresh",
    });
  });

  it("requires S256, an allowed scope, and the exact Agent resource", async () => {
    authHandler.mockResolvedValue(new Response(null, { status: 302 }));
    const valid = new URL("https://chat.aomi.dev/api/auth/oauth2/authorize");
    valid.search = new URLSearchParams({
      response_type: "code",
      client_id: "client",
      redirect_uri: "https://client.test/callback",
      code_challenge: "challenge",
      code_challenge_method: "S256",
      scope: "agent",
      resource: "https://chat.aomi.dev/v1/agent",
      state: "state",
    }).toString();
    expect((await authorizeOAuthClient(new Request(valid))).status).toBe(302);
    expect(authHandler).toHaveBeenCalledOnce();

    valid.searchParams.set("code_challenge_method", "plain");
    expect((await authorizeOAuthClient(new Request(valid))).status).toBe(400);
    valid.searchParams.set("code_challenge_method", "S256");
    valid.searchParams.set("resource", "https://other.test/v1/agent");
    expect((await authorizeOAuthClient(new Request(valid))).status).toBe(400);
  });

  it("atomically claims a refresh token and makes replay fail closed", async () => {
    const finishRefresh = vi.fn(async () => undefined);
    const store = persistence({
      claimRefresh: vi
        .fn()
        .mockResolvedValueOnce({ id: "old", claim: "rotating_claim" })
        .mockResolvedValueOnce(null),
      finishRefresh,
    });
    const delegate = vi.fn(async (_request, _path, body) => {
      expect(body.refresh_token).toBe("rotating_claim");
      return Response.json({
        access_token: "next_access",
        refresh_token: "next_refresh",
        expires_in: 3600,
        scope: "agent offline_access",
      });
    });
    const body = {
      grant_type: "refresh_token",
      refresh_token: "aomi_rt_old_refresh",
      client_id: "client",
    };
    const first = await exchangeOAuthToken(tokenRequest(body), {
      persistence: store,
      delegate,
    });
    const replay = await exchangeOAuthToken(tokenRequest(body), {
      persistence: store,
      delegate,
    });

    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({
      refresh_token: "aomi_rt_next_refresh",
    });
    expect(replay.status).toBe(401);
    expect(finishRefresh).toHaveBeenCalledWith({
      id: "old",
      claim: "rotating_claim",
    });
    expect(delegate).toHaveBeenCalledOnce();
  });

  it("bridges an approved device session into OAuth then discards the session", async () => {
    const issueFromSession = vi.fn(async () => ({
      access_token: "device_access",
      refresh_token: "device_refresh",
      token_type: "Bearer",
      expires_in: 3600,
      scope: "agent offline_access",
    }));
    const response = await exchangeOAuthToken(
      tokenRequest({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        device_code: "device",
        client_id: "cli",
      }),
      {
        persistence: persistence({ issueFromSession }),
        delegate: vi.fn(async () =>
          Response.json({
            access_token: "temporary_better_auth_session",
            scope: "agent offline_access",
          }),
        ),
      },
    );
    expect(issueFromSession).toHaveBeenCalledWith({
      sessionToken: "temporary_better_auth_session",
      clientId: "cli",
      scopes: ["agent", "offline_access"],
    });
    expect(await response.json()).toMatchObject({
      access_token: "aomi_at_device_access",
    });
  });

  it("denies direct wallet grants unless the client was explicitly permitted", async () => {
    const delegate = vi.fn();
    const response = await exchangeOAuthToken(
      tokenRequest({
        grant_type: "urn:aomi:params:oauth:grant-type:siwe",
        client_id: "unpermitted",
        challenge: "challenge",
        signature: "signature",
        scope: "agent",
        resource: "https://chat.aomi.dev/v1/agent",
      }),
      { persistence: persistence(), delegate },
    );
    expect(response.status).toBe(401);
    expect(delegate).not.toHaveBeenCalled();
  });

  it("allows a consumed SIWE proof only for an explicitly permitted client", async () => {
    const issueFromSession = vi.fn(async () => ({
      access_token: "direct_access",
      token_type: "Bearer",
      expires_in: 3600,
      scope: "agent",
    }));
    const challenge = createSiweMessage({
      address: "0x0000000000000000000000000000000000000001",
      chainId: 1,
      domain: "chat.aomi.dev",
      nonce: "12345678",
      uri: "https://chat.aomi.dev",
      version: "1",
    });
    const delegate = vi.fn(async () =>
      Response.json({ token: "temporary_session" }),
    );
    const response = await exchangeOAuthToken(
      tokenRequest({
        grant_type: "urn:aomi:params:oauth:grant-type:siwe",
        client_id: "permitted",
        challenge,
        signature: "0xproof",
        scope: "agent",
        resource: "https://chat.aomi.dev/v1/agent",
      }),
      {
        persistence: persistence({
          client: vi.fn(async () => ({
            clientId: "permitted",
            disabled: false,
            directWalletGrants: ["siwe"],
          })),
          issueFromSession,
        }),
        delegate,
      },
    );
    expect(delegate).toHaveBeenCalledWith(
      expect.any(Request),
      "/siwe/verify",
      expect.objectContaining({
        walletAddress: "0x0000000000000000000000000000000000000001",
        chainId: 1,
      }),
    );
    expect(issueFromSession).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({
      access_token: "aomi_at_direct_access",
    });
  });

  it("resolves a scoped public token to one canonical account", async () => {
    canonical.mockResolvedValue({ id: "canonical_user" });
    const store = persistence({
      access: vi.fn(async () => ({
        betterAuthUserId: "ba_user",
        email: "user@example.test",
        emailVerified: true,
        name: "User",
        image: null,
        clientId: "client",
        scopes: ["agent"],
      })),
    });
    await expect(
      validateOAuthAccessToken("aomi_at_raw", store),
    ).resolves.toEqual({
      canonicalUserId: "canonical_user",
      clientId: "client",
      scopes: ["agent"],
    });
    await expect(validateOAuthAccessToken("raw", store)).resolves.toBeNull();
  });

  it("returns the protected-resource challenge without cookie fallback", async () => {
    const response = oauthChallenge(
      new Request("https://chat.aomi.dev/v1/agent/mcp"),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "/.well-known/oauth-protected-resource/v1/agent",
    );
  });
});

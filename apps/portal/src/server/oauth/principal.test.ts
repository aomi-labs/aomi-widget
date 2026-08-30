import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyAccessTokenRequest: vi.fn(),
  getBetterAuthSession: vi.fn(),
  canonicalAccount: vi.fn(),
  e2eCanonicalUserId: vi.fn(),
}));

vi.mock("@aomi-labs/account/better-auth", () => ({
  auth: {},
  AOMI_CANONICAL_USER_CLAIM: "https://aomi.dev/canonical_user_id",
  AOMI_PRINCIPAL_CLASS_CLAIM: "https://aomi.dev/principal_class",
}));
vi.mock("@better-auth/oauth-provider/resource-client", () => ({
  oauthProviderResourceClient: () => ({
    getActions: () => ({
      verifyAccessTokenRequest: mocks.verifyAccessTokenRequest,
    }),
  }),
}));
vi.mock("@aomi-labs/account/account", () => ({
  getOrCreateAomiUserForBetterAuthSession: mocks.canonicalAccount,
}));
vi.mock("@portal/server/account/session", () => ({
  getBetterAuthSession: mocks.getBetterAuthSession,
}));
vi.mock("@portal/server/e2e-wallet", () => ({
  resolveE2ECanonicalUserId: mocks.e2eCanonicalUserId,
}));
vi.mock("./features", () => ({
  isGuestRestEnabled: () => true,
}));
vi.mock("./resources", () => ({
  aomiOAuthResources: () => ({ issuer: "https://portal.example" }),
}));

import {
  ApiPrincipalError,
  isOAuthCredential,
  principalFromOAuthClaims,
  resolveApiPrincipal,
} from "./principal";

const resource = "https://portal.example/v1/agent" as const;
const claims = {
  sub: "ba-user",
  scope: "agent:read agent:write",
  client_id: "client-1",
  jti: "grant-1",
  "https://aomi.dev/canonical_user_id": "canonical-user",
  "https://aomi.dev/principal_class": "user",
};

describe("public OAuth and session principal resolution", () => {
  beforeEach(() => {
    mocks.verifyAccessTokenRequest.mockReset();
    mocks.getBetterAuthSession.mockReset().mockResolvedValue(null);
    mocks.e2eCanonicalUserId.mockReset().mockReturnValue(null);
    mocks.canonicalAccount
      .mockReset()
      .mockResolvedValue({ id: "canonical-user" });
  });

  it("classifies JWT Bearer and DPoP credentials without confusing session bearers", () => {
    expect(
      isOAuthCredential(
        new Request(resource, {
          headers: { authorization: "Bearer one.two.three" },
        }),
      ),
    ).toBe(true);
    expect(
      isOAuthCredential(
        new Request(resource, { headers: { authorization: "DPoP token" } }),
      ),
    ).toBe(true);
    expect(
      isOAuthCredential(
        new Request(resource, {
          headers: { authorization: "Bearer opaque-session" },
        }),
      ),
    ).toBe(false);
  });

  it("passes exact audience, scope, and DPoP policy to Better Auth", async () => {
    mocks.verifyAccessTokenRequest.mockResolvedValue(claims);
    const request = new Request(resource, {
      headers: { authorization: "Bearer one.two.three" },
    });
    await expect(
      resolveApiPrincipal({
        request,
        resource,
        requiredScopes: ["agent:read"],
        sessionScopes: ["agent:read"],
      }),
    ).resolves.toMatchObject({
      canonicalUserId: "canonical-user",
      clientId: "client-1",
      authSource: "oauth",
    });
    expect(mocks.verifyAccessTokenRequest).toHaveBeenCalledWith(request, {
      verifyOptions: { audience: resource },
      requiredScopes: ["agent:read"],
      dpop: { signingAlgorithms: ["ES256", "EdDSA"] },
    });
  });

  it("never falls back to a cookie session after invalid OAuth", async () => {
    mocks.verifyAccessTokenRequest.mockRejectedValue({ status: 401 });
    mocks.getBetterAuthSession.mockResolvedValue({
      user: { id: "cookie-user" },
    });
    await expect(
      resolveApiPrincipal({
        request: new Request(resource, {
          headers: { authorization: "Bearer invalid.jwt.value" },
        }),
        resource,
        requiredScopes: ["agent:read"],
        sessionScopes: ["agent:read"],
      }),
    ).rejects.toMatchObject({ code: "invalid_token", status: 401 });
    expect(mocks.getBetterAuthSession).not.toHaveBeenCalled();
  });

  it("rejects opaque legacy bearer sessions", async () => {
    await expect(
      resolveApiPrincipal({
        request: new Request(resource, {
          headers: { authorization: "Bearer opaque-session" },
        }),
        resource,
        requiredScopes: ["agent:read"],
        sessionScopes: ["agent:read"],
      }),
    ).rejects.toMatchObject({ code: "invalid_token", status: 401 });
    expect(mocks.getBetterAuthSession).not.toHaveBeenCalled();
  });

  it("rejects canonical identity disagreement and elevated guest scopes", async () => {
    mocks.canonicalAccount.mockResolvedValueOnce({ id: "different-user" });
    await expect(
      principalFromOAuthClaims(claims, resource),
    ).rejects.toBeInstanceOf(ApiPrincipalError);

    mocks.canonicalAccount.mockResolvedValueOnce({ id: "canonical-user" });
    await expect(
      principalFromOAuthClaims(
        {
          ...claims,
          scope: "agent:read custody:delegate",
          "https://aomi.dev/principal_class": "guest",
        },
        resource,
      ),
    ).rejects.toMatchObject({ code: "insufficient_scope", status: 403 });
  });

  it("requires same-origin CSRF for mutating cookie sessions", async () => {
    mocks.getBetterAuthSession.mockResolvedValue({
      user: {
        id: "ba-user",
        email: "user@example.com",
        emailVerified: true,
        name: "Aomi User",
        image: null,
        isAnonymous: false,
      },
      session: { token: "secret" },
    });
    await expect(
      resolveApiPrincipal({
        request: new Request(resource, { method: "POST" }),
        resource,
        requiredScopes: ["agent:write"],
        sessionScopes: ["agent:write"],
      }),
    ).rejects.toMatchObject({ code: "csrf_failed", status: 403 });

    await expect(
      resolveApiPrincipal({
        request: new Request(resource, {
          method: "POST",
          headers: { origin: "https://portal.example" },
        }),
        resource,
        requiredScopes: ["agent:write"],
        sessionScopes: ["agent:write"],
      }),
    ).resolves.toMatchObject({ authSource: "session" });
  });

  it("resolves the signed local E2E session at the principal boundary", async () => {
    mocks.e2eCanonicalUserId.mockReturnValue("e2e-user");
    await expect(
      resolveApiPrincipal({
        request: new Request(resource, {
          method: "POST",
          headers: { origin: "https://portal.example" },
        }),
        resource,
        requiredScopes: ["agent:write"],
        sessionScopes: ["agent:read", "agent:write"],
      }),
    ).resolves.toEqual({
      canonicalUserId: "e2e-user",
      scopes: ["agent:read", "agent:write"],
      resource,
      authSource: "session",
      principalClass: "user",
      sid: "e2e-session",
    });
    expect(mocks.getBetterAuthSession).not.toHaveBeenCalled();
  });
});

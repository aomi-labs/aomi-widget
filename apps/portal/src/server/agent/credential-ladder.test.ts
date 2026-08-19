import { describe, expect, it, vi } from "vitest";

import {
  PublicCredentialError,
  resolvePublicPrincipal,
  type CredentialValidators,
} from "./credential-ladder";

function validators(): CredentialValidators {
  return {
    oauth: vi.fn(async (token) =>
      token === "aomi_at_valid"
        ? { canonicalUserId: "user-1", clientId: "cli", scopes: ["agent"] }
        : null,
    ),
    cookie: vi.fn(async (request) =>
      request.headers.get("cookie") === "better-auth.session_token=valid"
        ? {
            canonicalUserId: "user-cookie",
            clientId: "portal",
            scopes: ["agent", "sessions"],
          }
        : null,
    ),
    guest: vi.fn(async (session) =>
      session === "sess_1234567890abcdef"
        ? { sessionId: session, applicationId: 9n, expiresAt: 2_000_000_000 }
        : null,
    ),
  };
}

describe("public credential ladder", () => {
  it("accepts a scoped OAuth bearer before cookie and guest credentials", async () => {
    const adapters = validators();
    const principal = await resolvePublicPrincipal(
      new Request("https://portal.test/v1/agent/chat", {
        headers: {
          authorization: "Bearer aomi_at_valid",
          cookie: "better-auth.session_token=valid",
          "aomi-guest-session": "sess_1234567890abcdef",
        },
      }),
      adapters,
      { requiredScopes: ["agent"] },
    );
    expect(principal).toMatchObject({ kind: "account", clientId: "cli" });
    expect(adapters.cookie).not.toHaveBeenCalled();
    expect(adapters.guest).not.toHaveBeenCalled();
  });

  it("fails closed on a malformed or invalid bearer without cookie fallback", async () => {
    const adapters = validators();
    await expect(
      resolvePublicPrincipal(
        new Request("https://portal.test/v1/agent/chat", {
          headers: {
            authorization: "Bearer invalid",
            cookie: "better-auth.session_token=valid",
          },
        }),
        adapters,
      ),
    ).rejects.toMatchObject<Partial<PublicCredentialError>>({
      code: "invalid_authorization",
      status: 401,
    });
    expect(adapters.cookie).not.toHaveBeenCalled();
  });

  it("enforces scopes and keeps MCP account-only", async () => {
    await expect(
      resolvePublicPrincipal(
        new Request("https://portal.test/v1/agent/mcp", {
          headers: { authorization: "Bearer aomi_at_valid" },
        }),
        validators(),
        { requiredScopes: ["agent", "sessions"], allowGuest: false },
      ),
    ).rejects.toMatchObject({ code: "insufficient_scope", status: 403 });

    await expect(
      resolvePublicPrincipal(
        new Request("https://portal.test/v1/agent/mcp", {
          headers: { "aomi-guest-session": "sess_1234567890abcdef" },
        }),
        validators(),
        { allowGuest: false },
      ),
    ).rejects.toMatchObject({ code: "invalid_guest_session" });
  });

  it("falls through from no cookie to a validated guest only when allowed", async () => {
    await expect(
      resolvePublicPrincipal(
        new Request("https://portal.test/v1/agent/chat", {
          headers: { "aomi-guest-session": "sess_1234567890abcdef" },
        }),
        validators(),
        { allowGuest: true },
      ),
    ).resolves.toEqual({
      kind: "guest",
      sessionId: "sess_1234567890abcdef",
      applicationId: 9n,
      expiresAt: 2_000_000_000,
    });
  });
});

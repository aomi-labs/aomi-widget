import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ mint: vi.fn() }));

vi.mock("@aomi-labs/account", () => ({
  portalService: () => ({ mint: mocks.mint }),
}));

import { mintInternalPrincipal } from "./internal-principal";

describe("BFF-minted internal principals", () => {
  beforeEach(() => {
    mocks.mint.mockReset().mockResolvedValue({
      accessToken: "signed-internal-principal",
      expiresAt: 1_300,
    });
  });

  it("normalizes account scopes and never carries a public credential", async () => {
    await expect(
      mintInternalPrincipal(
        {
          kind: "account",
          canonicalUserId: "user-1",
          clientId: "cli",
          scopes: ["sessions", "agent", "agent"],
        },
        { now: 1_000, jti: "jti-account" },
      ),
    ).resolves.toEqual({
      bearer: "signed-internal-principal",
      expiresAt: 1_300,
    });
    expect(mocks.mint).toHaveBeenCalledWith({
      role: "user",
      subject: "user-1",
      audience: "aomi-backend",
      ttlSeconds: 300,
      claims: {
        principal_kind: "account",
        client_id: "cli",
        scopes: ["agent", "sessions"],
        jti: "jti-account",
      },
    });
  });

  it("binds a guest to one app and external signing for at most five minutes", async () => {
    await mintInternalPrincipal(
      {
        kind: "guest",
        sessionId: "sess_1234567890abcdef",
        applicationId: BigInt("9223372036854775807"),
        expiresAt: 1_120,
      },
      { now: 1_000, jti: "jti-guest" },
    );
    expect(mocks.mint).toHaveBeenCalledWith({
      role: "guest",
      subject: "guest:sess_1234567890abcdef",
      audience: "aomi-backend",
      ttlSeconds: 120,
      claims: {
        principal_kind: "guest",
        session_id: "sess_1234567890abcdef",
        application_id: "9223372036854775807",
        custody: "external_signing",
        scopes: ["agent:chat"],
        jti: "jti-guest",
      },
    });
  });
});

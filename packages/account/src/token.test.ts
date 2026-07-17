import { describe, expect, it, vi } from "vitest";

// Mint + session resolution are exercised elsewhere; here we isolate the route's
// own logic (gate on a session, the response shape, 500 vs 401 on mint failure).
vi.mock("./bearer", () => ({ mintAccountBearer: vi.fn() }));

import { mintAccountBearer } from "./bearer";
import { createBearerTokenRoute } from "./token";

const mintMock = vi.mocked(mintAccountBearer);

const fakeRequest = {} as Parameters<
  ReturnType<typeof createBearerTokenRoute>
>[0];

describe("createBearerTokenRoute", () => {
  it("401s when no session is present", async () => {
    const resolveCanonicalUserId = vi.fn(async () => null);
    const GET = createBearerTokenRoute({ resolveCanonicalUserId });

    const response = await GET(fakeRequest);

    expect(response.status).toBe(401);
    expect(resolveCanonicalUserId).toHaveBeenCalledWith(fakeRequest);
    expect(mintMock).not.toHaveBeenCalled();
  });

  it("mints a bearer for the sessioned canonical user", async () => {
    const resolveCanonicalUserId = vi.fn(async () => "user-123");
    mintMock.mockResolvedValue({ bearer: "BEARER", expiresAt: 1_000 });
    const GET = createBearerTokenRoute({ resolveCanonicalUserId });

    const response = await GET(fakeRequest);

    expect(mintMock).toHaveBeenCalledWith("user-123");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      bearer: "BEARER",
      expires_at: 1_000,
    });
  });

  it("500s (not 401) when minting fails for a real session", async () => {
    const resolveCanonicalUserId = vi.fn(async () => "user-789");
    mintMock.mockRejectedValue(new Error("signing key missing"));
    const GET = createBearerTokenRoute({ resolveCanonicalUserId });

    const response = await GET(fakeRequest);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "signing key missing",
    });
  });
});

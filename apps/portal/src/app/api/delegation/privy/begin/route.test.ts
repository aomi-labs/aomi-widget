// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const canonicalUserId = vi.hoisted(() => vi.fn());

vi.mock("@portal/server/canonical-session", () => ({
  resolveCanonicalUserId: canonicalUserId,
}));

vi.mock("@aomi-labs/account/bearer", () => ({
  mintAccountBearer: vi.fn(async () => ({
    bearer: "test-account-bearer",
    expiresAt: 0,
  })),
}));

import { POST } from "./route";

describe("Privy delegation begin BFF", () => {
  afterEach(() => {
    canonicalUserId.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("forwards the begin request through the authenticated backend proxy", async () => {
    canonicalUserId.mockResolvedValue("user-123");
    vi.stubEnv("AOMI_PROXY_BACKEND_URL", "https://api.test.aomi.dev");
    const fetchMock = vi.fn(async () =>
      Response.json({ auth_url: "https://portal.test/auth/privy?state=abc" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("https://portal.test/api/delegation/privy/begin", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-thread-id": "thread-123",
        },
        body: JSON.stringify({ wallet_family: "evm" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      auth_url: "https://portal.test/auth/privy?state=abc",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/auth/privy/begin", "https://api.test.aomi.dev/"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ wallet_family: "evm" }),
      }),
    );
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("authorization")).toBe("Bearer test-account-bearer");
    expect(headers.get("x-thread-id")).toBe("thread-123");
  });

  it("requires a Portal session before forwarding", async () => {
    canonicalUserId.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new NextRequest("https://portal.test/api/delegation/privy/begin", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

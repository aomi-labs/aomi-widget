import { describe, expect, it, vi } from "vitest";

// Mint + session-verify are exercised elsewhere; here we isolate the route's
// own logic (where it reads the session from, and the response shape).
vi.mock("./bearer", () => ({ mintAccountBearer: vi.fn() }));
vi.mock("./session", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./session")>();
  return { ...actual, readSessionCookie: vi.fn() };
});

import { mintAccountBearer } from "./bearer";
import { readSessionCookie, SESSION_COOKIE } from "./session";
import { createBearerTokenRoute } from "./token";

const mintMock = vi.mocked(mintAccountBearer);
const readSessionMock = vi.mocked(readSessionCookie);

function fakeRequest(opts: { authorization?: string; cookie?: string }) {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization"
          ? (opts.authorization ?? null)
          : null,
    },
    cookies: {
      get: (name: string) =>
        name === SESSION_COOKIE && opts.cookie
          ? { value: opts.cookie }
          : undefined,
    },
  } as unknown as Parameters<ReturnType<typeof createBearerTokenRoute>>[0];
}

describe("createBearerTokenRoute", () => {
  it("401s when no session is present", async () => {
    readSessionMock.mockResolvedValue(null);
    const GET = createBearerTokenRoute();

    const response = await GET(fakeRequest({}));

    expect(response.status).toBe(401);
    expect(mintMock).not.toHaveBeenCalled();
  });

  it("mints a bearer from the `Authorization: Bearer <session>` header", async () => {
    readSessionMock.mockResolvedValue("user-123");
    mintMock.mockResolvedValue({ bearer: "BEARER", expiresAt: 1_000 });
    const GET = createBearerTokenRoute();

    const response = await GET(
      fakeRequest({ authorization: "Bearer session-jwt" }),
    );

    // The session is read from the bearer header (arixon's bearer()-plugin shape).
    expect(readSessionMock).toHaveBeenCalledWith("session-jwt");
    expect(mintMock).toHaveBeenCalledWith("user-123");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      bearer: "BEARER",
      expires_at: 1_000,
    });
  });

  it("falls back to the aomi_session cookie when no auth header is set", async () => {
    readSessionMock.mockResolvedValue("user-456");
    mintMock.mockResolvedValue({ bearer: "BEARER2", expiresAt: 2_000 });
    const GET = createBearerTokenRoute();

    const response = await GET(fakeRequest({ cookie: "cookie-jwt" }));

    expect(readSessionMock).toHaveBeenCalledWith("cookie-jwt");
    expect(response.status).toBe(200);
  });

  it("500s (not 401) when minting fails for a real session", async () => {
    readSessionMock.mockResolvedValue("user-789");
    mintMock.mockRejectedValue(new Error("signing key missing"));
    const GET = createBearerTokenRoute();

    const response = await GET(fakeRequest({ authorization: "Bearer s" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "signing key missing",
    });
  });
});

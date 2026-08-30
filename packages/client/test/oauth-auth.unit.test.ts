import { describe, expect, it, vi } from "vitest";

import { wrapFetchWithPublicApiAuthorization } from "../src/client";
import { createGuestSessionProvider } from "../src/guest-auth";
import type { AomiOAuthTokenRequest } from "../src/authorization";

describe("public API OAuth transport", () => {
  it("requests the exact Agent resource and route scope", async () => {
    const upstream = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(new Headers(init?.headers).get("authorization")).toBe(
          "Bearer agent-token",
        );
        return new Response("{}", { status: 200 });
      },
    );
    const oauth = vi.fn(async (request: AomiOAuthTokenRequest) => ({
      accessToken: "agent-token",
      expiresAt: Date.now() + 60_000,
      resource: request.resource,
      scopes: request.scopes,
    }));
    const authorized = wrapFetchWithPublicApiAuthorization({
      fetch: upstream as typeof fetch,
      baseUrl: "https://chat.aomi.dev",
      oauth,
    });

    await authorized("https://chat.aomi.dev/v1/agent/sessions", {
      method: "GET",
    });

    expect(oauth).toHaveBeenCalledWith({
      resource: "https://chat.aomi.dev/v1/agent",
      scopes: ["agent:read"],
      forceRefresh: false,
    });
  });

  it("retries once with a refreshed token after a token failure", async () => {
    const upstream = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const oauth = vi.fn(async (request: AomiOAuthTokenRequest) => ({
      accessToken: request.forceRefresh ? "fresh" : "stale",
      expiresAt: Date.now() + 60_000,
      resource: request.resource,
      scopes: request.scopes,
    }));
    const authorized = wrapFetchWithPublicApiAuthorization({
      fetch: upstream as typeof fetch,
      baseUrl: "https://chat.aomi.dev",
      oauth,
    });

    expect(
      (
        await authorized("https://chat.aomi.dev/v1/pipeline/tool-calls", {
          method: "POST",
        })
      ).status,
    ).toBe(200);
    expect(oauth).toHaveBeenLastCalledWith(
      expect.objectContaining({ forceRefresh: true }),
    );
    expect(upstream).toHaveBeenCalledTimes(2);
  });

  it("answers a DPoP nonce challenge with a newly signed proof", async () => {
    const upstream = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 401,
          headers: { "dpop-nonce": "nonce-1" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    const dpopProof = vi.fn(
      async ({ nonce }: { nonce?: string }) => `proof:${nonce ?? "initial"}`,
    );
    const oauth = vi.fn(async (request: AomiOAuthTokenRequest) => ({
      accessToken: "dpop-token",
      expiresAt: Date.now() + 60_000,
      resource: request.resource,
      scopes: request.scopes,
      tokenType: "DPoP" as const,
      dpopProof,
    }));
    const authorized = wrapFetchWithPublicApiAuthorization({
      fetch: upstream as typeof fetch,
      baseUrl: "https://chat.aomi.dev",
      oauth,
    });

    await authorized("https://chat.aomi.dev/v1/agent/chat", {
      method: "POST",
    });

    expect(dpopProof).toHaveBeenCalledTimes(2);
    expect(dpopProof).toHaveBeenLastCalledWith(
      expect.objectContaining({ nonce: "nonce-1" }),
    );
    expect(oauth).toHaveBeenLastCalledWith(
      expect.objectContaining({ forceRefresh: false }),
    );
  });
});

describe("Better Auth guest bootstrap", () => {
  it("reuses one official anonymous bearer until explicitly refreshed", async () => {
    // Each acquisition first probes get-session (no session here), then signs
    // in anonymously for a bearer.
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("null", { status: 200 }))
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 200,
          headers: { "set-auth-token": "guest-1" },
        }),
      )
      .mockResolvedValueOnce(new Response("null", { status: 200 }))
      .mockResolvedValueOnce(
        new Response("{}", {
          status: 200,
          headers: { "set-auth-token": "guest-2" },
        }),
      );
    const guest = createGuestSessionProvider({
      baseUrl: "https://chat.aomi.dev",
      fetch: fetchImpl as typeof fetch,
    });

    await expect(guest()).resolves.toBe("guest-1");
    await expect(guest()).resolves.toBe("guest-1");
    await expect(guest({ forceRefresh: true })).resolves.toBe("guest-2");
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("yields no bearer when a cookie session already exists", async () => {
    // A signed-in (or already-anonymous) session travels as a cookie; minting
    // an anonymous session would REPLACE it and silently sign the user out.
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: "ba-user-1" } }), {
          status: 200,
        }),
      );
    const guest = createGuestSessionProvider({
      baseUrl: "https://chat.aomi.dev",
      fetch: fetchImpl as typeof fetch,
    });

    await expect(guest()).resolves.toBeNull();
    await expect(guest()).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0]?.[0])).toContain(
      "/api/auth/get-session",
    );
  });
});

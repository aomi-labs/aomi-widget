import { afterEach, describe, expect, it, vi } from "vitest";

import { createCliClient } from "../../src/cli/client-factory";

describe("CLI account auth wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches a static account bearer when configured", async () => {
    const stateResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({ is_processing: false, messages: [] })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => stateResponse);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = createCliClient({
        baseUrl: "http://unit.test",
        accountAccessToken: "bearer-123",
        secrets: {},
      });

      await client.fetchState("session-1");

      const headers = new Headers(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
      );
      expect(headers.get("Authorization")).toBe("Bearer bearer-123");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("exchanges a provider token for an account bearer when configured", async () => {
    const exchangeResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({
        access_token: "aomi-bearer",
        token_type: "Bearer",
        expires_at: Math.floor(Date.now() / 1000) + 600,
        user_id: "user-1",
      })),
    } as unknown as Response;
    const stateResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({ is_processing: false, messages: [] })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/account/exchange")) {
        return exchangeResponse;
      }
      return stateResponse;
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = createCliClient({
        baseUrl: "http://unit.test",
        accountProvider: "privy",
        accountProviderToken: "privy-provider-token",
        secrets: {},
      });

      await client.fetchState("session-1");

      expect(String(nativeFetch.mock.calls[0]?.[0])).toBe(
        "http://unit.test/api/account/exchange",
      );
      expect(
        JSON.parse(String((nativeFetch.mock.calls[0]?.[1] as RequestInit).body)),
      ).toEqual({
        provider: "privy",
        provider_token: "privy-provider-token",
      });

      const headers = new Headers(
        (nativeFetch.mock.calls[1]?.[1] as RequestInit).headers,
      );
      expect(headers.get("Authorization")).toBe("Bearer aomi-bearer");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});

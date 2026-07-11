import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCliClient,
  resolveCliBaseUrl,
} from "../../src/cli/client-factory";

describe("CLI account auth wiring", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("defaults account client traffic to the hosted BFF", () => {
    expect(resolveCliBaseUrl({})).toBe("https://chat.aomi.dev");
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
        accountBearer: "bearer-123",
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

  it("does not exchange provider tokens now that backend exchange is removed", async () => {
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
        embeddedProvider: "privy",
        embeddedProviderToken: "privy-provider-token",
        secrets: {},
      });

      await client.fetchState("session-1");

      const headers = new Headers(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
      );
      expect(String(nativeFetch.mock.calls[0]?.[0])).toContain("/api/thread/state");
      expect(headers.get("Authorization")).toBeNull();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});

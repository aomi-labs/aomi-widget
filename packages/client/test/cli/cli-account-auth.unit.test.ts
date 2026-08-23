import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/cli/state", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../src/cli/state")>();
  return {
    ...actual,
    readState: vi.fn(() => null),
  };
});

import {
  createCliClient,
  resolveCliBaseUrl,
} from "../../src/cli/client-factory";
import { readState } from "../../src/cli/state";

describe("CLI account auth wiring", () => {
  beforeEach(() => {
    vi.mocked(readState).mockReturnValue(null);
  });

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

  it("presents a persisted BetterAuth session as the BFF bearer", async () => {
    vi.mocked(readState).mockReturnValue({
      sessionId: "session-1",
      baseUrl: "http://unit.test",
      auth: {
        sessionToken: "better-auth-session",
        expiresAt: Date.now() + 60_000,
        walletFamily: "evm",
        walletAddress: "0xabc",
      },
    });
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
        secrets: {},
      });

      await client.fetchState("session-1");

      const headers = new Headers(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
      );
      expect(headers.get("Authorization")).toBe("Bearer better-auth-session");
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
      expect(String(nativeFetch.mock.calls[0]?.[0])).toContain(
        "/api/thread/state",
      );
      expect(headers.get("Authorization")).toBeNull();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});

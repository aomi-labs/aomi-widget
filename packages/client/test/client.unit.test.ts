import { afterEach, describe, expect, it, vi } from "vitest";

import { createAccountAccessTokenProvider } from "../src/account-session";
import { AomiClient } from "../src/client";

const encoder = new TextEncoder();

const createMockSseConnection = (signal: AbortSignal) => {
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllerRef = controller;
      signal.addEventListener(
        "abort",
        () => {
          controller.error(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    },
  });

  return {
    response: {
      ok: true,
      body: stream,
    } as unknown as Response,
    emit(payload: string) {
      controllerRef?.enqueue(encoder.encode(payload));
    },
    close() {
      controllerRef?.close();
    },
  };
};

describe("AomiClient transport selection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses native fetch for state polling even when a custom fetch is provided", async () => {
    const nativeResponse = {
      ok: true,
      json: vi.fn(async () => ({ is_processing: false, messages: [] })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => nativeResponse);
    const customFetch = vi.fn(async () => {
      throw new Error("custom fetch should not be used for fetchState");
    });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        fetch: customFetch,
      });

      await client.fetchState("session-1");

      expect(nativeFetch).toHaveBeenCalledTimes(1);
      expect(customFetch).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("attaches account bearers and retries one forced refresh after a REST 401", async () => {
    const responses = [
      { ok: false, status: 401, statusText: "Unauthorized" },
      {
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn(async () => ({ is_processing: false, messages: [] })),
      },
    ] as Response[];
    const nativeFetch = vi.fn(async () => responses.shift() as Response);
    const getAccountAccessToken = vi.fn(
      async ({ forceRefresh = false } = {}) =>
        forceRefresh ? "fresh-token" : "stale-token",
    );
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        getAccountAccessToken,
      });

      await client.fetchState("session-1");

      expect(nativeFetch).toHaveBeenCalledTimes(2);
      expect(getAccountAccessToken).toHaveBeenNthCalledWith(1, {
        forceRefresh: false,
      });
      expect(getAccountAccessToken).toHaveBeenNthCalledWith(2, {
        forceRefresh: true,
      });
      expect(
        new Headers(
          (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
        ).get("Authorization"),
      ).toBe("Bearer stale-token");
      expect(
        new Headers(
          (nativeFetch.mock.calls[1]?.[1] as RequestInit).headers,
        ).get("Authorization"),
      ).toBe("Bearer fresh-token");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("proceeds without a bearer when the token source throws", async () => {
    // Defense-in-depth: a throwing getAccountAccessToken (e.g. an upstream
    // wallet credential that 403s) must not break the request — the bearer is
    // additive, so we send the call without an Authorization header.
    const stateResponse = {
      ok: true,
      json: vi.fn(async () => ({ is_processing: false, messages: [] })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => stateResponse);
    const getAccountAccessToken = vi.fn(async () => {
      throw new Error(
        "ParaApiError: user must verify biometrics or external wallets",
      );
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        getAccountAccessToken,
      });

      await expect(client.fetchState("session-1")).resolves.toBeDefined();
      expect(nativeFetch).toHaveBeenCalledTimes(1);
      expect(
        new Headers(
          (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
        ).get("Authorization"),
      ).toBeNull();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("uses native fetch for SSE subscriptions even when a custom fetch is provided", async () => {
    let connection: ReturnType<typeof createMockSseConnection> | undefined;
    const nativeFetch = vi.fn(async (_input, init) => {
      connection = createMockSseConnection(
        (init as RequestInit).signal as AbortSignal,
      );
      return connection.response;
    });
    const customFetch = vi.fn(async () => {
      throw new Error("custom fetch should not be used for SSE");
    });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        fetch: customFetch,
      });

      const onUpdate = vi.fn();
      const unsubscribe = client.subscribeSSE("session-2", onUpdate);
      connection?.emit(
        'data: {"type":"tool_update","session_id":"session-2"}\n\n',
      );

      await vi.waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith({
          type: "tool_update",
          session_id: "session-2",
        });
      });

      unsubscribe();
      expect(nativeFetch).toHaveBeenCalledTimes(1);
      expect(customFetch).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("attaches account bearers to native SSE subscriptions", async () => {
    let connection: ReturnType<typeof createMockSseConnection> | undefined;
    const nativeFetch = vi.fn(async (_input, init) => {
      connection = createMockSseConnection(
        (init as RequestInit).signal as AbortSignal,
      );
      return connection.response;
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        getAccountAccessToken: async () => "sse-token",
      });
      const unsubscribe = client.subscribeSSE("session-2", vi.fn());

      await vi.waitFor(() => {
        expect(nativeFetch).toHaveBeenCalledTimes(1);
      });
      const headers = new Headers(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
      );
      expect(headers.get("Authorization")).toBe("Bearer sse-token");

      unsubscribe();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("canonicalizes legacy solana_sigs into svm_sigs and strips bulky svm sign payloads during fetchState", async () => {
    const nativeResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({ is_processing: false, messages: [] })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => nativeResponse);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });

      await client.fetchState("session-1", {
        connection: { is_connected: true },
        solana: { address: "Bv9abc", cluster: "solana:mainnet" },
        pending: {
          solana_sigs: {
            1: {
              signer: "Bv9abc",
              description: "swap",
              unsignedTx: "AQID",
              pendingSvmSigId: 1,
              kind: "solana_sign",
            },
          },
        },
      });

      const url = String(nativeFetch.mock.calls[0]?.[0]);
      const parsed = new URL(url);
      const userState = JSON.parse(
        parsed.searchParams.get("user_state") ?? "{}",
      );
      // Legacy `solana_sigs` is canonicalized into `svm_sigs`; the bulky
      // `unsignedTx` is stripped while correlation ids are preserved.
      expect(userState.pending.solana_sigs).toBeUndefined();
      // Bucket entries are snake-cased to match the backend input contract.
      expect(userState.pending.svm_sigs["1"].unsigned_tx).toBeUndefined();
      expect(userState.pending.svm_sigs["1"].unsignedTx).toBeUndefined();
      expect(userState.pending.svm_sigs["1"].pending_svm_sig_id).toBe(1);
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("retries fetchState without sync params when the backend rejects query sync", async () => {
    const responses = [
      {
        ok: false,
        status: 400,
        statusText: "Bad Request",
      },
      {
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn(async () => ({ is_processing: false, messages: [] })),
      },
    ] as Response[];
    const nativeFetch = vi.fn(async () => responses.shift() as Response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });

      await expect(
        client.fetchState(
          "session-1",
          {
            connection: { is_connected: true, provider: "para" },
            evm: {
              address: "0xC764D92E312195114595cB645f31C38Fad9c14eE",
              chain_id: 1,
            },
            ext: { client_type: "web_ui" },
          },
          "client-1",
        ),
      ).resolves.toEqual({ is_processing: false, messages: [] });

      expect(nativeFetch).toHaveBeenCalledTimes(2);

      const firstUrl = new URL(String(nativeFetch.mock.calls[0]?.[0]));
      expect(firstUrl.searchParams.get("client_id")).toBe("client-1");
      expect(firstUrl.searchParams.get("user_state")).toBeTruthy();

      const secondUrl = new URL(String(nativeFetch.mock.calls[1]?.[0]));
      expect(secondUrl.searchParams.get("client_id")).toBeNull();
      expect(secondUrl.searchParams.get("user_state")).toBeNull();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("reuses one SSE connection for multiple listeners on the same session", async () => {
    const connections: Array<ReturnType<typeof createMockSseConnection>> = [];
    const nativeFetch = vi.fn(async (_input, init) => {
      const connection = createMockSseConnection(
        (init as RequestInit).signal as AbortSignal,
      );
      connections.push(connection);
      return connection.response;
    });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });
      const onSession1 = vi.fn();
      const onSession1b = vi.fn();

      const unsubscribeSession1 = client.subscribeSSE("session-1", onSession1);
      const unsubscribeSession1b = client.subscribeSSE(
        "session-1",
        onSession1b,
      );

      await vi.waitFor(() => {
        expect(nativeFetch).toHaveBeenCalledTimes(1);
      });

      connections[0]?.emit(
        'data: {"type":"title_changed","session_id":"session-1","new_title":"One"}\n\n',
      );

      await vi.waitFor(() => {
        expect(onSession1).toHaveBeenCalledWith({
          type: "title_changed",
          session_id: "session-1",
          new_title: "One",
        });
        expect(onSession1b).toHaveBeenCalledWith({
          type: "title_changed",
          session_id: "session-1",
          new_title: "One",
        });
      });

      expect(onSession1).toHaveBeenCalledTimes(1);
      expect(onSession1b).toHaveBeenCalledTimes(1);

      unsubscribeSession1b();
      unsubscribeSession1();
      expect(nativeFetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("opens separate SSE connections for different sessions", async () => {
    const connections: Array<ReturnType<typeof createMockSseConnection>> = [];
    const nativeFetch = vi.fn(async (_input, init) => {
      const connection = createMockSseConnection(
        (init as RequestInit).signal as AbortSignal,
      );
      connections.push(connection);
      return connection.response;
    });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });
      const onSession1 = vi.fn();
      const onSession2 = vi.fn();

      const unsubscribeSession1 = client.subscribeSSE("session-1", onSession1);
      const unsubscribeSession2 = client.subscribeSSE("session-2", onSession2);

      await vi.waitFor(() => {
        expect(nativeFetch).toHaveBeenCalledTimes(2);
      });

      const firstHeaders = new Headers(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit | undefined)?.headers,
      );
      const secondHeaders = new Headers(
        (nativeFetch.mock.calls[1]?.[1] as RequestInit | undefined)?.headers,
      );
      expect(firstHeaders.get("X-Session-Id")).toBe("session-1");
      expect(secondHeaders.get("X-Session-Id")).toBe("session-2");

      connections[0]?.emit(
        'data: {"type":"title_changed","session_id":"session-1","new_title":"One"}\n\n',
      );
      connections[1]?.emit(
        'data: {"type":"tool_update","session_id":"session-2"}\n\n',
      );

      await vi.waitFor(() => {
        expect(onSession1).toHaveBeenCalledWith({
          type: "title_changed",
          session_id: "session-1",
          new_title: "One",
        });
        expect(onSession2).toHaveBeenCalledWith({
          type: "tool_update",
          session_id: "session-2",
        });
      });

      unsubscribeSession1();
      unsubscribeSession2();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("dedupes SSE event ids and resumes reconnects from the latest cursor", async () => {
    const connections: Array<ReturnType<typeof createMockSseConnection>> = [];
    const nativeFetch = vi.fn(async (_input, init) => {
      const connection = createMockSseConnection(
        (init as RequestInit).signal as AbortSignal,
      );
      connections.push(connection);
      return connection.response;
    });

    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });
      const onUpdate = vi.fn();
      const unsubscribe = client.subscribeSSE("session-1", onUpdate);

      await vi.waitFor(() => {
        expect(nativeFetch).toHaveBeenCalledTimes(1);
      });
      connections[0]?.emit(
        'id: evt-1\ndata: {"type":"tool_update","session_id":"session-1"}\n\n',
      );
      connections[0]?.emit(
        'id: evt-1\ndata: {"type":"tool_update","session_id":"session-1"}\n\n',
      );
      await vi.waitFor(() => {
        expect(onUpdate).toHaveBeenCalledTimes(1);
      });

      connections[0]?.close();
      await vi.waitFor(
        () => {
          expect(nativeFetch).toHaveBeenCalledTimes(2);
        },
        { timeout: 1500 },
      );
      const reconnectHeaders = new Headers(
        (nativeFetch.mock.calls[1]?.[1] as RequestInit | undefined)?.headers,
      );
      expect(reconnectHeaders.get("Last-Event-ID")).toBe("evt-1");
      unsubscribe();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("reopens SSE subscriptions when the account bearer rotates", async () => {
    const connections: Array<ReturnType<typeof createMockSseConnection>> = [];
    const nativeFetch = vi.fn(async (_input, init) => {
      const connection = createMockSseConnection(
        (init as RequestInit).signal as AbortSignal,
      );
      connections.push(connection);
      return connection.response;
    });
    let refreshListener: (() => void) | undefined;
    const getAccountAccessToken = Object.assign(async () => "account-token", {
      subscribe(listener: () => void) {
        refreshListener = listener;
        return () => {
          refreshListener = undefined;
        };
      },
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        getAccountAccessToken,
      });
      const unsubscribe = client.subscribeSSE("session-1", vi.fn());

      await vi.waitFor(() => {
        expect(nativeFetch).toHaveBeenCalledTimes(1);
      });
      refreshListener?.();
      await vi.waitFor(
        () => {
          expect(nativeFetch).toHaveBeenCalledTimes(2);
        },
        { timeout: 1500 },
      );

      unsubscribe();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});

describe("createAccountAccessTokenProvider", () => {
  it("caches exchange responses and refreshes two minutes before expiration", async () => {
    let now = 1_000_000;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "token-1",
          token_type: "Bearer",
          expires_at: now / 1000 + 15 * 60,
          user_id: "user-1",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "token-2",
          token_type: "Bearer",
          expires_at: now / 1000 + 15 * 60,
          user_id: "user-1",
        }),
      } as Response);
    const getAccountAccessToken = createAccountAccessTokenProvider({
      baseUrl: "http://unit.test/",
      getProviderCredential: async () => ({
        provider: "para",
        providerToken: "provider-token",
      }),
      fetch,
      now: () => now,
    });

    await expect(getAccountAccessToken()).resolves.toBe("token-1");
    await expect(getAccountAccessToken()).resolves.toBe("token-1");
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 13 * 60 * 1000;
    await expect(getAccountAccessToken()).resolves.toBe("token-2");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(
      "http://unit.test/api/account/sessions/exchange",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          provider: "para",
          provider_token: "provider-token",
        }),
      }),
    );
    getAccountAccessToken.dispose();
  });

  it("proactively refreshes and notifies subscribers before expiration", async () => {
    vi.useFakeTimers();
    let now = 1_000_000;
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        access_token: `token-${fetch.mock.calls.length}`,
        token_type: "Bearer",
        expires_at: now / 1000 + 15 * 60,
        user_id: "user-1",
      }),
    })) as unknown as typeof globalThis.fetch;
    const getAccountAccessToken = createAccountAccessTokenProvider({
      baseUrl: "http://unit.test",
      getProviderCredential: async () => ({
        provider: "privy",
        providerToken: "provider-token",
      }),
      fetch,
      now: () => now,
    });
    const onRefresh = vi.fn();
    getAccountAccessToken.subscribe(onRefresh);

    try {
      await expect(getAccountAccessToken()).resolves.toBe("token-1");
      now += 13 * 60 * 1000;
      await vi.advanceTimersByTimeAsync(13 * 60 * 1000);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    } finally {
      getAccountAccessToken.dispose();
      vi.useRealTimers();
    }
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { createAccountBearerProvider } from "../src/account-session";
import { AomiClient } from "../src/client";
import { AOMI_BACKEND_ENDPOINTS } from "./routes";

describe("AomiClient route manifest", () => {
  it("tracks the current backend route surface without legacy control routes", () => {
    const routeKeys = AOMI_BACKEND_ENDPOINTS.map(
      (endpoint) =>
        `${endpoint.method} ${endpoint.path} [${endpoint.auth.join(", ")}]`,
    );

    expect(routeKeys).toHaveLength(105);
    expect(new Set(routeKeys).size).toBe(routeKeys.length);
    expect(routeKeys).toContain("POST /api/exec/run [account, thread]");
    expect(routeKeys).toContain("GET /api/resource/search/apps [account]");
    expect(routeKeys).toContain("GET /api/resource/search/tools [account]");
    expect(routeKeys).toContain("GET /api/thread/apps [thread]");
    expect(routeKeys).toContain("GET /api/_internal/secrets [service]");
    expect(routeKeys).toContain("DELETE /api/_internal/secrets [service]");
    expect(routeKeys).toContain(
      "GET /api/integrations/github-app/user/sources/:id/deployments [service]",
    );
    expect(routeKeys).toContain(
      "GET /api/integrations/github-app/user/sources/:id/observability [service]",
    );
    expect(routeKeys).toContain(
      "GET /api/platforms/:name/apps/:app/records [activation]",
    );
    expect(routeKeys).toContain(
      "POST /api/platforms/:name/deploy [activation]",
    );
    expect(routeKeys).toContain(
      "POST /api/platforms/:name/deployments/:deployment/promote [activation]",
    );
    expect(routeKeys).toContain(
      "POST /api/platforms/:name/deployments/:deployment/rerun [activation]",
    );
    expect(routeKeys).not.toContain("GET /api/control/apps [session]");
    expect(routeKeys.some((route) => route.includes("/api/control/"))).toBe(
      false,
    );
  });

  it("can call any manifest route through the low-level request API", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      json: vi.fn(async () => ({ ok: true })),
      text: vi.fn(async () => ""),
    } as unknown as Response;
    const fetchImpl = vi.fn(async () => response);
    const client = new AomiClient({
      baseUrl: "http://unit.test/",
      apiKey: "app-key-1",
      fetch: fetchImpl,
    });

    await expect(
      client.request("POST", "/api/platforms/community/deploy", {
        sessionId: "session-1",
        query: { preflight: true, empty: null },
        body: { source: "github" },
      }),
    ).resolves.toEqual({ ok: true });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://unit.test/api/platforms/community/deploy?preflight=true",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ source: "github" });

    const headers = new Headers(init.headers);
    expect(headers.get("X-Session-Id")).toBe("session-1");
    expect(headers.get("Aomi-App-Key")).toBe("app-key-1");
    expect(headers.get("Content-Type")).toBe("application/json");
  });
});

describe("AomiClient account profile", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the bound account profile with the session header and account bearer", async () => {
    const profile = {
      account: {
        user_id: "user-1",
        username: null,
        tier: "free",
        status: "active",
        verified_email: "a@b.c",
      },
      wallets: [
        {
          wallet_id: "wallet-evm-1",
          address: "0xabc",
          chain_type: "ethereum",
          wallet_provider: "privy",
        },
      ],
    };
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => profile),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        getAccountBearer: async () => "bearer-1",
      });

      const result = await client.fetchAccountProfile("session-1");

      expect(String(nativeFetch.mock.calls[0]?.[0])).toBe(
        "http://unit.test/api/account",
      );
      const headers = new Headers(
        (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
      );
      expect(headers.get("Authorization")).toBe("Bearer bearer-1");
      expect(headers.get("X-Session-Id")).toBe("session-1");
      expect(result?.account.user_id).toBe("user-1");
      expect(result?.wallets?.[0]?.wallet_id).toBe("wallet-evm-1");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("returns null when the session is not bound to an account (HTTP 400)", async () => {
    const response = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: vi.fn(async () => ({})),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });
      expect(await client.fetchAccountProfile("session-1")).toBeNull();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("uses account payment routes for BYOK setup", async () => {
    const responses = [
      {
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn(async () => ({
          byok: [
            {
              provider: "anthropic",
              key_prefix: "sk-ant-",
              label: null,
              is_active: true,
            },
          ],
          streams: [],
        })),
      },
      {
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn(async () => ({
          key: {
            provider: "openai",
            key_prefix: "sk-open",
            label: "work",
            is_active: true,
          },
        })),
      },
      {
        ok: true,
        status: 200,
        statusText: "OK",
        json: vi.fn(async () => ({ deleted: true })),
      },
    ] as unknown as Response[];
    const nativeFetch = vi.fn(async () => responses.shift() as Response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        getAccountBearer: async () => "bearer-1",
      });

      await expect(client.listByokKeys("session-1")).resolves.toHaveLength(1);
      await expect(
        client.saveByokKey("session-1", "openai", "sk-open-test", "work"),
      ).resolves.toMatchObject({ provider: "openai" });
      await expect(client.deleteByokKey("session-1", "openai")).resolves.toBe(
        true,
      );

      expect(String(nativeFetch.mock.calls[0]?.[0])).toBe(
        "http://unit.test/api/account/payment",
      );
      expect(String(nativeFetch.mock.calls[1]?.[0])).toBe(
        "http://unit.test/api/account/payment/byok",
      );
      expect(String(nativeFetch.mock.calls[2]?.[0])).toBe(
        "http://unit.test/api/account/payment/byok/openai",
      );

      const saveInit = nativeFetch.mock.calls[1]?.[1] as RequestInit;
      expect(saveInit.method).toBe("POST");
      expect(JSON.parse(saveInit.body as string)).toEqual({
        provider: "openai",
        byok_key: "sk-open-test",
        label: "work",
      });

      for (const [, init] of nativeFetch.mock.calls) {
        const headers = new Headers((init as RequestInit).headers);
        expect(headers.get("Authorization")).toBe("Bearer bearer-1");
        expect(headers.get("X-Session-Id")).toBe("session-1");
      }
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("sends wallet_family only for non-default beginPrivyAuth flows", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({
        state_token: "state-1",
        auth_url: "https://chat.example/auth/privy?state=state-1",
        expires_at: 1_800_000_000,
      })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });

      await client.beginPrivyAuth("session-1", {
        application: "byreal",
        walletFamily: "evm",
      });
      await client.beginPrivyAuth("session-1", {
        application: "byreal",
        walletFamily: "solana",
      });

      expect(
        JSON.parse(
          (nativeFetch.mock.calls[0]?.[1] as RequestInit).body as string,
        ),
      ).toEqual({
        application: "byreal",
      });
      expect(
        JSON.parse(
          (nativeFetch.mock.calls[1]?.[1] as RequestInit).body as string,
        ),
      ).toEqual({
        application: "byreal",
        wallet_family: "solana",
      });
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("sends chat messages as query params instead of a JSON body", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({ messages: [], is_processing: false })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });

      await client.sendMessage("session-1", "swap 20 mon to usdc", {
        app: "default",
        clientId: "client-1",
      });

      const [url, init] = nativeFetch.mock.calls[0] ?? [];
      expect(String(url)).toBe(
        "http://unit.test/api/thread/chat?app=default&message=swap+20+mon+to+usdc&client_id=client-1",
      );
      expect((init as RequestInit | undefined)?.body).toBeUndefined();
      expect(
        new Headers((init as RequestInit).headers).get("X-Session-Id"),
      ).toBe("session-1");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("sends setModel as query params instead of a JSON body", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({
        success: true,
        rig: "gpt-5",
        baml: "gpt-5-nano",
        created: false,
      })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });

      await client.setModel("session-1", "gpt-5", {
        app: "default",
        clientId: "client-1",
      });

      const [url, init] = nativeFetch.mock.calls[0] ?? [];
      expect(String(url)).toBe(
        "http://unit.test/api/thread/model?rig=gpt-5&app=default&client_id=client-1",
      );
      expect((init as RequestInit | undefined)?.body).toBeUndefined();
      expect(
        new Headers((init as RequestInit).headers).get("X-Session-Id"),
      ).toBe("session-1");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});

describe("AomiClient app catalog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes platform filters and normalizes artifact readiness", async () => {
    const response = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => [
        {
          name: "somm-agent",
          application_id: 42,
          platform: "somm.finance",
          artifact_ready: true,
        },
      ]),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => response);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({ baseUrl: "http://unit.test" });

      const apps = await client.getApps("session-1", {
        platforms: ["somm.finance", "community"],
      });

      expect(String(nativeFetch.mock.calls[0]?.[0])).toBe(
        "http://unit.test/api/thread/apps?platform=somm.finance&platform=community",
      );
      expect(apps).toEqual([
        {
          name: "somm-agent",
          applicationId: 42,
          platform: "somm.finance",
          artifactReady: true,
          secrets: [],
        },
      ]);
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });
});

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
    const getAccountBearer = vi.fn(async ({ forceRefresh = false } = {}) =>
      forceRefresh ? "fresh-token" : "stale-token",
    );
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        getAccountBearer,
      });

      await client.fetchState("session-1");

      expect(nativeFetch).toHaveBeenCalledTimes(2);
      expect(getAccountBearer).toHaveBeenNthCalledWith(1, {
        forceRefresh: false,
      });
      expect(getAccountBearer).toHaveBeenNthCalledWith(2, {
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
    // Defense-in-depth: a throwing getAccountBearer (e.g. an upstream
    // wallet credential that 403s) must not break the request — the bearer is
    // additive, so we send the call without an Authorization header.
    const stateResponse = {
      ok: true,
      json: vi.fn(async () => ({ is_processing: false, messages: [] })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => stateResponse);
    const getAccountBearer = vi.fn(async () => {
      throw new Error(
        "ParaApiError: user must verify biometrics or external wallets",
      );
    });
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        getAccountBearer,
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

  it("does not downgrade required authorization failures to anonymous", async () => {
    const nativeFetch = vi.fn();
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        authorization: async () => {
          throw new Error("Widget signature rejected");
        },
      });

      await expect(client.fetchState("session-1")).rejects.toThrow(
        "Widget signature rejected",
      );
      expect(nativeFetch).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  it("attaches bearer sessions to account probes", async () => {
    const accountResponse = {
      ok: true,
      json: vi.fn(async () => ({ id: "account-1" })),
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => accountResponse);
    const originalFetch = globalThis.fetch;
    vi.stubGlobal("fetch", nativeFetch);

    try {
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        getAccountBearer: async () => "better-auth-session",
      });

      await expect(client.getAccount("session-1")).resolves.toEqual({
        id: "account-1",
      });
      expect(String(nativeFetch.mock.calls[0]?.[0])).toBe(
        "http://unit.test/api/account",
      );
      expect(
        new Headers(
          (nativeFetch.mock.calls[0]?.[1] as RequestInit).headers,
        ).get("Authorization"),
      ).toBe("Bearer better-auth-session");
    } finally {
      vi.stubGlobal("fetch", originalFetch);
    }
  });

  describe("AomiClient BYOK account routes", () => {
    it("lists BYOK keys from the account payment route", async () => {
      const fetch = vi.fn<typeof globalThis.fetch>(async () =>
        Response.json({
          byok: [
            { provider: "openai", key_prefix: "sk-open", label: "OpenAI" },
          ],
        }),
      );
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        fetch,
      });

      await expect(client.listByokKeys("session-1")).resolves.toEqual([
        { provider: "openai", key_prefix: "sk-open", label: "OpenAI" },
      ]);

      expect(String(fetch.mock.calls[0]?.[0])).toBe(
        "http://unit.test/api/account/payment",
      );
      expect(fetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    });

    it("saves BYOK keys through the account payment BYOK route", async () => {
      const fetch = vi.fn<typeof globalThis.fetch>(async () =>
        Response.json({
          key: {
            provider: "anthropic",
            key_prefix: "sk-ant",
            label: "Claude",
          },
        }),
      );
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        fetch,
      });

      await expect(
        client.saveByokKey("session-1", "anthropic", "sk-ant-secret", "Claude"),
      ).resolves.toEqual({
        provider: "anthropic",
        key_prefix: "sk-ant",
        label: "Claude",
      });

      expect(String(fetch.mock.calls[0]?.[0])).toBe(
        "http://unit.test/api/account/payment/byok",
      );
      const init = fetch.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe("POST");
      expect(new Headers(init.headers).get("X-Thread-Id")).toBe("session-1");
      expect(JSON.parse(String(init.body))).toEqual({
        provider: "anthropic",
        byok_key: "sk-ant-secret",
        label: "Claude",
      });
    });

    it("deletes BYOK keys through the provider-specific account route", async () => {
      const fetch = vi.fn<typeof globalThis.fetch>(async () =>
        Response.json({ deleted: true }),
      );
      const client = new AomiClient({
        baseUrl: "http://unit.test",
        fetch,
      });

      await expect(
        client.deleteByokKey("session-1", "openai/test"),
      ).resolves.toBe(true);

      expect(String(fetch.mock.calls[0]?.[0])).toBe(
        "http://unit.test/api/account/payment/byok/openai%2Ftest",
      );
      const init = fetch.mock.calls[0]?.[1] as RequestInit;
      expect(init.method).toBe("DELETE");
      expect(new Headers(init.headers).get("X-Thread-Id")).toBe("session-1");
    });
  });

  it("normalizes backend thread_id responses to session_id compatibility fields", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(
        Response.json({
          thread_id: "thread-1",
          title: null,
          last_active_at: "123",
        }),
      )
      .mockResolvedValueOnce(
        Response.json([
          { thread_id: "thread-1", title: "One", last_active_at: 456 },
        ]),
      );
    const client = new AomiClient({
      baseUrl: "http://unit.test",
      fetch,
    });

    await expect(client.createThread("thread-1")).resolves.toEqual({
      session_id: "thread-1",
      title: null,
      last_active_at: 123,
    });
    await expect(client.listThreads("thread-1")).resolves.toEqual([
      {
        session_id: "thread-1",
        title: "One",
        is_archived: undefined,
        last_active_at: 456,
      },
    ]);

    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "http://unit.test/api/threads",
    );
    expect(String(fetch.mock.calls[1]?.[0])).toBe(
      "http://unit.test/api/threads",
    );
    const headers = new Headers(
      (fetch.mock.calls[0]?.[1] as RequestInit | undefined)?.headers,
    );
    expect(headers.get("X-Thread-Id")).toBe("thread-1");
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
        getAccountBearer: async () => "sse-token",
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

  it("strips bulky pending payloads from sendMessage user_state URLs", async () => {
    const chatResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: vi.fn(async () => ({ is_processing: false, messages: [] })),
    } as unknown as Response;
    const customFetch = vi.fn(async () => chatResponse);
    const client = new AomiClient({
      baseUrl: "http://unit.test",
      fetch: customFetch,
    });

    await client.sendMessage("session-1", "hello", {
      userState: {
        connection: { is_connected: true },
        evm: { address: "0xabc", chain_id: 1 },
        pending: {
          evm_sigs: {
            7: {
              signer: "0xabc",
              description: "permit",
              typed_data: {
                primaryType: "Permit",
                message: { nonce: "large-payload" },
              },
              pendingEip712Id: 7,
            },
          },
        },
      },
    });

    const url = String(customFetch.mock.calls[0]?.[0]);
    expect(url).not.toContain("large-payload");

    const parsed = new URL(url);
    const userState = JSON.parse(parsed.searchParams.get("user_state") ?? "{}");
    expect(userState.pending.evm_sigs["7"].typed_data).toBeUndefined();
    expect(userState.pending.evm_sigs["7"].pending_eip712_id).toBe(7);
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
      expect(firstHeaders.get("X-Thread-Id")).toBe("session-1");
      expect(secondHeaders.get("X-Thread-Id")).toBe("session-2");

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
    const getAccountBearer = Object.assign(async () => "account-token", {
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
        getAccountBearer,
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

describe("createAccountBearerProvider", () => {
  it("caches exchange responses and refreshes two minutes before expiration", async () => {
    let now = 1_000_000;
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          bearer: "token-1",
          expires_at: now / 1000 + 15 * 60,
          user_id: "user-1",
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          bearer: "token-2",
          expires_at: now / 1000 + 15 * 60,
          user_id: "user-1",
        }),
      } as Response);
    const getAccountBearer = createAccountBearerProvider({
      baseUrl: "http://unit.test/",
      getProviderCredential: async () => ({
        provider: "para",
        providerToken: "provider-token",
      }),
      fetch,
      now: () => now,
    });

    await expect(getAccountBearer()).resolves.toBe("token-1");
    await expect(getAccountBearer()).resolves.toBe("token-1");
    expect(fetch).toHaveBeenCalledTimes(1);

    now += 13 * 60 * 1000;
    await expect(getAccountBearer()).resolves.toBe("token-2");
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenLastCalledWith(
      "http://unit.test/api/aomi/account-bearer",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
    getAccountBearer.dispose();
  });

  it("proactively refreshes and notifies subscribers before expiration", async () => {
    vi.useFakeTimers();
    let now = 1_000_000;
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        bearer: `token-${fetch.mock.calls.length}`,
        expires_at: now / 1000 + 15 * 60,
        user_id: "user-1",
      }),
    })) as unknown as typeof globalThis.fetch;
    const getAccountBearer = createAccountBearerProvider({
      baseUrl: "http://unit.test",
      getProviderCredential: async () => ({
        provider: "privy",
        providerToken: "provider-token",
      }),
      fetch,
      now: () => now,
    });
    const onRefresh = vi.fn();
    getAccountBearer.subscribe(onRefresh);

    try {
      await expect(getAccountBearer()).resolves.toBe("token-1");
      now += 13 * 60 * 1000;
      await vi.advanceTimersByTimeAsync(13 * 60 * 1000);

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(onRefresh).toHaveBeenCalledTimes(1);
    } finally {
      getAccountBearer.dispose();
      vi.useRealTimers();
    }
  });
});

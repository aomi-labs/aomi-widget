import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient } from "../src/client";

const encoder = new TextEncoder();

const createMockSseConnection = (signal: AbortSignal) => {
  let controllerRef:
    | ReadableStreamDefaultController<Uint8Array>
    | undefined;

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

  it("uses native fetch for SSE subscriptions even when a custom fetch is provided", async () => {
    let connection:
      | ReturnType<typeof createMockSseConnection>
      | undefined;
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
      connection?.emit('data: {"type":"tool_update","session_id":"session-2"}\n\n');

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
      const userState = JSON.parse(parsed.searchParams.get("user_state") ?? "{}");
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
      const unsubscribeSession1b = client.subscribeSSE("session-1", onSession1b);

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
});

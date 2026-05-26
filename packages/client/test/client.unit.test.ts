import { afterEach, describe, expect, it, vi } from "vitest";

import { AomiClient } from "../src/client";

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
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            'data: {"type":"tool_update","session_id":"session-2"}\n\n',
          ),
        );
      },
    });
    const nativeResponse = {
      ok: true,
      body: stream,
    } as unknown as Response;
    const nativeFetch = vi.fn(async () => nativeResponse);
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
});

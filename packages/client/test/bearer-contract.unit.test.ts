/**
 * The getAccountBearer subscribe contract (agentic-somm#322 review, Q4).
 *
 * `GetAccountBearer.subscribe` is public optional contract, and
 * `WidgetSessionProvider.subscribe` is required. The client used to duck-check
 * it exactly once in the constructor: a stable host bridge whose
 * `subscribe` appears after construction — or a wrapper that copied only
 * `required` — silently lost the token-refresh -> SSE-reconnect wiring, and
 * live streams stayed on a superseded bearer until they died upstream.
 *
 * Pins the repaired behavior: late-arriving subscribe is wired on the next
 * stream subscription, wiring happens at most once, and a `required` bearer
 * with no subscribe warns loudly instead of failing silent.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { AomiClient } from "../src/client";

function sseFetch(): typeof fetch {
  // Minimal SSE endpoint: an empty, immediately-closing stream.
  return vi.fn(async () => {
    return new Response(new ReadableStream({ start: (c) => c.close() }), {
      status: 200,
      headers: { "content-type": "text/event-stream" },
    });
  }) as unknown as typeof fetch;
}

function bearer(overrides: Record<string, unknown> = {}) {
  return Object.assign(async () => "token-1", {
    required: true as const,
    ...overrides,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getAccountBearer subscribe contract", () => {
  it("wires reconnect in the constructor when subscribe is present", () => {
    const subscribe = vi.fn(() => () => {});
    new AomiClient({
      baseUrl: "https://api.test",
      fetch: sseFetch(),
      getAccountBearer: bearer({ subscribe }),
    });
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("wires a LATE-arriving subscribe on the next stream subscription", () => {
    const provider = bearer();
    const client = new AomiClient({
      baseUrl: "https://api.test",
      fetch: sseFetch(),
      getAccountBearer: provider,
    });

    // subscribe appears after construction on the same stable bearer function.
    const subscribe = vi.fn(() => () => {});
    (provider as unknown as { subscribe: unknown }).subscribe = subscribe;

    const stop = client.subscribeSSE("session-1", () => {});
    expect(subscribe).toHaveBeenCalledTimes(1);
    stop();
  });

  it("wires at most once across repeated subscriptions", () => {
    const subscribe = vi.fn(() => () => {});
    const client = new AomiClient({
      baseUrl: "https://api.test",
      fetch: sseFetch(),
      getAccountBearer: bearer({ subscribe }),
    });
    client.subscribeSSE("s1", () => {})();
    client.subscribeSSE("s2", () => {})();
    expect(subscribe).toHaveBeenCalledTimes(1);
  });

  it("warns loudly when a required bearer has no subscribe", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    new AomiClient({
      baseUrl: "https://api.test",
      fetch: sseFetch(),
      getAccountBearer: bearer(),
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/subscribe\(\) is missing/);
  });

  it("stays quiet for an optional (non-required) bearer without subscribe", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    new AomiClient({
      baseUrl: "https://api.test",
      fetch: sseFetch(),
      getAccountBearer: Object.assign(async () => "t", {}),
    });
    expect(warn).not.toHaveBeenCalled();
  });
});

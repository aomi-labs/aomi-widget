import { describe, expect, it, vi } from "vitest";

import { AomiClient, V1ClientSession } from "../src";

const delta = {
  session: "sess_test",
  turn: { status: "completed" as const },
  messages: [],
  activity: [],
  actions: [],
  cursor: "cursor_next",
};

describe("V1ClientSession", () => {
  it("uses the generated public contract and advances its opaque cursor", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(input), init });
        return Response.json(delta);
      },
    );
    const session = new V1ClientSession(
      new AomiClient({
        baseUrl: "https://portal.test",
        fetch: fetcher as typeof fetch,
      }),
      { application: "app_AQ", sessionId: "sess_test" },
    );

    await session.chat("hello", { idempotencyKey: "idem_123456789012" });
    await session.check({ waitMs: 100 });

    expect(requests[0].url).toBe("https://portal.test/v1/agent/chat");
    expect(new Headers(requests[0].init?.headers).get("idempotency-key")).toBe(
      "idem_123456789012",
    );
    expect(JSON.parse(String(requests[0].init?.body))).toMatchObject({
      session: "sess_test",
      application: "app_AQ",
      message: "hello",
      model: "default",
    });
    expect(requests[1].url).toContain("cursor=cursor_next");
  });

  it("parses the BFF SSE projection without exposing kernel events", async () => {
    const payload = `id: cursor_next\nevent: delta\ndata: ${JSON.stringify(delta)}\n\n`;
    const fetcher = vi.fn(
      async () =>
        new Response(payload, {
          headers: { "content-type": "text/event-stream" },
        }),
    );
    const session = new V1ClientSession(
      new AomiClient({
        baseUrl: "https://portal.test",
        fetch: fetcher as typeof fetch,
      }),
      { application: "app_AQ", sessionId: "sess_test" },
    );
    const abort = new AbortController();
    const stream = session.watch({ signal: abort.signal });
    const first = await stream.next();
    abort.abort();

    expect(first.value).toEqual(delta);
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("accept")).toBe(
      "text/event-stream",
    );
  });
});

import { describe, expect, it, vi } from "vitest";

import { AgentApiError, AomiClient } from "../src";

describe("AgentTransport", () => {
  it("uses canonical routes, cursor long poll, and mutation keys", async () => {
    const fetch = vi.fn().mockImplementation(async () =>
      Response.json({
        sessionId: "session-1",
        status: "processing",
        cursor: "cursor-1",
        messages: [],
        activity: [],
        actions: [],
        hasMore: false,
      }),
    );
    const agent = new AomiClient({ baseUrl: "https://portal.example/", fetch })
      .agent;

    await agent.start(
      { sessionId: "session-1", message: "hello", app: "default" },
      { idempotencyKey: "idem-fixed", paymentSignature: "payment" },
    );
    await agent.check("session-1", { cursor: "cursor-1", waitMs: 40_000 });

    expect(fetch.mock.calls[0][0]).toBe("https://portal.example/v1/agent/chat");
    const startHeaders = new Headers(fetch.mock.calls[0][1].headers);
    expect(startHeaders.get("idempotency-key")).toBe("idem-fixed");
    expect(startHeaders.get("payment-signature")).toBe("payment");
    expect(fetch.mock.calls[1][0]).toBe(
      "https://portal.example/v1/agent/chat/session-1?cursor=cursor-1&wait=30000",
    );
  });

  it("parses stable public errors and retry classification", async () => {
    const client = new AomiClient({
      baseUrl: "https://portal.example",
      fetch: vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: "busy",
              message: "Turn is active",
              requestId: "request-1",
            },
          },
          { status: 409 },
        ),
      ),
    });
    const error = await client.agent.check("session-1").catch((value) => value);
    expect(error).toBeInstanceOf(AgentApiError);
    expect(error).toMatchObject({
      code: "busy",
      requestId: "request-1",
      retryable: false,
    });
  });

  it("exposes typed session management without a second client", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ sessions: [] }));
    const client = new AomiClient({ baseUrl: "https://portal.example", fetch });
    await expect(client.agent.sessions.list({ limit: 10 })).resolves.toEqual({
      sessions: [],
    });
    expect(fetch.mock.calls[0][0]).toBe(
      "https://portal.example/v1/agent/sessions?limit=10",
    );
  });
});

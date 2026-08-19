import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./internal-principal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./internal-principal")>()),
  mintInternalPrincipal: vi.fn(async () => ({
    bearer: "internal.test.principal",
    expiresAt: 1_900_000_000,
  })),
}));

import { RustAgentKernel } from "./kernel";

const principal = {
  kind: "account" as const,
  canonicalUserId: "user_1",
  clientId: "client_1",
  scopes: ["agent:chat"],
};

describe("RustAgentKernel", () => {
  const calls: Array<{ url: URL; init: RequestInit }> = [];
  const fetcher = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: new URL(String(input)), init: init ?? {} });
      return Response.json(responseFor(new URL(String(input)).pathname));
    },
  );

  beforeEach(() => {
    calls.length = 0;
    fetcher.mockClear();
  });

  it("uses only signed internal kernel routes and preserves bigint app identity", async () => {
    const kernel = new RustAgentKernel(
      principal,
      "https://kernel.test",
      fetcher as typeof fetch,
    );

    await kernel.startTurn({
      threadId: "sess_1",
      applicationId: 9_007_199_254_740_993n,
      message: "hello",
      idempotencyKey: "idem_123456789012",
    });
    await kernel.readDelta({
      threadId: "sess_1",
      after: { stream_epoch: "epoch_1", event_sequence: 7 },
      waitMs: 25_000,
    });
    await kernel.submitActionResult({
      threadId: "sess_1",
      actionId: "act_1",
      expectedRevision: 2,
      idempotencyKey: "idem_223456789012",
      result: { result_type: "rejected", reason: "no" },
    });
    await kernel.interrupt({
      threadId: "sess_1",
      idempotencyKey: "idem_323456789012",
    });
    await kernel.listSessions({ limit: 20 });
    await kernel.updateSession({
      threadId: "sess_1",
      title: "Renamed",
      idempotencyKey: "idem_423456789012",
    });
    await kernel.deleteSession({
      threadId: "sess_1",
      idempotencyKey: "idem_523456789012",
    });

    expect(calls).toHaveLength(7);
    expect(
      calls.every(({ url }) =>
        url.pathname.startsWith("/api/_internal/agent/"),
      ),
    ).toBe(true);
    expect(calls.every(({ url }) => !url.pathname.startsWith("/v1/"))).toBe(
      true,
    );
    expect(
      calls.every(
        ({ init }) =>
          new Headers(init.headers).get("authorization") ===
          "Bearer internal.test.principal",
      ),
    ).toBe(true);
    expect(JSON.parse(String(calls[0].init.body))).toMatchObject({
      application_id: "9007199254740993",
      thread_id: "sess_1",
    });
    expect(calls[1].url.searchParams.get("stream_epoch")).toBe("epoch_1");
    expect(calls[1].url.searchParams.get("event_sequence")).toBe("7");
  });
});

function responseFor(path: string): unknown {
  const session = {
    thread_id: "sess_1",
    application_id: "9007199254740993",
    title: "Session",
    archived: false,
    created_at: 1,
    updated_at: 1,
  };
  if (path.endsWith("/result")) {
    return {
      response_type: "action",
      action_id: "act_1",
      thread_id: "sess_1",
      revision: 3,
      status: "rejected",
      kind: "external_transaction",
      payload: {},
      created_at: 1,
      expires_at: 2,
    };
  }
  if (path === "/api/_internal/agent/sessions") {
    return { response_type: "sessions", sessions: [session] };
  }
  if (path === "/api/_internal/agent/sessions/sess_1") {
    return { response_type: "session", ...session };
  }
  return {
    response_type: "delta",
    thread_id: "sess_1",
    turn_status: "completed",
    snapshot: { messages: [], system_events: [], is_processing: false },
    events: [],
    actions: [],
    position: { stream_epoch: "epoch_1", event_sequence: 7 },
    resync_required: false,
  };
}

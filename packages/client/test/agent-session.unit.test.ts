import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentApiError, AomiClient, Session } from "../src";
import type { Action, Event, EventPage } from "../src";

const occurredAt = Date.parse("2026-08-20T00:00:00Z");

function page(
  events: Event[] = [],
  overrides: Partial<EventPage> = {},
): EventPage {
  return {
    session_id: "session-agent",
    cursor: `cursor-${events.at(-1)?.sequence ?? 0}`,
    events,
    has_more: false,
    ...overrides,
  };
}

function meta(type: string, sequence: number) {
  return {
    type,
    event_id: `event-${sequence}`,
    sequence,
    turn_id: "turn-1",
    occurred_at: occurredAt + sequence,
  };
}

function turn(
  sequence: number,
  state: "processing" | "awaiting_action" | "complete",
) {
  return {
    ...meta("turn_state_changed", sequence),
    type: "turn_state_changed",
    state,
  } as const;
}

function action(
  request: Action["request"],
  overrides: Partial<Action> = {},
): Action {
  return {
    ...meta("action", 2),
    type: "action",
    id: "action-1",
    revision: 1,
    state: "pending",
    request,
    result: null,
    created_at: occurredAt,
    expires_at: null,
    ...overrides,
  };
}

function client() {
  return new AomiClient({
    baseUrl: "https://portal.example",
    fetch: vi.fn(),
  });
}

describe("ClientSession Agent transport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("reduces one ordered Event page into messages, title, and lifecycle", async () => {
    const api = client();
    vi.spyOn(api.agent, "start").mockResolvedValue(
      page([
        {
          ...meta("message", 1),
          type: "message",
          message_key: "message-1",
          sender: "agent",
          content: "done",
          is_streaming: false,
        },
        {
          ...meta("title_changed", 2),
          type: "title_changed",
          title: "Agent thread",
        },
        turn(3, "complete"),
      ]),
    );
    const session = new Session(api, {
      sessionId: "session-agent",
      app: "default",
    });
    const events = vi.fn();
    session.on("event", events);

    await expect(session.send("hello")).resolves.toEqual({
      messages: [
        expect.objectContaining({
          id: "message-1",
          sender: "agent",
          content: "done",
        }),
      ],
      title: "Agent thread",
    });
    expect(api.agent.start).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-agent",
        message: "hello",
        app: "default",
      }),
      { idempotencyKey: expect.stringMatching(/^idem_[a-f0-9]{32}$/) },
    );
    expect(events.mock.calls.map(([event]) => event.sequence)).toEqual([
      1, 2, 3,
    ]);
    expect(session.getTurnState()).toBe("complete");
    session.close();
  });

  it("reuses the start Intent idempotency key after an uncertain response", async () => {
    const api = client();
    const start = vi
      .spyOn(api.agent, "start")
      .mockRejectedValueOnce(
        new AgentApiError(503, "upstream_unavailable", "try again", true),
      )
      .mockResolvedValue(page([turn(1, "complete")]));
    const session = new Session(api, { sessionId: "session-agent" });

    await expect(session.send("hello")).rejects.toThrow("try again");
    await expect(session.send("hello")).resolves.toBeDefined();

    expect(start).toHaveBeenCalledTimes(2);
    expect(start.mock.calls[0]?.[1]?.idempotencyKey).toBe(
      start.mock.calls[1]?.[1]?.idempotencyKey,
    );
    session.close();
  });

  it("preserves cursor order across tool progress and the terminal message", async () => {
    vi.useFakeTimers();
    const api = client();
    vi.spyOn(api.agent, "start").mockResolvedValue(
      page(
        [
          turn(1, "processing"),
          {
            ...meta("tool_update", 2),
            type: "tool_update",
            tool: "web_search",
            message: "Checking ETH price",
          },
        ],
        { cursor: "cursor-2" },
      ),
    );
    const poll = vi.spyOn(api.agent, "poll").mockResolvedValue(
      page(
        [
          {
            ...meta("message", 3),
            type: "message",
            sender: "agent",
            content: "ETH is $2,352.",
            is_streaming: false,
          },
          turn(4, "complete"),
        ],
        { cursor: "cursor-4" },
      ),
    );
    const session = new Session(api, {
      sessionId: "session-agent",
      pollIntervalMs: 10,
    });

    await session.sendAsync("Check ETH price");
    expect(session.getIsProcessing()).toBe(true);
    await vi.advanceTimersByTimeAsync(0);

    expect(poll).toHaveBeenCalledWith("session-agent", {
      cursor: "cursor-2",
      waitMs: 25_000,
    });
    expect(session.getMessages()).toEqual([
      expect.objectContaining({ content: "ETH is $2,352." }),
    ]);
    expect(session.getIsProcessing()).toBe(false);
    session.close();
  });

  it("keeps the complete EVM request in the Action and responds by revision", async () => {
    const api = client();
    const pending = action({
      type: "execute_evm",
      transactions: [
        {
          chain_id: 8453,
          from: "0x1111111111111111111111111111111111111111",
          to: "0x2222222222222222222222222222222222222222",
          value: "1",
          data: "0x1234",
          label: "Transfer",
          kind: "transfer",
        },
      ],
    });
    vi.spyOn(api.agent, "start").mockResolvedValue(
      page([turn(1, "processing"), pending, turn(3, "awaiting_action")]),
    );
    const respond = vi.spyOn(api.agent, "respondToAction").mockResolvedValue(
      action(pending.request, {
        sequence: 4,
        event_id: "event-4",
        revision: 2,
        state: "rejected",
        result: { status: "rejected", reason: "Not now" },
      }),
    );
    vi.spyOn(api.agent, "poll").mockResolvedValue(
      page([turn(5, "complete")], { cursor: "cursor-5" }),
    );
    const session = new Session(api, { sessionId: "session-agent" });

    await session.sendAsync("execute");
    expect(session.getPendingActions()).toEqual([pending]);
    await session.rejectAction("action-1", "Not now");

    expect(respond).toHaveBeenCalledWith("session-agent", "action-1", 1, {
      status: "rejected",
      reason: "Not now",
    });
    expect(session.getPendingActions()).toEqual([]);
    session.close();
  });

  it("recovers a signing Action from the Event ledger without snapshot state", async () => {
    const api = client();
    const pending = action({
      type: "sign",
      requestId: "sign-1",
      chainFamily: "evm",
      executionKind: "message",
      signer: "0x1111111111111111111111111111111111111111",
      chainId: 1,
      description: "Sign message",
      payloads: [{ kind: "evm_personal", message: "0x6869" }],
    });
    vi.spyOn(api.agent, "poll").mockResolvedValue(
      page([pending, turn(3, "awaiting_action")], { cursor: "cursor-3" }),
    );
    const session = new Session(api, { sessionId: "session-agent" });

    await session.fetchCurrentState();

    expect(session.getPendingActions()).toEqual([pending]);
    expect(session.getTurnState()).toBe("awaiting_action");
    expect(session.getIsPolling()).toBe(false);
    session.close();
  });
});

import { describe, expect, it, vi } from "vitest";

import { AgentFacade } from "./facade";
import { CursorCodec } from "./cursor";
import type { AgentKernel, KernelDelta } from "./kernel";

const principal = {
  kind: "account",
  canonicalUserId: "user-1",
  clientId: "client-1",
  scopes: ["agent"],
} as const;

function delta(): KernelDelta {
  return {
    response_type: "delta",
    thread_id: "sess_1234567890abcdefghijkl",
    turn_status: "thinking",
    snapshot: {
      messages: [
        { sender: "user", content: "hello", timestamp: 1_787_000_000 },
        { sender: "agent", content: "working", timestamp: 1_787_000_001 },
      ],
      system_events: [
        {
          type: "tool_complete",
          id: "call_1",
          tool_name: "get_balance",
          timestamp: 1_787_000_001,
        },
      ],
      is_processing: true,
    },
    events: [],
    actions: [],
    position: { stream_epoch: "epoch-1", event_sequence: 7 },
    resync_required: false,
  };
}

function kernel(): AgentKernel {
  return {
    startTurn: vi.fn(async () => delta()),
    readDelta: vi.fn(async () => delta()),
    submitActionResult: vi.fn(),
    interrupt: vi.fn(async () => ({ ...delta(), turn_status: "interrupted" })),
    listSessions: vi.fn(async () => ({
      sessions: [
        {
          thread_id: "sess_1234567890abcdefghijkl",
          application_id: "9223372036854775807",
          title: "A session",
          archived: false,
          created_at: 1_787_000_000,
          updated_at: 1_787_000_100,
        },
      ],
      nextThreadId: null,
    })),
    updateSession: vi.fn(),
    deleteSession: vi.fn(async () => undefined),
  };
}

describe("AgentFacade", () => {
  it("owns public app decoding, message/activity projection, and cursor binding", async () => {
    const rust = kernel();
    const facade = new AgentFacade(
      principal,
      rust,
      new CursorCodec(Buffer.alloc(32, 7)),
    );
    const response = await facade.chat({
      request: {
        session: "sess_1234567890abcdefghijkl",
        application: "app_9",
        message: "hello",
        wallets: { evm: { address: `0x${"1".repeat(40)}`, chainId: 8453 } },
      },
      idempotencyKey: "idem_1234567890123456",
      now: 1_000,
    });

    expect(rust.startTurn).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 9n,
        threadId: response.session,
      }),
    );
    expect(response).toMatchObject({
      turn: { status: "thinking" },
      messages: [{ role: "user" }, { role: "assistant" }],
      activity: [{ type: "tool", name: "get_balance" }],
    });
    expect(
      await facade.check({
        session: response.session,
        cursor: response.cursor,
        now: 1_001,
      }),
    ).toMatchObject({ session: response.session });
    expect(rust.readDelta).toHaveBeenCalledWith(
      expect.objectContaining({
        after: { stream_epoch: "epoch-1", event_sequence: 7 },
      }),
    );
  });

  it("keeps PostgreSQL bigint application identity lossless in session projection", async () => {
    const facade = new AgentFacade(
      principal,
      kernel(),
      new CursorCodec(Buffer.alloc(32, 8)),
    );
    const response = await facade.sessions();
    expect(response.sessions[0].application).toBe("app_7ZZZZZZZZZZZZ");
  });

  it("maps public action result fields to the normalized Rust contract", async () => {
    const rust = kernel();
    vi.mocked(rust.submitActionResult).mockRejectedValueOnce(new Error("stop"));
    const facade = new AgentFacade(
      principal,
      rust,
      new CursorCodec(Buffer.alloc(32, 9)),
    );
    await expect(
      facade.submitAction({
        session: "sess_1234567890abcdefghijkl",
        action: "act_1",
        idempotencyKey: "idem_1234567890123456",
        result: {
          status: "submitted",
          revision: 4,
          legs: [
            {
              id: "leg_1",
              status: "submitted",
              transactionId: `0x${"a".repeat(64)}`,
            },
          ],
        },
      }),
    ).rejects.toThrow("stop");
    expect(rust.submitActionResult).toHaveBeenCalledWith({
      threadId: "sess_1234567890abcdefghijkl",
      actionId: "act_1",
      expectedRevision: 4,
      idempotencyKey: "idem_1234567890123456",
      result: {
        result_type: "external_transaction",
        legs: [
          {
            leg_id: "leg_1",
            status: "submitted",
            transaction_id: `0x${"a".repeat(64)}`,
            signed_transaction_base64: undefined,
            reason: undefined,
          },
        ],
      },
    });
  });
});

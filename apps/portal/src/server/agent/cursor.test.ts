import { describe, expect, it, vi } from "vitest";

import { CursorCodec, CursorError } from "./cursor";
import { AgentEventProjector, type KernelDelta } from "./event-projector";

const secret = new TextEncoder().encode("a".repeat(32));

describe("authenticated public Agent cursors", () => {
  it("binds subject/session and rejects tampering and expiry", () => {
    const codec = new CursorCodec(secret, 60);
    const cursor = codec.issue({
      subject: "user-1",
      session: "sess_1234567890abcdef",
      epoch: "epoch-1",
      sequence: 7,
      now: 1_000,
    });
    expect(
      codec.verify(cursor, {
        subject: "user-1",
        session: "sess_1234567890abcdef",
        now: 1_059,
      }),
    ).toEqual({ epoch: "epoch-1", sequence: 7 });
    expect(() =>
      codec.verify(`${cursor.slice(0, -1)}x`, {
        subject: "user-1",
        session: "sess_1234567890abcdef",
        now: 1_001,
      }),
    ).toThrowError(CursorError);
    expect(() =>
      codec.verify(cursor, {
        subject: "user-2",
        session: "sess_1234567890abcdef",
        now: 1_001,
      }),
    ).toThrow("invalid_cursor");
    expect(() =>
      codec.verify(cursor, {
        subject: "user-1",
        session: "sess_1234567890abcdef",
        now: 1_060,
      }),
    ).toThrow("cursor_expired");
  });

  it("projects one Rust delta identically through long-poll and SSE", async () => {
    const delta: KernelDelta = {
      turnStatus: "awaiting_action",
      events: [{ sequence: 2, type: "action.staged" }],
      actions: [{ actionId: "act_1234567890abcdef", revision: 0 }],
      position: { streamEpoch: "epoch-1", eventSequence: 2 },
      resyncRequired: false,
    };
    const readDelta = vi.fn(async () => delta);
    const projector = new AgentEventProjector(new CursorCodec(secret), {
      readDelta,
    });
    const input = {
      subject: "user-1",
      session: "sess_1234567890abcdef",
      now: 1_000,
    };
    const polled = await projector.longPoll(input);
    const sse = await projector.sse(input);
    const streamed = JSON.parse(sse.slice("event: delta\ndata: ".length, -2));
    expect({ ...streamed, cursor: undefined }).toEqual({
      ...polled,
      cursor: undefined,
    });
    expect(readDelta).toHaveBeenCalledTimes(2);
  });

  it("passes only verified positions to Rust and carries resync authority back", async () => {
    const codec = new CursorCodec(secret);
    const cursor = codec.issue({
      subject: "user-1",
      session: "sess_1234567890abcdef",
      epoch: "old-epoch",
      sequence: 99,
      now: 1_000,
    });
    const readDelta = vi.fn(async () => ({
      turnStatus: "idle",
      events: [],
      actions: [],
      position: { streamEpoch: "new-epoch", eventSequence: 3 },
      resyncRequired: true,
    }));
    const projected = await new AgentEventProjector(codec, {
      readDelta,
    }).longPoll({
      subject: "user-1",
      session: "sess_1234567890abcdef",
      cursor,
      waitMs: 60_000,
      now: 1_001,
    });
    expect(readDelta).toHaveBeenCalledWith({
      session: "sess_1234567890abcdef",
      after: { streamEpoch: "old-epoch", eventSequence: 99 },
      waitMs: 30_000,
    });
    expect(projected).toMatchObject({
      resyncRequired: true,
      position: { streamEpoch: "new-epoch", eventSequence: 3 },
    });
  });
});

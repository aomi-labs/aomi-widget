import { describe, expect, it } from "vitest";
import type { Event } from "@aomi-labs/client";

import { projectAssistantMessages } from "../utils";

const meta = (sequence: number, type: Event["type"], turnId: string | null) => ({
  event_id: `event-${sequence}`,
  sequence,
  turn_id: turnId,
  occurred_at: 1_735_000_000_000 + sequence,
  type,
});

describe("projectAssistantMessages", () => {
  it("projects one ordered turn without owning a second reducer", () => {
    const events: Event[] = [
      {
        ...meta(1, "message", "turn-1"),
        type: "message",
        sender: "user",
        content: "swap",
        message_key: "user-1",
      },
      {
        ...meta(2, "tool_update", "turn-1"),
        type: "tool_update",
        id: "tool-1",
        call_id: "call-1",
        tool_name: "quote",
        result: { stage: "started" },
      },
      {
        ...meta(3, "tool_complete", "turn-1"),
        type: "tool_complete",
        id: "tool-1",
        call_id: "call-1",
        tool_name: "quote",
        result: { amount: "1" },
      },
      {
        ...meta(4, "message", "turn-1"),
        type: "message",
        sender: "agent",
        content: "Done",
        message_key: "agent-1",
      },
    ];

    const projected = projectAssistantMessages(events);
    expect(projected).toHaveLength(2);
    expect(projected[0]).toMatchObject({ role: "user" });
    expect(projected[1]?.content).toMatchObject([
      {
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "quote",
        result: { amount: "1" },
      },
      { type: "text", text: "Done" },
    ]);
  });

  it("replaces streaming message revisions by message key", () => {
    const messages: Event[] = [
      {
        ...meta(1, "message", "turn-1"),
        type: "message",
        sender: "agent",
        content: "Do",
        message_key: "agent-1",
        is_streaming: true,
      },
      {
        ...meta(2, "message", "turn-1"),
        type: "message",
        sender: "agent",
        content: "Done",
        message_key: "agent-1",
        is_streaming: false,
      },
    ];

    expect(projectAssistantMessages(messages)[0]?.content).toEqual([
      { type: "text", text: "Done" },
    ]);
  });
});

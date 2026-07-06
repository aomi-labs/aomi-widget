import { describe, expect, it } from "vitest";
import type { ThreadMessageLike } from "@assistant-ui/react";

import { mergeAssistantTurns } from "../merge-turns";

const user = (text: string): ThreadMessageLike => ({
  role: "user",
  content: [{ type: "text", text }],
});

const tool = (toolName: string): ThreadMessageLike => ({
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: `tc_${toolName}`,
      toolName,
      args: {},
      result: { ok: true },
    },
  ],
});

const assistantText = (text: string): ThreadMessageLike => ({
  role: "assistant",
  content: [{ type: "text", text }],
});

const notice = (text: string): ThreadMessageLike => ({
  role: "assistant",
  content: [{ type: "text", text }],
  metadata: { custom: { aomiNoticeKind: "payment_required" } },
});

const partTypes = (m: ThreadMessageLike) =>
  (m.content as { type: string }[]).map((p) => p.type);

describe("mergeAssistantTurns", () => {
  it("folds a contiguous tool + text run into one assistant message", () => {
    const merged = mergeAssistantTurns([
      user("swap 250 USDC"),
      tool("get_balance"),
      tool("get_quote"),
      assistantText("Here is your route."),
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[0]!.role).toBe("user");
    expect(merged[1]!.role).toBe("assistant");
    expect(partTypes(merged[1]!)).toEqual(["tool-call", "tool-call", "text"]);
  });

  it("leaves a single assistant message untouched", () => {
    const input = [user("hi"), assistantText("hello")];
    const merged = mergeAssistantTurns(input);
    expect(merged).toHaveLength(2);
    expect(partTypes(merged[1]!)).toEqual(["text"]);
  });

  it("keeps separate turns separate (bounded by user messages)", () => {
    const merged = mergeAssistantTurns([
      user("q1"),
      tool("a"),
      assistantText("answer 1"),
      user("q2"),
      tool("b"),
      assistantText("answer 2"),
    ]);

    expect(merged.map((m) => m.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(partTypes(merged[1]!)).toEqual(["tool-call", "text"]);
    expect(partTypes(merged[3]!)).toEqual(["tool-call", "text"]);
  });

  it("does not merge a payment-required notice into the turn", () => {
    const merged = mergeAssistantTurns([
      user("do a thing"),
      tool("a"),
      assistantText("done"),
      notice("You're out of funds."),
    ]);

    // turn merges to one message; the notice stays standalone after it
    expect(merged).toHaveLength(3);
    expect(partTypes(merged[1]!)).toEqual(["tool-call", "text"]);
    expect(
      (merged[2]!.metadata?.custom as Record<string, unknown>).aomiNoticeKind,
    ).toBe("payment_required");
  });

  it("normalizes string content when merging", () => {
    const merged = mergeAssistantTurns([
      { role: "assistant", content: "part one " },
      { role: "assistant", content: [{ type: "text", text: "part two" }] },
    ]);

    expect(merged).toHaveLength(1);
    expect(partTypes(merged[0]!)).toEqual(["text", "text"]);
  });

  it("returns an empty list unchanged", () => {
    expect(mergeAssistantTurns([])).toEqual([]);
  });

  it("assigns unique, stable tool-call ids across a merged turn", () => {
    // Simulate the `tool_${Date.now()}` collision: identical ids on two calls.
    const collide = (): ThreadMessageLike => ({
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "tool_SAME",
          toolName: "x",
          args: {},
          result: { ok: true },
        },
      ],
    });

    const merged = mergeAssistantTurns([user("go"), collide(), collide()]);
    const ids = (merged[1]!.content as { type: string; toolCallId?: string }[])
      .filter((p) => p.type === "tool-call")
      .map((p) => p.toolCallId);

    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2); // unique despite identical source ids

    // deterministic: same input → same ids (stable across polls)
    const again = mergeAssistantTurns([user("go"), collide(), collide()]);
    const ids2 = (again[1]!.content as { toolCallId?: string }[]).map(
      (p) => p.toolCallId,
    );
    expect(ids2).toEqual(ids);
  });
});

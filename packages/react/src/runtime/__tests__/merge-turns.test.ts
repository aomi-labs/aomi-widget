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

  it("collapses contiguous text-only assistant fragments to the latest answer", () => {
    const merged = mergeAssistantTurns([
      user("hey"),
      assistantText(
        "I'm connected on Base and ready. Tell me what you'd like to do.",
      ),
      assistantText("Hey — I'm connected on Base and ready."),
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[1]!.content).toEqual([
      { type: "text", text: "Hey — I'm connected on Base and ready." },
    ]);
  });

  it("collapses duplicated adjacent text inside one assistant fragment", () => {
    const text =
      "I'm here — connected on Base with your wallet. What would you like to do next?";
    const merged = mergeAssistantTurns([
      user("hey"),
      assistantText(text + text),
    ]);

    expect(merged).toHaveLength(2);
    expect(merged[1]!.content).toEqual([{ type: "text", text }]);
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

  it("keeps the latest string content for text-only fragments", () => {
    const merged = mergeAssistantTurns([
      { role: "assistant", content: "part one " },
      { role: "assistant", content: [{ type: "text", text: "part two" }] },
    ]);

    expect(merged).toHaveLength(1);
    expect(partTypes(merged[0]!)).toEqual(["text"]);
    expect(merged[0]!.content).toEqual([{ type: "text", text: "part two" }]);
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

  it("preserves per-part metadata (the aomiTask join key) through re-keying", () => {
    const taskPart = {
      type: "tool-call" as const,
      toolCallId: "tool_SAME",
      toolName: "task",
      args: { label: "swap-worker" },
      result: { agent_id: "task-agent:9f2c", staged_count: 1 },
      metadata: { custom: { aomiTask: { agentId: "task-agent:9f2c" } } },
    };
    const taskMessage = {
      role: "assistant",
      content: [taskPart],
    } as unknown as ThreadMessageLike;

    const merged = mergeAssistantTurns([
      user("delegate it"),
      tool("get_balance"),
      taskMessage,
      assistantText("Delegated and staged."),
    ]);

    const parts = merged[1]!.content as Array<
      Record<string, unknown> & { type: string }
    >;
    expect(parts.map((p) => p.type)).toEqual([
      "tool-call",
      "tool-call",
      "text",
    ]);
    expect(parts[1]).toMatchObject({
      toolName: "task",
      metadata: { custom: { aomiTask: { agentId: "task-agent:9f2c" } } },
    });
    // Re-keyed, but the metadata rode along.
    expect(parts[1]!.toolCallId).not.toBe("tool_SAME");
  });
});

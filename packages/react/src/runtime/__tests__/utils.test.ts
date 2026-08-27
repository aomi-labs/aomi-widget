import { describe, expect, it } from "vitest";

import { readTaskPartAgentId, toInboundMessage } from "../utils";
import type { AomiMessage } from "@aomi-labs/client";

type Part = Record<string, unknown> & { type: string };

const partsOf = (message: { content: unknown } | null): Part[] =>
  (message?.content as Part[]) ?? [];

describe("toInboundMessage", () => {
  it("drops internal system-endpoint acknowledgements", () => {
    const message = toInboundMessage({
      sender: "system",
      content:
        'Response of system endpoint: {"type":"wallet:state_changed","payload":{"connection":{"is_connected":true}}}',
      tool_result: null,
      timestamp: "2026-08-02T04:41:35Z",
      is_streaming: false,
    });

    expect(message).toBeNull();
  });

  it("drops persisted credit records from the chat projection", () => {
    const message = toInboundMessage({
      sender: "system",
      content:
        "Completion credit budget is exhausted. Please add credits and try again.",
      tool_result: null,
      timestamp: "2026-07-25T23:26:40Z",
      is_streaming: false,
    });

    expect(message).toBeNull();
  });

  it("attaches the aomiTask join key to completed task tool calls", () => {
    const message = toInboundMessage({
      sender: "agent",
      tool_name: "task",
      tool_arguments: { label: "swap-worker", prompt: "swap 250 USDC" },
      tool_result: [
        "Delegation",
        JSON.stringify({
          agent_id: "task-agent:9f2c",
          status: "completed",
          staged_count: 1,
        }),
      ],
      timestamp: "2026-08-03T10:00:00Z",
      is_streaming: false,
    });

    const [part] = partsOf(message);
    expect(part).toMatchObject({
      type: "tool-call",
      // tool_name wins over the tool_result topic
      toolName: "task",
      args: { label: "swap-worker", prompt: "swap 250 USDC" },
      result: {
        agent_id: "task-agent:9f2c",
        status: "completed",
        staged_count: 1,
      },
      metadata: { custom: { aomiTask: { agentId: "task-agent:9f2c" } } },
    });
    expect(readTaskPartAgentId(part)).toBe("task-agent:9f2c");
  });

  it("omits the aomiTask key when the task result carries no agent_id", () => {
    const message = toInboundMessage({
      sender: "agent",
      tool_name: "task",
      tool_result: ["Delegation", JSON.stringify({ status: "failed" })],
    });

    const [part] = partsOf(message);
    expect(part).toMatchObject({ type: "tool-call", toolName: "task" });
    expect(part!.metadata).toBeUndefined();
    expect(readTaskPartAgentId(part)).toBeUndefined();
  });

  it("does not attach the aomiTask key to ordinary tool calls", () => {
    const message = toInboundMessage({
      sender: "agent",
      tool_name: "get_balance",
      tool_arguments: { token: "USDC" },
      tool_result: ["Balance", JSON.stringify({ agent_id: "not-a-task" })],
    });

    const [part] = partsOf(message);
    expect(part).toMatchObject({
      type: "tool-call",
      toolName: "get_balance",
      args: { token: "USDC" },
    });
    expect(part!.metadata).toBeUndefined();
  });

  it("falls back to the tool_result topic when tool_name is absent", () => {
    const message = toInboundMessage({
      sender: "agent",
      tool_result: ["get_quote", JSON.stringify({ ok: true })],
    });

    expect(partsOf(message)[0]).toMatchObject({
      type: "tool-call",
      toolName: "get_quote",
      result: { ok: true },
    });
    expect(partsOf(message)[0]!.args).toBeUndefined();
  });

  it("drops other persisted system records from the chat projection", () => {
    const message = toInboundMessage({
      sender: "system",
      content: "The requested operation could not be completed.",
      tool_result: null,
      timestamp: "2026-07-25T23:26:40Z",
      is_streaming: false,
    });

    expect(message).toBeNull();
  });

  it("drops the backend's raw system-endpoint echo from the thread", () => {
    // thread.rs transcribes every /api/system callback verbatim for the
    // model's benefit; the CLI has always hidden these lines from display.
    const message = toInboundMessage({
      sender: "system",
      content:
        'Response of system endpoint: {"type":"wallet:tx_complete","payload":{"txHash":"","status":"failed","error":"HTTP 400: Bad Request"}}',
      tool_result: null,
      timestamp: "2026-07-25T23:26:40Z",
      is_streaming: false,
    });

    expect(message).toBeNull();
  });

  it("drops the echo even when its payload mentions payment words", () => {
    // The prefix guard must win over isCreditNotice: a tx callback that
    // happens to contain "payment" is not a credits card.
    const message = toInboundMessage({
      sender: "system",
      content:
        'Response of system endpoint: {"type":"wallet:tx_complete","payload":{"error":"payment required"}}',
      tool_result: null,
      timestamp: "2026-07-25T23:26:40Z",
      is_streaming: false,
    });

    expect(message).toBeNull();
  });

  it("never drops user messages that quote the echo prefix", () => {
    const message = toInboundMessage({
      sender: "user",
      content: "Response of system endpoint: what does this mean?",
      tool_result: null,
      timestamp: "2026-07-25T23:26:40Z",
      is_streaming: false,
    });

    expect(message).toMatchObject({ role: "user" });
  });
});

describe("notice projection", () => {
  const notice = (message_key?: string) => ({
    sender: "notice",
    content: "This app hit an error and couldn't respond.",
    message_key,
  });

  it("gives two failures distinct ids even though their copy is identical", () => {
    // Every failure notice carries the same words by design, so a
    // content-derived id would collide and let one failure overwrite — or
    // remount — the other in the transcript.
    const first = toInboundMessage(notice("turn-failure:turn-a:notice"), 0);
    const second = toInboundMessage(notice("turn-failure:turn-b:notice"), 1);

    expect(first?.id).not.toEqual(second?.id);
  });

  it("keeps the id stable across re-projection of the same notice", () => {
    // The projection reruns on every poll; an unstable id remounts the card.
    const key = "turn-failure:turn-a:notice";
    expect(toInboundMessage(notice(key), 3)?.id).toEqual(
      toInboundMessage(notice(key), 3)?.id,
    );
  });

  it("falls back to position for legacy rows carrying no key", () => {
    const first = toInboundMessage(notice(), 0);
    const second = toInboundMessage(notice(), 1);

    expect(first?.id).not.toEqual(second?.id);
  });

  it("renders as an error notice card", () => {
    const projected = toInboundMessage(notice("k"), 0);
    expect(projected?.role).toBe("assistant");
    expect(
      (projected?.metadata?.custom as { aomiNoticeKind?: string } | undefined)
        ?.aomiNoticeKind,
    ).toBe("error");
  });
});

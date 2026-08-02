import { describe, expect, it } from "vitest";

import { collectTxOutcomes, toInboundMessage } from "../utils";
import type { AomiMessage } from "@aomi-labs/client";

const echoMessage = (payload: unknown): AomiMessage =>
  ({
    sender: "system",
    content: `Response of system endpoint: ${JSON.stringify({
      type: "wallet:tx_complete",
      payload,
    })}`,
    tool_result: null,
    timestamp: "2026-07-31T00:00:00Z",
    is_streaming: false,
  }) as AomiMessage;

describe("toInboundMessage", () => {
  it("renders backend credit errors as an actionable assistant notice", () => {
    const message = toInboundMessage({
      sender: "system",
      content:
        "Completion credit budget is exhausted. Please add credits and try again.",
      tool_result: null,
      timestamp: "2026-07-25T23:26:40Z",
      is_streaming: false,
    });

    expect(message).toMatchObject({
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Completion credit budget is exhausted. Please add credits and try again.",
        },
      ],
      metadata: {
        custom: {
          aomiNoticeKind: "payment_required",
          aomiNoticeTitle: "Credits needed",
        },
      },
    });
  });

  it("keeps non-credit system messages visible as notices", () => {
    const message = toInboundMessage({
      sender: "system",
      content: "The requested operation could not be completed.",
      tool_result: null,
      timestamp: "2026-07-25T23:26:40Z",
      is_streaming: false,
    });

    expect(message).toMatchObject({
      role: "assistant",
      metadata: {
        custom: {
          aomiNoticeKind: "system_notice",
          aomiNoticeTitle: "System notice",
        },
      },
    });
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

describe("collectTxOutcomes", () => {
  it("maps pending tx ids to their final outcome", () => {
    const outcomes = collectTxOutcomes([
      echoMessage({
        txHash: "",
        status: "failed",
        error: "HTTP 400: Bad Request",
        pending_tx_ids: [1],
      }),
    ]);

    expect(outcomes?.get(1)).toEqual({
      status: "failed",
      error: "HTTP 400: Bad Request",
    });
  });

  it("lets the latest callback win for the same id", () => {
    const outcomes = collectTxOutcomes([
      echoMessage({ txHash: "", status: "failed", pending_tx_ids: [2] }),
      echoMessage({ txHash: "0xabc", status: "success", pending_tx_ids: [2] }),
    ]);

    expect(outcomes?.get(2)).toEqual({ status: "success", txHash: "0xabc" });
  });

  it("returns null when the transcript has no callbacks", () => {
    expect(
      collectTxOutcomes([
        {
          sender: "user",
          content: "hello",
          tool_result: null,
          timestamp: "2026-07-31T00:00:00Z",
          is_streaming: false,
        } as AomiMessage,
      ]),
    ).toBeNull();
  });
});

describe("toInboundMessage tx outcome enrichment", () => {
  const stagedToolMessage = (): AomiMessage =>
    ({
      sender: "assistant",
      content: "",
      tool_result: [
        "Stage transfer of 0.1 ETH",
        JSON.stringify({
          chain_id: 1,
          kind: "native_transfer",
          pending_tx_id: 1,
          current_lifecycle: "queued",
        }),
      ],
      timestamp: "2026-07-31T00:00:00Z",
      is_streaming: false,
    }) as AomiMessage;

  it("attaches the outcome to the matching staged tool result", () => {
    const outcomes = collectTxOutcomes([
      echoMessage({
        txHash: "",
        status: "failed",
        error: "boom",
        pending_tx_ids: [1],
      }),
    ]);
    const message = toInboundMessage(stagedToolMessage(), outcomes);
    const part = (
      message?.content as Array<{ type: string; result?: unknown }>
    ).find((entry) => entry.type === "tool-call");

    expect(part?.result).toMatchObject({
      pending_tx_id: 1,
      current_lifecycle: "queued",
      tx_outcome: { status: "failed", error: "boom" },
    });
  });

  it("leaves unrelated staged results untouched", () => {
    const outcomes = collectTxOutcomes([
      echoMessage({ txHash: "", status: "failed", pending_tx_ids: [99] }),
    ]);
    const message = toInboundMessage(stagedToolMessage(), outcomes);
    const part = (
      message?.content as Array<{ type: string; result?: unknown }>
    ).find((entry) => entry.type === "tool-call");

    expect(part?.result).not.toHaveProperty("tx_outcome");
  });
});

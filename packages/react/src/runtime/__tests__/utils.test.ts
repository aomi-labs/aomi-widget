import { describe, expect, it } from "vitest";

import { collectTxOutcomes, toInboundMessage } from "../utils";
import type { AomiMessage } from "@aomi-labs/client";

const echoMessage = (
  payload: unknown,
  type = "wallet:tx_complete",
): AomiMessage =>
  ({
    sender: "system",
    content: `Response of system endpoint: ${JSON.stringify({
      type,
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

    expect(outcomes?.evm.get(1)).toEqual({
      status: "failed",
      error: "HTTP 400: Bad Request",
    });
  });

  it("lets the latest callback win for the same id", () => {
    const outcomes = collectTxOutcomes([
      echoMessage({ txHash: "", status: "failed", pending_tx_ids: [2] }),
      echoMessage({ txHash: "0xabc", status: "success", pending_tx_ids: [2] }),
    ]);

    expect(outcomes?.evm.get(2)).toEqual({ status: "success", txHash: "0xabc" });
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

describe("collectTxOutcomes solana callbacks", () => {
  it("maps solana completions into the svm id-space, not the evm one", () => {
    const outcomes = collectTxOutcomes([
      echoMessage(
        { status: "submitted", signature: "5xSig", pending_solana_id: 1 },
        "wallet::solana_send_complete",
      ),
    ]);

    expect(outcomes?.svm.get(1)).toEqual({ status: "success", txHash: "5xSig" });
    // Same numeric id must NOT leak into the EVM map — the spaces collide.
    expect(outcomes?.evm.get(1)).toBeUndefined();
  });

  it("treats a rejected solana request as failed", () => {
    const outcomes = collectTxOutcomes([
      echoMessage(
        { status: "rejected", pending_solana_id: 3 },
        "wallet::solana_sign_and_send_complete",
      ),
    ]);

    expect(outcomes?.svm.get(3)).toEqual({ status: "failed" });
  });

  it("joins svm outcomes to staged envelopes via the unsigned tx blob", () => {
    // The staged pending_approval envelope has no pending_solana_id — the
    // blob is the only key present on both sides (policy/svm.rs).
    const outcomes = collectTxOutcomes([
      echoMessage(
        {
          status: "submitted",
          signature: "5xSig",
          unsigned_tx: "AQAAbase64blob",
          pending_solana_id: 2,
        },
        "wallet::solana_sign_and_send_complete",
      ),
    ]);
    const message = toInboundMessage(
      {
        sender: "assistant",
        content: "",
        tool_result: [
          "Stage Jupiter swap",
          JSON.stringify({
            status: "pending_approval",
            chain_kind: "svm",
            svm_ix_ids: [1],
            unsigned_tx: "AQAAbase64blob",
          }),
        ],
        timestamp: "2026-08-01T00:00:00Z",
        is_streaming: false,
      } as AomiMessage,
      outcomes,
    );
    const part = (
      message?.content as Array<{ type: string; result?: unknown }>
    ).find((entry) => entry.type === "tool-call");

    expect(part?.result).toMatchObject({
      tx_outcome: { status: "success", txHash: "5xSig" },
    });
  });

  it("ignores sign-message completions (no staged tx to reconcile)", () => {
    const outcomes = collectTxOutcomes([
      echoMessage(
        { status: "signed", signature: "s", pending_solana_id: 4 },
        "wallet::solana_sign_message_complete",
      ),
    ]);

    expect(outcomes).toBeNull();
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

import { describe, expect, it } from "vitest";

import {
  collectTxOutcomes,
  readTaskPartAgentId,
  toInboundMessage,
} from "../utils";
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
    const first = toInboundMessage(notice("turn-failure:turn-a:notice"), null, 0);
    const second = toInboundMessage(notice("turn-failure:turn-b:notice"), null, 1);

    expect(first?.id).not.toEqual(second?.id);
  });

  it("keeps the id stable across re-projection of the same notice", () => {
    // The projection reruns on every poll; an unstable id remounts the card.
    const key = "turn-failure:turn-a:notice";
    expect(toInboundMessage(notice(key), null, 3)?.id).toEqual(
      toInboundMessage(notice(key), null, 3)?.id,
    );
  });

  it("falls back to position for legacy rows carrying no key", () => {
    const first = toInboundMessage(notice(), null, 0);
    const second = toInboundMessage(notice(), null, 1);

    expect(first?.id).not.toEqual(second?.id);
  });

  it("renders as an error notice card", () => {
    const projected = toInboundMessage(notice("k"), null, 0);
    expect(projected?.role).toBe("assistant");
    expect(
      (projected?.metadata?.custom as { aomiNoticeKind?: string } | undefined)
        ?.aomiNoticeKind,
    ).toBe("error");
  });
});

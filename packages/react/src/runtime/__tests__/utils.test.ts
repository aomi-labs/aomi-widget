import { describe, expect, it } from "vitest";

import { toInboundMessage } from "../utils";

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
});

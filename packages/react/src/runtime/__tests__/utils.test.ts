import { describe, expect, it } from "vitest";

import { toInboundMessage } from "../utils";

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

  it("keeps persisted system records out of assistant chat bubbles", () => {
    const message = toInboundMessage({
      sender: "system",
      content:
        "Completion credit budget is exhausted. Please add credits and try again.",
      tool_result: null,
      timestamp: "2026-07-25T23:26:40Z",
      is_streaming: false,
    });

    expect(message).toMatchObject({
      role: "system",
      content: [
        {
          type: "text",
          text: "Completion credit budget is exhausted. Please add credits and try again.",
        },
      ],
    });
  });

  it("maps non-credit system records to the hidden system renderer", () => {
    const message = toInboundMessage({
      sender: "system",
      content: "The requested operation could not be completed.",
      tool_result: null,
      timestamp: "2026-07-25T23:26:40Z",
      is_streaming: false,
    });

    expect(message).toMatchObject({
      role: "system",
      content: [
        {
          type: "text",
          text: "The requested operation could not be completed.",
        },
      ],
    });
  });
});

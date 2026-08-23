import { describe, expect, it } from "vitest";

import { mcpOperationKey } from "./thread";

describe("Pipeline MCP operation identity", () => {
  it("matches Rust serde_json plus UUIDv5 identity exactly", () => {
    const arguments_ = {
      tool_id: "evm_commit_txs",
      app: "default",
      thread_id: "thread-1",
    };

    expect(
      mcpOperationKey("canonical-user", 7, "aomi_call_tool", arguments_),
    ).toBe("mcp-op-b4db5dd5-3221-59a2-adcb-c70577d98ed0");
  });

  it("is stable across object insertion order and scoped to the request id", () => {
    const first = mcpOperationKey("user", "request-1", "aomi_call_tool", {
      z: { second: 2, first: 1 },
      a: true,
    });
    const reordered = mcpOperationKey("user", "request-1", "aomi_call_tool", {
      a: true,
      z: { first: 1, second: 2 },
    });

    expect(reordered).toBe(first);
    expect(
      mcpOperationKey("user", "request-2", "aomi_call_tool", {
        a: true,
        z: { first: 1, second: 2 },
      }),
    ).not.toBe(first);
  });

  it("matches Rust for floats and integers beyond JavaScript's safe range", () => {
    expect(
      mcpOperationKey("canonical-user", 7, "aomi_call_tool", {
        tool_id: "evm_commit_txs",
        whole: 1,
        fraction: 1.5,
        unsafe_integer: Number("9007199254740993"),
      }),
    ).toBe("mcp-op-042ba5d1-2da0-563c-a56a-59ca4c9ebf9c");
  });
});

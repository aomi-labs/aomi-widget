// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { handleMcpPost, mcpMethodNotAllowed } from "./rpc";

const tool = {
  name: "aomi_test",
  description: "test tool",
  inputSchema: { type: "object" },
};

function request(body: unknown): Request {
  return new Request("https://portal.example/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("MCP RPC shell", () => {
  it("returns initialization metadata and model instructions", async () => {
    const response = await handleMcpPost(
      request({ jsonrpc: "2.0", id: 1, method: "initialize" }),
      { tools: [tool], instructions: "chat then check", dispatchTool: vi.fn() },
    );
    const body = await response.json();
    expect(body.result).toMatchObject({
      protocolVersion: "2025-06-18",
      instructions: "chat then check",
      capabilities: { tools: { listChanged: false } },
    });
    expect(response.headers.get("mcp-protocol-version")).toBe("2025-06-18");
  });

  it("lists and calls the configured surface", async () => {
    const dispatchTool = vi.fn().mockResolvedValue({
      result: { status: "processing" },
      isError: false,
    });
    const listed = await handleMcpPost(
      request({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      { tools: [tool], instructions: "", dispatchTool },
    );
    expect((await listed.json()).result.tools).toEqual([tool]);

    const called = await handleMcpPost(
      request({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "aomi_test", arguments: { message: "hello" } },
      }),
      { tools: [tool], instructions: "", dispatchTool },
    );
    expect(dispatchTool).toHaveBeenCalledWith("aomi_test", {
      message: "hello",
    });
    expect((await called.json()).result).toMatchObject({ isError: false });
  });

  it("preserves parse, batch, notification, and method boundaries", async () => {
    const config = { tools: [tool], instructions: "", dispatchTool: vi.fn() };
    expect(
      (await (await handleMcpPost(request("{"), config)).json()).error.code,
    ).toBe(-32700);
    expect(
      (await (await handleMcpPost(request([]), config)).json()).error.code,
    ).toBe(-32600);
    expect(
      (
        await handleMcpPost(
          request({ jsonrpc: "2.0", method: "notifications/initialized" }),
          config,
        )
      ).status,
    ).toBe(202);
    expect(
      (
        await handleMcpPost(
          request({ jsonrpc: "2.0", id: 9, method: "missing" }),
          config,
        )
      ).status,
    ).toBe(200);
    expect(mcpMethodNotAllowed().status).toBe(405);
  });
});

// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  proxyAgentApi: vi.fn(),
  handleMcpPost: vi.fn(),
  dispatchTool: vi.fn(),
}));

vi.mock("@portal/server/agent-api-proxy", () => ({
  proxyAgentApi: mocks.proxyAgentApi,
}));
vi.mock("@portal/server/mcp/rpc", () => ({
  handleMcpPost: mocks.handleMcpPost,
}));
vi.mock("@portal/server/mcp/tools", () => ({
  MCP_TOOLS: [{ name: "aomi_list_apps" }],
  dispatchTool: mocks.dispatchTool,
}));

import { handlePipelineMcp } from "./pipeline-mcp-route";

describe("Pipeline MCP cutover", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.proxyAgentApi.mockReset().mockResolvedValue(new Response("rust"));
    mocks.handleMcpPost.mockReset().mockResolvedValue(new Response("legacy"));
    mocks.dispatchTool.mockReset();
  });

  it("uses the Rust presenter by default without changing the public URL", async () => {
    const request = new Request("https://portal.example/api/mcp/direct?x=1", {
      method: "POST",
      body: "{}",
    });
    expect(await (await handlePipelineMcp(request, "user-1")).text()).toBe(
      "rust",
    );

    const [proxied, user] = mocks.proxyAgentApi.mock.calls[0] as [
      Request,
      string,
    ];
    expect(proxied.url).toBe("https://portal.example/v1/pipeline/mcp?x=1");
    expect(user).toBe("user-1");
    expect(mocks.handleMcpPost).not.toHaveBeenCalled();
  });

  it("restores the retained TypeScript inventory on rollback", async () => {
    vi.stubEnv("AOMI_PIPELINE_ROLLBACK_MODE", "legacy");
    const request = new Request("https://portal.example/api/mcp/direct", {
      method: "POST",
      headers: {
        "idempotency-key": "mcp-1",
        "payment-signature": "paid-1",
      },
      body: "{}",
    });
    expect(await (await handlePipelineMcp(request, "user-1")).text()).toBe(
      "legacy",
    );

    const [, config] = mocks.handleMcpPost.mock.calls[0] as [
      Request,
      {
        tools: Array<{ name: string }>;
        instructions: string;
        dispatchTool: (
          name: string,
          args: Record<string, unknown>,
          requestId: number | string | null,
        ) => Promise<unknown>;
      },
    ];
    expect(config.tools.map((tool) => tool.name)).toEqual(["aomi_list_apps"]);
    expect(config.instructions).toContain("builtin apps only");
    expect(config.instructions).toContain("returns 501");
    expect(config.instructions).toContain("Phase 10");
    await config.dispatchTool("aomi_list_apps", { limit: 1 }, 7);
    expect(mocks.dispatchTool).toHaveBeenCalledWith(
      "user-1",
      "aomi_list_apps",
      {
        limit: 1,
      },
      { idempotencyKey: "mcp-1", paymentSignature: "paid-1" },
    );
    expect(mocks.proxyAgentApi).not.toHaveBeenCalled();
  });

  it("derives the Rust-compatible operation key when the caller omits one", async () => {
    vi.stubEnv("AOMI_PIPELINE_ROLLBACK_MODE", "legacy");
    const request = new Request("https://portal.example/api/mcp/direct", {
      method: "POST",
      body: "{}",
    });
    await handlePipelineMcp(request, "canonical-user");
    const [, config] = mocks.handleMcpPost.mock.calls[0] as [
      Request,
      {
        dispatchTool: (
          name: string,
          args: Record<string, unknown>,
          requestId: number | string | null,
        ) => Promise<unknown>;
      },
    ];
    const args = {
      tool_id: "evm_commit_txs",
      app: "default",
      thread_id: "thread-1",
    };
    await config.dispatchTool("aomi_call_tool", args, 7);
    expect(mocks.dispatchTool).toHaveBeenCalledWith(
      "canonical-user",
      "aomi_call_tool",
      args,
      {
        idempotencyKey: "mcp-op-b4db5dd5-3221-59a2-adcb-c70577d98ed0",
        paymentSignature: undefined,
      },
    );
  });
});

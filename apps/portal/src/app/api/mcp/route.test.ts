import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  dispatchTool: vi.fn(),
  resolveCanonicalUser: vi.fn(),
}));

vi.mock("@aomi-labs/account/better-auth", () => ({ auth: {} }));
vi.mock("better-auth/plugins", () => ({
  withMcpAuth:
    (
      _auth: unknown,
      handler: (request: Request, session: { userId: string }) => unknown,
    ) =>
    (request: Request) =>
      handler(request, { userId: "better-auth-user" }),
}));
vi.mock("@portal/server/bff/failures", () => ({
  portalFailures: {
    handle: (input: {
      error: unknown;
      response: { status: number };
      context: Record<string, unknown>;
    }) =>
      mocks.capture(input.error, {
        ...input.context,
        status: input.response.status,
      }),
  },
}));
vi.mock("@portal/server/mcp/session", () => ({
  resolveMcpCanonicalUser: mocks.resolveCanonicalUser,
}));
vi.mock("@portal/server/mcp/tools", () => ({
  MCP_TOOLS: [],
  dispatchTool: mocks.dispatchTool,
}));

import { POST } from "./route";

describe("MCP route observability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveCanonicalUser.mockResolvedValue({ id: "canonical-user" });
  });

  it("captures a local dispatch failure once and returns a stable JSON-RPC error", async () => {
    const original = new Error("private MCP arguments and result");
    mocks.dispatchTool.mockRejectedValue(original);

    const response = await POST(
      new Request("https://portal.aomi.dev/api/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 7,
          method: "tools/call",
          params: { name: "private-tool", arguments: { prompt: "private" } },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      jsonrpc: "2.0",
      id: 7,
      error: { code: -32603, message: "internal_error" },
    });
    expect(mocks.capture).toHaveBeenCalledOnce();
    expect(mocks.capture).toHaveBeenCalledWith(original, {
      routeFamily: "/api/mcp",
      operation: "mcp_tools_call",
      method: "POST",
      status: 200,
    });
  });
});

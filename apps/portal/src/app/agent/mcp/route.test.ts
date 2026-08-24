import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: vi.fn(() => true),
  error: vi.fn(),
  handler: undefined as
    | ((request: Request, claims: Record<string, unknown>) => Promise<Response>)
    | undefined,
  options: undefined as Record<string, unknown> | undefined,
  narrow: vi.fn(),
  principal: vi.fn(),
  proxy: vi.fn(),
}));

vi.mock("@aomi-labs/account/better-auth", () => ({ auth: {} }));
vi.mock("@better-auth/mcp", () => ({
  requireMcpAuth: vi.fn(
    (
      _auth: unknown,
      handler: typeof mocks.handler,
      options: Record<string, unknown>,
    ) => {
      mocks.handler = handler;
      mocks.options = options;
      return async (request: Request) =>
        request.headers.has("authorization")
          ? handler?.(request, { sub: "user-1" })
          : new Response(null, { status: 401 });
    },
  ),
}));
vi.mock("@portal/server/oauth/resources", () => ({
  aomiOAuthResources: () => ({
    agentMcp: "https://chat.aomi.dev/agent/mcp",
  }),
}));
vi.mock("@portal/server/oauth/features", () => ({
  oauthFeatures: { agentMcp: mocks.enabled },
}));
vi.mock("@portal/server/oauth/principal", () => ({
  apiAuthError: vi.fn((error) => {
    mocks.error(error);
    return new Response(null, { status: 403 });
  }),
  principalFromOAuthClaims: mocks.principal,
}));
vi.mock("@portal/server/oauth/mcp-scopes", () => ({
  narrowMcpPrincipal: mocks.narrow,
}));
vi.mock("@portal/server/agent-api-proxy", () => ({
  proxyAgentApi: mocks.proxy,
}));

import { POST } from "./route";

const principal = {
  userId: "aomi-user-1",
  principalClass: "user",
  scopes: ["mcp:agent"],
};

describe("canonical Agent MCP route", () => {
  beforeEach(() => {
    mocks.enabled.mockReturnValue(true);
    mocks.principal.mockResolvedValue(principal);
    mocks.narrow.mockResolvedValue(principal);
    mocks.proxy.mockResolvedValue(Response.json({ ok: true }));
  });

  it("configures exact-resource OAuth for every MCP protocol method", async () => {
    expect(mocks.options).toMatchObject({
      resource: "https://chat.aomi.dev/agent/mcp",
      requiredScopes: ["mcp:agent"],
      challengeScopes: ["mcp:agent", "agent:read", "agent:write"],
      dpop: { signingAlgorithms: ["ES256", "EdDSA"] },
    });
    for (const method of ["initialize", "tools/list", "tools/call"]) {
      const response = await POST(
        new Request("https://chat.aomi.dev/agent/mcp", {
          method: "POST",
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method }),
        }),
      );
      expect(response.status).toBe(401);
    }
  });

  it("narrows an authenticated request and proxies only to the internal presenter", async () => {
    const request = new Request("https://chat.aomi.dev/agent/mcp", {
      method: "POST",
      headers: { authorization: "Bearer exact-resource-token" },
    });

    const response = await POST(request);
    expect(mocks.error).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(mocks.principal).toHaveBeenCalledWith(
      { sub: "user-1" },
      "https://chat.aomi.dev/agent/mcp",
    );
    expect(mocks.narrow).toHaveBeenCalledWith(
      expect.any(Request),
      principal,
      "agent",
    );
    expect(new URL(mocks.proxy.mock.calls[0][0].url).pathname).toBe(
      "/v1/agent/mcp",
    );
  });

  it("is independently reversible", async () => {
    mocks.enabled.mockReturnValue(false);
    expect(
      (
        await POST(
          new Request("https://chat.aomi.dev/agent/mcp", { method: "POST" }),
        )
      ).status,
    ).toBe(404);
  });
});

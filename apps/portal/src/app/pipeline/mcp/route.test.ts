import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: vi.fn(() => true),
  handler: undefined as
    | ((request: Request, claims: Record<string, unknown>) => Promise<Response>)
    | undefined,
  options: undefined as Record<string, unknown> | undefined,
  handle: vi.fn(),
  narrow: vi.fn(),
  principal: vi.fn(),
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
    pipelineMcp: "https://chat.aomi.dev/pipeline/mcp",
  }),
}));
vi.mock("@portal/server/oauth/features", () => ({
  oauthFeatures: { pipelineMcp: mocks.enabled },
}));
vi.mock("@portal/server/oauth/principal", () => ({
  apiAuthError: vi.fn(() => new Response(null, { status: 403 })),
  principalFromOAuthClaims: mocks.principal,
}));
vi.mock("@portal/server/oauth/mcp-scopes", () => ({
  narrowMcpPrincipal: mocks.narrow,
}));
vi.mock("@portal/server/pipeline-mcp-route", () => ({
  handlePipelineMcp: mocks.handle,
}));

import { POST } from "./route";

const principal = {
  userId: "aomi-user-1",
  principalClass: "user",
  scopes: ["mcp:pipeline"],
};

describe("canonical Pipeline MCP route", () => {
  beforeEach(() => {
    mocks.enabled.mockReturnValue(true);
    mocks.principal.mockResolvedValue(principal);
    mocks.narrow.mockResolvedValue(principal);
    mocks.handle.mockResolvedValue(Response.json({ ok: true }));
  });

  it("configures exact-resource OAuth for every MCP protocol method", async () => {
    expect(mocks.options).toMatchObject({
      resource: "https://chat.aomi.dev/pipeline/mcp",
      requiredScopes: ["mcp:pipeline"],
      challengeScopes: ["mcp:pipeline", "pipeline:catalog"],
      dpop: { signingAlgorithms: ["ES256", "EdDSA"] },
    });
    for (const method of ["initialize", "tools/list", "tools/call"]) {
      const response = await POST(
        new Request("https://chat.aomi.dev/pipeline/mcp", {
          method: "POST",
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method }),
        }),
      );
      expect(response.status).toBe(401);
    }
  });

  it("narrows an authenticated request before the Gate F handler", async () => {
    const request = new Request("https://chat.aomi.dev/pipeline/mcp", {
      method: "POST",
      headers: { authorization: "Bearer exact-resource-token" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });

    expect((await POST(request)).status).toBe(200);
    expect(mocks.principal).toHaveBeenCalledWith(
      { sub: "user-1" },
      "https://chat.aomi.dev/pipeline/mcp",
    );
    expect(mocks.narrow).toHaveBeenCalledWith(request, principal, "pipeline");
    expect(mocks.handle).toHaveBeenCalledWith(request, principal);
  });

  it("is independently reversible", async () => {
    mocks.enabled.mockReturnValue(false);
    expect(
      (
        await POST(
          new Request("https://chat.aomi.dev/pipeline/mcp", {
            method: "POST",
          }),
        )
      ).status,
    ).toBe(404);
  });
});

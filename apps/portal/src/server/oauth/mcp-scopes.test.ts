import { describe, expect, it, vi } from "vitest";

vi.mock("./principal", () => ({
  ApiPrincipalError: class ApiPrincipalError extends Error {
    constructor(
      readonly status: number,
      readonly code: string,
      readonly requiredScopes: readonly string[],
    ) {
      super(code);
    }
  },
}));

import { narrowMcpPrincipal } from "./mcp-scopes";

const base = {
  canonicalUserId: "user-1",
  resource: "https://portal.example/agent/mcp",
  authSource: "oauth" as const,
  principalClass: "user" as const,
};

function call(name?: string, payment = false) {
  return new Request("https://portal.example/agent/mcp", {
    method: "POST",
    headers: payment ? { "payment-signature": "signed" } : undefined,
    body: JSON.stringify(
      name
        ? { jsonrpc: "2.0", method: "tools/call", params: { name }, id: 1 }
        : { jsonrpc: "2.0", method: "tools/list", id: 1 },
    ),
  });
}

describe("MCP public-to-internal scope narrowing", () => {
  it("keeps initialize and tool listing transport-only", async () => {
    const principal = await narrowMcpPrincipal(
      call(),
      { ...base, scopes: ["mcp:agent", "agent:read", "agent:write"] },
      "agent",
    );
    expect(principal.scopes).toEqual(["mcp:agent"]);
  });

  it("maps Agent and Pipeline tools to their exact business scope", async () => {
    await expect(
      narrowMcpPrincipal(
        call("aomi_check"),
        { ...base, scopes: ["mcp:agent", "agent:read"] },
        "agent",
      ),
    ).resolves.toMatchObject({ scopes: ["mcp:agent", "agent:read"] });

    await expect(
      narrowMcpPrincipal(
        call("aomi_run"),
        {
          ...base,
          resource: "https://portal.example/pipeline/mcp",
          scopes: ["mcp:pipeline", "pipeline:execute"],
        },
        "pipeline",
      ),
    ).resolves.toMatchObject({
      scopes: ["mcp:pipeline", "pipeline:execute"],
    });
  });

  it("fails closed on missing scope and preserves custody only when granted", async () => {
    await expect(
      narrowMcpPrincipal(
        call("aomi_run"),
        {
          ...base,
          resource: "https://portal.example/pipeline/mcp",
          scopes: ["mcp:pipeline"],
        },
        "pipeline",
      ),
    ).rejects.toMatchObject({ code: "insufficient_scope", status: 403 });

    await expect(
      narrowMcpPrincipal(
        call("aomi_run"),
        {
          ...base,
          resource: "https://portal.example/pipeline/mcp",
          scopes: ["mcp:pipeline", "pipeline:execute", "custody:delegate"],
        },
        "pipeline",
      ),
    ).resolves.toMatchObject({
      scopes: ["mcp:pipeline", "pipeline:execute", "custody:delegate"],
    });
  });

  it("requires payment scope when a signature is attached", async () => {
    await expect(
      narrowMcpPrincipal(
        call("aomi_run", true),
        {
          ...base,
          resource: "https://portal.example/pipeline/mcp",
          scopes: ["mcp:pipeline", "pipeline:execute"],
        },
        "pipeline",
      ),
    ).rejects.toMatchObject({ code: "insufficient_scope" });
  });
});

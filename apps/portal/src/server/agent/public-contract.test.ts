import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { parse } from "yaml";
import { describe, expect, it } from "vitest";

type OpenApi = {
  openapi: string;
  paths: Record<string, Record<string, unknown>>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, Record<string, unknown>>;
  };
};

const contractUrl = new URL(
  "../../../openapi/aomi-public-v1.yaml",
  import.meta.url,
);
const contract = parse(readFileSync(contractUrl, "utf8")) as OpenApi;

const expectedPaths = [
  "/.well-known/oauth-authorization-server",
  "/.well-known/oauth-protected-resource/v1/agent",
  "/.well-known/openid-configuration",
  "/api/auth/oauth2/authorize",
  "/api/auth/oauth2/consent",
  "/api/auth/oauth2/device/code",
  "/api/auth/oauth2/register",
  "/api/auth/oauth2/token",
  "/v1/agent/chat",
  "/v1/agent/chat/{session}",
  "/v1/agent/chat/{session}/actions/{action}/result",
  "/v1/agent/chat/{session}/interrupt",
  "/v1/agent/mcp",
  "/v1/agent/sessions",
  "/v1/agent/sessions/{session}",
  "/v1/apps",
  "/v1/apps/{application}",
  "/v1/chains",
];

function filesBelow(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? filesBelow(path) : [path];
  });
}

describe("BFF-owned public API contract", () => {
  it("is the exact public route source for Phase 1", () => {
    expect(contract.openapi).toBe("3.1.0");
    expect(Object.keys(contract.paths).sort()).toEqual(expectedPaths);
  });

  it("owns public auth without leaking the internal principal scheme", () => {
    expect(Object.keys(contract.components.securitySchemes).sort()).toEqual([
      "FirstPartyCookie",
      "GuestSession",
      "OAuthAgent",
    ]);
    expect(JSON.stringify(contract)).not.toMatch(
      /InternalPrincipal|AomiBearer|service\.toml/,
    );

    const mcp = contract.paths["/v1/agent/mcp"].post as {
      security: Array<Record<string, string[]>>;
    };
    expect(mcp.security).toEqual([{ OAuthAgent: ["agent"] }]);
    expect(JSON.stringify(mcp.security)).not.toContain("GuestSession");
  });

  it("freezes every action, signing, and result discriminant", () => {
    const schemas = contract.components.schemas;
    expect(schemas.AgentAction.oneOf).toEqual([
      { $ref: "#/components/schemas/EvmExternalTransactionAction" },
      { $ref: "#/components/schemas/SvmExternalTransactionAction" },
      { $ref: "#/components/schemas/SigningRequestAction" },
    ]);
    expect(schemas.SignablePayload.oneOf).toEqual([
      { $ref: "#/components/schemas/EvmPersonalPayload" },
      { $ref: "#/components/schemas/EvmTypedDataPayload" },
      { $ref: "#/components/schemas/SvmMessagePayload" },
      { $ref: "#/components/schemas/SvmTransactionPayload" },
    ]);
    expect(schemas.ActionResult.oneOf).toEqual([
      { $ref: "#/components/schemas/ExternalTransactionResult" },
      { $ref: "#/components/schemas/SigningResult" },
      { $ref: "#/components/schemas/RejectedActionResult" },
    ]);
  });

  it("keeps every mutating Agent REST operation idempotent", () => {
    for (const [path, item] of Object.entries(contract.paths)) {
      for (const method of ["post", "patch", "delete"] as const) {
        const operation = item[method] as
          | { tags?: string[]; parameters?: Array<{ $ref?: string }> }
          | undefined;
        if (!operation?.tags?.includes("Agent") || path === "/v1/agent/mcp") {
          continue;
        }
        expect(
          operation.parameters,
          `${method.toUpperCase()} ${path}`,
        ).toContainEqual({
          $ref: "#/components/parameters/IdempotencyKey",
        });
      }
    }
  });

  it("forbids kernel authority and public-HTTP loopback in the TS facade area", () => {
    const sourceRoot = dirname(
      new URL("./application-id.ts", import.meta.url).pathname,
    );
    const source = filesBelow(sourceRoot)
      .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");

    expect(source).not.toMatch(
      /thread_actions|AgentActionRepository|advanceActionState|decideCustody|resumeThread|verifyChainTruth/,
    );
    expect(source).not.toMatch(/fetch\([^)]*["'`]\/v1\/agent/);
  });
});

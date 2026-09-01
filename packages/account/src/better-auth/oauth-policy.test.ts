import { describe, expect, it } from "vitest";
import {
  AOMI_SCOPES,
  MCP_CLIENT_REGISTRATION_ALLOWED_SCOPES,
  MCP_CLIENT_REGISTRATION_SCOPES,
  narrowMcpRegistrationScopes,
  aomiOAuthResourcePolicies,
  aomiOAuthResources,
  guestScopesForAomiResource,
  validateAomiResourceScopes,
} from "./oauth-policy";

const env = {
  NODE_ENV: "test",
  DATABASE_URL: "postgres://test.invalid/aomi",
  BETTER_AUTH_URL: "https://portal.example",
};

describe("Aomi OAuth resource policy", () => {
  it("uses the Better Auth base path as the one canonical issuer", () => {
    const resources = aomiOAuthResources(env);
    expect(resources.authorizationServerIssuer).toBe(
      "https://portal.example/api/auth",
    );
    expect(resources.agentMcp).toBe("https://portal.example/v1/agent/mcp");
    expect(resources.pipelineMcp).toBe(
      "https://portal.example/v1/pipeline/mcp",
    );
  });

  it("rejects cross-resource, OIDC-mixed, duplicate, and unknown scopes", () => {
    const resources = aomiOAuthResources(env);
    expect(
      validateAomiResourceScopes(resources.agentRest, ["agent:read"], env),
    ).toMatchObject({ ok: true });
    for (const scopes of [
      ["pipeline:catalog"],
      ["agent:read", "openid"],
      ["agent:read", "agent:read"],
      ["unknown:scope"],
    ]) {
      expect(
        validateAomiResourceScopes(resources.agentRest, scopes, env),
      ).toMatchObject({ ok: false });
    }
  });

  it("allows self-custodial guest work without privileged scopes", () => {
    const resources = aomiOAuthResources(env);
    expect(
      guestScopesForAomiResource(
        resources.agentRest,
        ["agent:read", "agent:actions:resolve", "custody:delegate"],
        env,
      ),
    ).toEqual(["agent:read", "agent:actions:resolve"]);
    expect(
      guestScopesForAomiResource(
        resources.pipelineRest,
        ["pipeline:catalog", "pipeline:execute", "payments:submit"],
        env,
      ),
    ).toEqual(["pipeline:catalog", "pipeline:execute"]);
    expect(
      guestScopesForAomiResource(
        resources.pipelineMcp,
        ["mcp:pipeline", "pipeline:execute", "custody:delegate"],
        env,
      ),
    ).toEqual(["mcp:pipeline", "pipeline:execute"]);
  });

  it("centralizes the MCP DPoP rollout switch", () => {
    expect(
      aomiOAuthResourcePolicies({
        ...env,
        AOMI_MCP_DPOP_REQUIRED: "true",
      })
        .filter((policy) => policy.kind.endsWith("Mcp"))
        .every((policy) => policy.dpopBoundAccessTokensRequired),
    ).toBe(true);
  });

  // Regression: MCP login was broken by registering DCR clients with the union
  // of both resources' scopes plus the OIDC scopes. Better Auth registers a
  // client with the allowed set rather than the scope it requested, the client
  // then asks for its whole registered set at authorize, and that request is
  // validated against a single resource — so a registration set that is not
  // valid for one resource on its own cannot complete login.
  it("registers MCP clients with a scope set one resource can satisfy", () => {
    const resources = aomiOAuthResources(env);
    const result = validateAomiResourceScopes(
      resources.agentMcp,
      [...MCP_CLIENT_REGISTRATION_SCOPES],
      env,
    );
    expect(result.ok).toBe(true);
  });

  // Both `codex mcp add aomi-agent` and `codex mcp add aomi-pipeline` must be
  // able to log in. They are separate clients, each deriving its requested
  // scope from its own resource's protected-resource metadata, so what we
  // advertise back has to stay valid for that one resource.
  it("advertises a scope set each MCP resource can satisfy on its own", () => {
    const resources = aomiOAuthResources(env);
    const cases = [
      // Verbatim scopes_supported from each resource's live protected-resource
      // metadata, which is where an MCP client derives its requested scope.
      {
        resource: resources.agentMcp,
        requested:
          "agent:read agent:write agent:actions:resolve mcp:agent payments:submit custody:delegate offline_access",
      },
      {
        resource: resources.pipelineMcp,
        requested:
          "pipeline:catalog pipeline:execute mcp:pipeline payments:submit custody:delegate offline_access",
      },
    ];
    for (const { resource, requested } of cases) {
      const advertised = narrowMcpRegistrationScopes(requested);
      expect(validateAomiResourceScopes(resource, advertised, env).ok).toBe(
        true,
      );
    }
  });

  it("drops scopes outside the MCP registration set and never echoes OIDC", () => {
    expect(narrowMcpRegistrationScopes("mcp:agent openid profile email")).toEqual([
      "mcp:agent",
    ]);
    expect([...MCP_CLIENT_REGISTRATION_ALLOWED_SCOPES]).not.toContain("openid");
  });

  it("falls back to the Agent set when a client requests nothing usable", () => {
    for (const input of [null, "", "   ", "not:a:scope"]) {
      expect(narrowMcpRegistrationScopes(input)).toEqual([
        ...MCP_CLIENT_REGISTRATION_SCOPES,
      ]);
    }
  });

  it("refuses the union of every scope against one MCP resource", () => {
    const resources = aomiOAuthResources(env);
    const result = validateAomiResourceScopes(
      resources.agentMcp,
      [...AOMI_SCOPES],
      env,
    );
    expect(result).toMatchObject({ ok: false, error: "invalid_scope" });
  });
});

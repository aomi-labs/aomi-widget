import { describe, expect, it } from "vitest";
import {
  AOMI_SCOPES,
  MCP_CLIENT_REGISTRATION_SCOPES,
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

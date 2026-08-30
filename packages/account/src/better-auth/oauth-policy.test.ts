import { describe, expect, it } from "vitest";
import {
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
});

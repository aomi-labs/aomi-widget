import { readAccountAuthEnv } from "./env";

export const AOMI_CANONICAL_USER_CLAIM =
  "https://aomi.dev/canonical_user_id" as const;
export const AOMI_PRINCIPAL_CLASS_CLAIM =
  "https://aomi.dev/principal_class" as const;

export const AOMI_SCOPES = [
  "agent:read",
  "agent:write",
  "agent:actions:resolve",
  "pipeline:catalog",
  "pipeline:execute",
  "mcp:agent",
  "mcp:pipeline",
  "payments:submit",
  "custody:delegate",
  "openid",
  "profile",
  "email",
  "offline_access",
] as const;

export const AGENT_SCOPES = [
  "agent:read",
  "agent:write",
  "agent:actions:resolve",
  "mcp:agent",
  "payments:submit",
  "custody:delegate",
] as const;
export const PIPELINE_SCOPES = [
  "pipeline:catalog",
  "pipeline:execute",
  "mcp:pipeline",
  "payments:submit",
  "custody:delegate",
] as const;

export function aomiOAuthResources() {
  const origin = new URL(readAccountAuthEnv().betterAuthUrl).origin;
  return {
    issuer: origin,
    agentMcp: `${origin}/v1/agent/mcp`,
    pipelineMcp: `${origin}/v1/pipeline/mcp`,
    agentRest: `${origin}/v1/agent`,
    pipelineRest: `${origin}/v1/pipeline`,
  } as const;
}

export function aomiOAuthResourcePolicy(resource: string) {
  const resources = aomiOAuthResources();
  if (resource === resources.agentMcp) {
    return { identifier: resource, allowedScopes: AGENT_SCOPES } as const;
  }
  if (resource === resources.pipelineMcp) {
    return { identifier: resource, allowedScopes: PIPELINE_SCOPES } as const;
  }
  if (resource === resources.agentRest) {
    return {
      identifier: resource,
      allowedScopes: AGENT_SCOPES.filter((scope) => scope !== "mcp:agent"),
    } as const;
  }
  if (resource === resources.pipelineRest) {
    return {
      identifier: resource,
      allowedScopes: PIPELINE_SCOPES.filter(
        (scope) => scope !== "mcp:pipeline",
      ),
    } as const;
  }
  return null;
}

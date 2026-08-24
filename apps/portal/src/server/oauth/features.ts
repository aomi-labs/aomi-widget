import "server-only";

function enabled(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return defaultValue;
  return value === "1" || value === "true" || value === "yes";
}

const newSurfaceDefault = process.env.NODE_ENV !== "production";

export const oauthFeatures = {
  issuance: () => enabled("AOMI_OAUTH_ISSUANCE_ENABLED", newSurfaceDefault),
  restOAuth: () => enabled("AOMI_REST_OAUTH_ENABLED", newSurfaceDefault),
  agentMcp: () => enabled("AOMI_AGENT_MCP_OAUTH_ENABLED", newSurfaceDefault),
  pipelineMcp: () =>
    enabled("AOMI_PIPELINE_MCP_OAUTH_ENABLED", newSurfaceDefault),
  legacySessionValidation: () =>
    enabled("AOMI_LEGACY_SESSION_AUTH_ENABLED", true),
  agentGuestRest: () =>
    enabled("AOMI_GUEST_AGENT_REST_ENABLED", newSurfaceDefault),
  pipelineGuestRest: () =>
    enabled("AOMI_GUEST_PIPELINE_REST_ENABLED", newSurfaceDefault),
} as const;

export function isGuestRestEnabled(resource: string): boolean {
  return new URL(resource).pathname.includes("/v1/agent")
    ? oauthFeatures.agentGuestRest()
    : oauthFeatures.pipelineGuestRest();
}

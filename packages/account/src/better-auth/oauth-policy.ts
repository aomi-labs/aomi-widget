import { readAccountAuthEnv } from "./env";

export const AOMI_CANONICAL_USER_CLAIM =
  "https://aomi.dev/canonical_user_id" as const;
export const AOMI_PRINCIPAL_CLASS_CLAIM =
  "https://aomi.dev/principal_class" as const;

export const AOMI_OAUTH_BASE_PATH = "/api/auth" as const;

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

export const AGENT_REST_SCOPES = AGENT_SCOPES.filter(
  (scope) => scope !== "mcp:agent",
);
export const PIPELINE_REST_SCOPES = PIPELINE_SCOPES.filter(
  (scope) => scope !== "mcp:pipeline",
);

export type AomiOAuthResourceKind =
  | "agentRest"
  | "pipelineRest"
  | "agentMcp"
  | "pipelineMcp";

export type AomiOAuthResourcePolicy = {
  kind: AomiOAuthResourceKind;
  identifier: string;
  allowedScopes: readonly string[];
  guestScopes: readonly string[];
  dpopBoundAccessTokensRequired: boolean;
};

export function isMcpDpopRequired(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.AOMI_MCP_DPOP_REQUIRED?.trim().toLowerCase() === "true";
}

export function aomiOAuthResources(
  env: Record<string, string | undefined> = process.env,
) {
  const portalOrigin = new URL(readAccountAuthEnv(env).betterAuthUrl).origin;
  const authorizationServerIssuer = `${portalOrigin}${AOMI_OAUTH_BASE_PATH}`;
  return {
    portalOrigin,
    authorizationServerIssuer,
    agentMcp: `${portalOrigin}/v1/agent/mcp`,
    pipelineMcp: `${portalOrigin}/v1/pipeline/mcp`,
    agentRest: `${portalOrigin}/v1/agent`,
    pipelineRest: `${portalOrigin}/v1/pipeline`,
  } as const;
}

export function aomiOAuthResourcePolicies(
  env: Record<string, string | undefined> = process.env,
): readonly AomiOAuthResourcePolicy[] {
  const resources = aomiOAuthResources(env);
  const dpopRequired = isMcpDpopRequired(env);
  return [
    {
      kind: "agentRest",
      identifier: resources.agentRest,
      allowedScopes: AGENT_REST_SCOPES,
      guestScopes: [
        "agent:read",
        "agent:write",
        "agent:actions:resolve",
        "offline_access",
      ],
      dpopBoundAccessTokensRequired: false,
    },
    {
      kind: "pipelineRest",
      identifier: resources.pipelineRest,
      allowedScopes: PIPELINE_REST_SCOPES,
      guestScopes: ["pipeline:catalog", "pipeline:execute", "offline_access"],
      dpopBoundAccessTokensRequired: false,
    },
    {
      kind: "agentMcp",
      identifier: resources.agentMcp,
      allowedScopes: AGENT_SCOPES,
      guestScopes: ["mcp:agent", "agent:read", "agent:write", "offline_access"],
      dpopBoundAccessTokensRequired: dpopRequired,
    },
    {
      kind: "pipelineMcp",
      identifier: resources.pipelineMcp,
      allowedScopes: PIPELINE_SCOPES,
      guestScopes: [
        "mcp:pipeline",
        "pipeline:catalog",
        "pipeline:execute",
        "offline_access",
      ],
      dpopBoundAccessTokensRequired: dpopRequired,
    },
  ];
}

export function aomiOAuthResourcePolicy(
  resource: string,
  env: Record<string, string | undefined> = process.env,
): AomiOAuthResourcePolicy | null {
  return (
    aomiOAuthResourcePolicies(env).find(
      (policy) => policy.identifier === resource,
    ) ?? null
  );
}

export function guestScopesForAomiResource(
  resource: string,
  requestedScopes: readonly string[],
  env: Record<string, string | undefined> = process.env,
): string[] {
  const policy = aomiOAuthResourcePolicy(resource, env);
  if (!policy) return [];
  const ceiling = new Set(policy.guestScopes);
  return requestedScopes.filter((scope) => ceiling.has(scope));
}

export function validateAomiResourceScopes(
  resource: string,
  requestedScopes: readonly string[],
  env: Record<string, string | undefined> = process.env,
):
  | { ok: true; policy: AomiOAuthResourcePolicy }
  | {
      ok: false;
      error: "invalid_target" | "invalid_scope" | "invalid_request";
    } {
  const policy = aomiOAuthResourcePolicy(resource, env);
  if (!policy) return { ok: false, error: "invalid_target" };
  const unique = new Set(requestedScopes);
  if (unique.size !== requestedScopes.length) {
    return { ok: false, error: "invalid_request" };
  }
  const forbiddenOidc = ["openid", "profile", "email"].some((scope) =>
    unique.has(scope),
  );
  if (forbiddenOidc) return { ok: false, error: "invalid_scope" };
  const allowed = new Set([...policy.allowedScopes, "offline_access"]);
  if (requestedScopes.some((scope) => !allowed.has(scope))) {
    return { ok: false, error: "invalid_scope" };
  }
  return { ok: true, policy };
}

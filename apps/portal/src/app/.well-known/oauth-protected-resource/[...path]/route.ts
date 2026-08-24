import { auth } from "@aomi-labs/account/better-auth";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";

import { aomiOAuthResources } from "@portal/server/oauth/resources";
import { oauthFeatures } from "@portal/server/oauth/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = oauthProviderResourceClient(auth).getActions();

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  if (!oauthFeatures.issuance()) return new Response(null, { status: 404 });
  const path = `/${(await context.params).path.join("/")}`;
  const resources = aomiOAuthResources();
  const policies = new Map<string, { resource: string; scopes: string[] }>([
    [
      "/agent/mcp",
      {
        resource: resources.agentMcp,
        scopes: [
          "mcp:agent",
          "agent:read",
          "agent:write",
          "agent:actions:resolve",
          "payments:submit",
          "custody:delegate",
        ],
      },
    ],
    [
      "/pipeline/mcp",
      {
        resource: resources.pipelineMcp,
        scopes: [
          "mcp:pipeline",
          "pipeline:catalog",
          "pipeline:execute",
          "payments:submit",
          "custody:delegate",
        ],
      },
    ],
    [
      "/v1/agent",
      {
        resource: resources.agentRest,
        scopes: [
          "agent:read",
          "agent:write",
          "agent:actions:resolve",
          "payments:submit",
          "custody:delegate",
        ],
      },
    ],
    [
      "/v1/pipeline",
      {
        resource: resources.pipelineRest,
        scopes: [
          "pipeline:catalog",
          "pipeline:execute",
          "payments:submit",
          "custody:delegate",
        ],
      },
    ],
  ]);
  const policy = policies.get(path);
  if (!policy) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(
    await client.getProtectedResourceMetadata(
      {
        resource: policy.resource,
        authorization_servers: [resources.issuer],
        scopes_supported: policy.scopes,
      },
      { externalScopes: policy.scopes },
    ),
  );
}

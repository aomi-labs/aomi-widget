import { auth } from "@aomi-labs/account/better-auth";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";

import {
  aomiOAuthResourcePolicy,
  aomiOAuthResources,
} from "@portal/server/oauth/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = oauthProviderResourceClient(auth).getActions();

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const path = `/${(await context.params).path.join("/")}`;
  const resources = aomiOAuthResources();
  const resource = [
    resources.agentMcp,
    resources.pipelineMcp,
    resources.agentRest,
    resources.pipelineRest,
  ].find((candidate) => new URL(candidate).pathname === path);
  const policy = resource && aomiOAuthResourcePolicy(resource);
  if (!policy) return Response.json({ error: "not_found" }, { status: 404 });
  const scopes = [...policy.allowedScopes];
  return Response.json(
    await client.getProtectedResourceMetadata(
      {
        resource: policy.identifier,
        authorization_servers: [resources.issuer],
        scopes_supported: scopes,
      },
      { externalScopes: scopes },
    ),
  );
}

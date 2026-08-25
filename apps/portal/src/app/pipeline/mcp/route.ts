import { auth } from "@aomi-labs/account/better-auth";
import { requireMcpAuth } from "@better-auth/mcp";

import { proxyAgentApi } from "@portal/server/agent-api-proxy";
import {
  apiAuthError,
  principalFromOAuthClaims,
} from "@portal/server/oauth/principal";
import { aomiOAuthResources } from "@portal/server/oauth/resources";
import { oauthFeatures } from "@portal/server/oauth/features";
import { narrowMcpPrincipal } from "@portal/server/oauth/mcp-scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const resource = aomiOAuthResources().pipelineMcp;

const authenticatedPost = requireMcpAuth(
  auth,
  async (request, claims) => {
    try {
      const principal = await narrowMcpPrincipal(
        request,
        await principalFromOAuthClaims(claims, resource),
        "pipeline",
      );
      const url = new URL(request.url);
      url.pathname = "/v1/pipeline/mcp";
      return proxyAgentApi(
        new Request(url, {
          method: request.method,
          headers: request.headers,
          body: await request.arrayBuffer(),
        }),
        principal,
      );
    } catch (error) {
      return apiAuthError(error, resource);
    }
  },
  {
    resource,
    requiredScopes: ["mcp:pipeline"],
    challengeScopes: ["mcp:pipeline", "pipeline:catalog"],
    dpop: { signingAlgorithms: ["ES256", "EdDSA"] },
  },
);

export function POST(request: Request) {
  if (!oauthFeatures.pipelineMcp()) {
    return new Response(null, { status: 404 });
  }
  return authenticatedPost(request);
}

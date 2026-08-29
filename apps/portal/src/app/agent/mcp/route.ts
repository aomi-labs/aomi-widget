import { auth } from "@aomi-labs/account/better-auth";
import { requireMcpAuth } from "@better-auth/mcp";

import { proxyAgentApi } from "@portal/server/agent-api-proxy";
import {
  apiAuthError,
  principalFromOAuthClaims,
} from "@portal/server/oauth/principal";
import { aomiOAuthResources } from "@portal/server/oauth/resources";
import { narrowMcpPrincipal } from "@portal/server/oauth/mcp-scopes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const resource = aomiOAuthResources().agentMcp;

const authenticatedPost = requireMcpAuth(
  auth,
  async (request, claims) => {
    try {
      const principal = await narrowMcpPrincipal(
        request,
        await principalFromOAuthClaims(claims, resource),
        "agent",
      );
      const url = new URL(request.url);
      url.pathname = "/v1/agent/mcp";
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
    requiredScopes: ["mcp:agent"],
    challengeScopes: ["mcp:agent", "agent:read", "agent:write"],
    dpop: { signingAlgorithms: ["ES256", "EdDSA"] },
  },
);

export const POST = authenticatedPost;

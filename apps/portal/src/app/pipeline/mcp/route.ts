import { auth } from "@aomi-labs/account/better-auth";
import { requireMcpAuth } from "@better-auth/mcp";

import { handlePipelineMcp } from "@portal/server/pipeline-mcp-route";
import {
  apiAuthError,
  principalFromOAuthClaims,
} from "@portal/server/oauth/principal";
import { aomiOAuthResources } from "@portal/server/oauth/resources";
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
      return handlePipelineMcp(request, principal);
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

export const POST = authenticatedPost;

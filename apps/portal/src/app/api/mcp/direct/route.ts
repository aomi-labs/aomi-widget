import { auth } from "@aomi-labs/account/better-auth";
import { requireMcpAuth } from "@better-auth/mcp";

import { mcpMethodNotAllowed } from "@portal/server/mcp/rpc";
import { resolveMcpCanonicalUser } from "@portal/server/mcp/session";
import { handlePipelineMcp } from "@portal/server/pipeline-mcp-route";
import { aomiOAuthResources } from "@portal/server/oauth/resources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Alternative low-level tool funnel retained at /api/mcp/direct. */
export const POST = requireMcpAuth(
  auth,
  async (request, claims) => {
    const canonicalUser = await resolveMcpCanonicalUser({
      betterAuthUserId: String(claims.sub),
    });
    return handlePipelineMcp(request, canonicalUser.id);
  },
  {
    resource: aomiOAuthResources().pipelineMcp,
    requiredScopes: ["mcp:pipeline"],
  },
);

export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;

import { auth } from "@aomi-labs/account/better-auth";
import { withMcpAuth } from "better-auth/plugins";

import { mcpMethodNotAllowed } from "@portal/server/mcp/rpc";
import { resolveMcpCanonicalUser } from "@portal/server/mcp/session";
import { handlePipelineMcp } from "@portal/server/pipeline-mcp-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Alternative low-level tool funnel retained at /api/mcp/direct. */
export const POST = withMcpAuth(auth, async (request, session) => {
  const canonicalUser = await resolveMcpCanonicalUser({
    betterAuthUserId: session.userId,
  });
  return handlePipelineMcp(request, canonicalUser.id);
});

export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;

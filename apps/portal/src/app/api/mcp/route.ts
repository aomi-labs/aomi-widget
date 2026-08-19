import { auth } from "@aomi-labs/account/better-auth";
import { withMcpAuth } from "better-auth/plugins";

import { handleAgentMcp } from "@portal/server/agent/mcp";
import { mcpMethodNotAllowed } from "@portal/server/mcp/rpc";
import { resolveMcpCanonicalUser } from "@portal/server/mcp/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** OAuth-protected, stateless MCP port for supervising Aomi agent turns. */
export const POST = withMcpAuth(auth, async (request, session) =>
  handleAgentMcp(request, {
    kind: "account",
    canonicalUserId: (
      await resolveMcpCanonicalUser({ betterAuthUserId: session.userId })
    ).id,
    clientId: `legacy-mcp:${session.userId}`,
    scopes: ["agent"],
  }),
);

export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;

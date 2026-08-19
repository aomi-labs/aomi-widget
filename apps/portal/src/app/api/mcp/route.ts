import { auth } from "@aomi-labs/account/better-auth";
import { withMcpAuth } from "better-auth/plugins";

import {
  AGENT_MCP_INSTRUCTIONS,
  AGENT_MCP_TOOLS,
  dispatchAgentMcp,
} from "@portal/server/agent/mcp";
import { createAgentFacade } from "@portal/server/agent/runtime";
import { handleMcpPost, mcpMethodNotAllowed } from "@portal/server/mcp/rpc";
import { resolveMcpCanonicalUser } from "@portal/server/mcp/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** OAuth-protected, stateless MCP port for supervising Aomi agent turns. */
export const POST = withMcpAuth(auth, async (request, session) =>
  handleMcpPost(request, {
    tools: AGENT_MCP_TOOLS,
    instructions: AGENT_MCP_INSTRUCTIONS,
    dispatchTool: async (name, args) => {
      const canonicalUser = await resolveMcpCanonicalUser({
        betterAuthUserId: session.userId,
      });
      const facade = createAgentFacade({
        kind: "account",
        canonicalUserId: canonicalUser.id,
        clientId: `mcp:${session.userId}`,
        scopes: ["agent"],
      });
      return dispatchAgentMcp(facade, name, args);
    },
  }),
);

export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;

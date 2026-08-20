import { auth } from "@aomi-labs/account/better-auth";
import { withMcpAuth } from "better-auth/plugins";

import {
  CHAT_MCP_INSTRUCTIONS,
  CHAT_MCP_TOOLS,
  dispatchChatTool,
} from "@portal/server/mcp/chat-tools";
import { handleMcpPost, mcpMethodNotAllowed } from "@portal/server/mcp/rpc";
import { resolveMcpCanonicalUser } from "@portal/server/mcp/session";
import { proxyAgentApi } from "@portal/server/agent-api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** OAuth-protected, stateless MCP port for supervising Aomi agent turns. */
export const POST = withMcpAuth(auth, async (request, session) => {
  const canonicalUser = await resolveMcpCanonicalUser({
    betterAuthUserId: session.userId,
  });
  if (process.env.AOMI_AGENT_ROLLBACK_MODE === "legacy") {
    return handleMcpPost(request, {
      tools: CHAT_MCP_TOOLS,
      instructions: CHAT_MCP_INSTRUCTIONS,
      dispatchTool: (name, args) =>
        dispatchChatTool(canonicalUser.id, name, args),
    });
  }
  const url = new URL(request.url);
  url.pathname = "/v1/agent/mcp";
  return proxyAgentApi(new Request(url, request), canonicalUser.id);
});

export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;

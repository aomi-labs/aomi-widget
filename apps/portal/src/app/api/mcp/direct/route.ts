import { auth } from "@aomi-labs/account/better-auth";
import { withMcpAuth } from "better-auth/plugins";

import { handleMcpPost, mcpMethodNotAllowed } from "@portal/server/mcp/rpc";
import { resolveMcpCanonicalUser } from "@portal/server/mcp/session";
import { MCP_TOOLS, dispatchTool } from "@portal/server/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DIRECT_INSTRUCTIONS = [
  "Aomi direct tools execute Web3 operations through a broad-to-narrow tool funnel.",
  "Workflow: aomi_list_apps -> aomi_select_app -> aomi_list_tools -> aomi_describe_tool -> aomi_call_tool.",
  "When the goal is already known, use aomi_search_apps and aomi_search_tools before describing and calling the tool.",
  "Use aomi_run for multi-step flows whose intermediate results feed later calls; use aomi_call_tool for one action.",
  "Pass app explicitly because this endpoint has no server-side selection state.",
].join(" ");

/** Alternative low-level tool funnel retained at /api/mcp/direct. */
export const POST = withMcpAuth(auth, async (request, session) =>
  handleMcpPost(request, {
    tools: MCP_TOOLS,
    instructions: DIRECT_INSTRUCTIONS,
    dispatchTool: async (name, args) => {
      const canonicalUser = await resolveMcpCanonicalUser({
        betterAuthUserId: session.userId,
      });
      return dispatchTool(canonicalUser.id, name, args);
    },
  }),
);

export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;

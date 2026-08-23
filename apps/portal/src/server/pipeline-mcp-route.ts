import "server-only";

import { proxyAgentApi } from "@portal/server/agent-api-proxy";
import { handleMcpPost } from "@portal/server/mcp/rpc";
import { MCP_TOOLS, dispatchTool } from "@portal/server/mcp/tools";

const DIRECT_INSTRUCTIONS = [
  "Aomi direct tools execute Web3 operations through a broad-to-narrow tool funnel.",
  "Workflow: aomi_list_apps -> aomi_select_app -> aomi_list_tools -> aomi_describe_tool -> aomi_call_tool.",
  "When the goal is already known, use aomi_search_apps and aomi_search_tools before describing and calling the tool.",
  "Use aomi_run for multi-step flows whose intermediate results feed later calls; use aomi_call_tool for one action.",
  "Pass app explicitly because this endpoint has no server-side selection state.",
].join(" ");

/** Authenticated Pipeline MCP cutover with an explicit legacy rollback path. */
export function handlePipelineMcp(
  request: Request,
  canonicalUserId: string,
): Promise<Response> {
  if (process.env.AOMI_PIPELINE_ROLLBACK_MODE === "legacy") {
    return handleMcpPost(request, {
      tools: MCP_TOOLS,
      instructions: DIRECT_INSTRUCTIONS,
      dispatchTool: (name, args) => dispatchTool(canonicalUserId, name, args),
    });
  }
  const url = new URL(request.url);
  url.pathname = "/v1/pipeline/mcp";
  return proxyAgentApi(new Request(url, request), canonicalUserId);
}

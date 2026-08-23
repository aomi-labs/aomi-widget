import "server-only";

import { proxyAgentApi } from "@portal/server/agent-api-proxy";
import { handleMcpPost } from "@portal/server/mcp/rpc";
import { mcpOperationKey } from "@portal/server/mcp/thread";
import { MCP_TOOLS, dispatchTool } from "@portal/server/mcp/tools";

const DIRECT_INSTRUCTIONS = [
  "Aomi direct tools execute builtin public Web3 applications through a broad-to-narrow tool funnel.",
  "Workflow: aomi_list_apps -> aomi_select_app -> aomi_list_tools -> aomi_describe_tool -> aomi_call_tool.",
  "When the goal is already known, use aomi_search_apps and aomi_search_tools before describing and calling the tool.",
  "Use aomi_run for multi-step flows whose intermediate results feed later calls; use aomi_call_tool for one action.",
  "Gate F execution accepts builtin apps only; hosted application_id execution returns 501 and is deferred until the identity-aware Phase 10 boundary.",
  "Execution is admitted by the backend's app policy, payment, fail-closed at-most-once idempotency, serialization, and canonical action-custody gates.",
].join(" ");

/** Authenticated Pipeline MCP cutover with an explicit legacy rollback path. */
export function handlePipelineMcp(
  request: Request,
  canonicalUserId: string,
): Promise<Response> {
  if (process.env.AOMI_PIPELINE_ROLLBACK_MODE === "legacy") {
    const idempotencyKey = request.headers.get("idempotency-key") ?? undefined;
    const paymentSignature =
      request.headers.get("payment-signature") ?? undefined;
    return handleMcpPost(request, {
      tools: MCP_TOOLS,
      instructions: DIRECT_INSTRUCTIONS,
      dispatchTool: (name, args, requestId) =>
        dispatchTool(canonicalUserId, name, args, {
          idempotencyKey:
            idempotencyKey ??
            mcpOperationKey(canonicalUserId, requestId, name, args),
          paymentSignature,
        }),
    });
  }
  const url = new URL(request.url);
  url.pathname = "/v1/pipeline/mcp";
  return proxyAgentApi(new Request(url, request), canonicalUserId);
}

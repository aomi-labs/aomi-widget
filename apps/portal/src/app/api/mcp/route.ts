import { auth } from "@aomi-labs/account/better-auth";
import { withMcpAuth } from "better-auth/plugins";

import { MCP_TOOLS, dispatchTool } from "@portal/server/mcp/tools";
import { resolveMcpCanonicalUser } from "@portal/server/mcp/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * The Aomi MCP port: a stateless MCP streamable-HTTP endpoint at
 * `POST /api/mcp`. better-auth's MCP plugin owns the OAuth handshake
 * (`withMcpAuth` answers unauthenticated calls with the WWW-Authenticate
 * challenge pointing at our protected-resource metadata); tool handlers are
 * read-throughs to the backend catalog plus the thread-scoped tool syscall.
 *
 * Stateless subset of the protocol on purpose: one JSON-RPC message per
 * POST, JSON response, no server-issued session, no SSE push. Vercel
 * functions cannot hold an in-process runtime — which is exactly the
 * resources/services/kernel discipline: this process is a port, the kernel
 * lives behind /api/exec/tool-call.
 */
const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = { name: "aomi", version: "0.1.0" };
const INSTRUCTIONS = [
  "Aomi executes Web3 operations (balances, swaps, transactions) through a broad-to-narrow tool funnel.",
  "Workflow: aomi_list_apps -> aomi_select_app -> aomi_list_tools (namespace optional) -> aomi_describe_tool -> aomi_call_tool.",
  "Faster path when you know the goal: aomi_search_apps then aomi_search_tools (ranked, with match reasons) -> aomi_describe_tool -> aomi_call_tool.",
  "Single action -> aomi_call_tool. Multi-step flow (results feeding later calls, loops over lists) -> write a program for aomi_run; intermediates stay server-side.",
  "Pass the app name explicitly on every call; there is no server-side selection state.",
  "Tool results may include followup.route_steps: call them in order with aomi_call_tool unless the user asked to stop.",
].join(" ");

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
};

export const POST = withMcpAuth(auth, async (request, session) => {
  let message: JsonRpcRequest;
  try {
    message = (await request.json()) as JsonRpcRequest;
  } catch {
    return rpcError(
      null,
      -32700,
      "parse error: body must be a JSON-RPC message",
    );
  }
  if (Array.isArray(message)) {
    return rpcError(null, -32600, "batch requests are not supported");
  }

  const { id, method, params } = message;
  switch (method) {
    case "initialize":
      return rpcResult(id ?? null, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    case "ping":
      return rpcResult(id ?? null, {});
    case "tools/list":
      return rpcResult(id ?? null, { tools: MCP_TOOLS });
    case "tools/call": {
      const name = typeof params?.name === "string" ? params.name : "";
      const args =
        params?.arguments && typeof params.arguments === "object"
          ? (params.arguments as Record<string, unknown>)
          : {};
      const canonicalUser = await resolveMcpCanonicalUser({
        betterAuthUserId: session.userId,
      });
      const outcome = await dispatchTool(canonicalUser.id, name, args);
      return rpcResult(id ?? null, {
        content: [
          { type: "text", text: JSON.stringify(outcome.result, null, 2) },
        ],
        isError: outcome.isError,
      });
    }
    default:
      // Notifications (no id) get an empty 202 per streamable HTTP.
      if (id === undefined || id === null) {
        return new Response(null, { status: 202, headers: baseHeaders() });
      }
      return rpcError(id, -32601, `method '${method}' not found`);
  }
});

// Streamable HTTP allows servers without server-push to reject GET.
export function GET() {
  return new Response(null, { status: 405, headers: baseHeaders() });
}

export function DELETE() {
  // Stateless: there is no server session to terminate.
  return new Response(null, { status: 405, headers: baseHeaders() });
}

function baseHeaders(): HeadersInit {
  return { "mcp-protocol-version": PROTOCOL_VERSION };
}

function rpcResult(id: number | string | null, result: unknown): Response {
  return Response.json(
    { jsonrpc: "2.0", id, result },
    { headers: baseHeaders() },
  );
}

function rpcError(
  id: number | string | null,
  code: number,
  message: string,
): Response {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { headers: baseHeaders() },
  );
}

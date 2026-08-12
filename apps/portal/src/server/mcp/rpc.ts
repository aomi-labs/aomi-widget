import "server-only";

export const MCP_PROTOCOL_VERSION = "2025-06-18";

const SERVER_INFO = { name: "aomi", version: "0.2.0" };

export type McpToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export type ToolOutcome = { result: unknown; isError: boolean };

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
};

type McpRpcConfig = {
  tools: McpToolDef[];
  instructions: string;
  dispatchTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<ToolOutcome>;
};

/** Stateless streamable-HTTP JSON-RPC shell shared by both MCP surfaces. */
export async function handleMcpPost(
  request: Request,
  config: McpRpcConfig,
): Promise<Response> {
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
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return rpcError(
      null,
      -32600,
      Array.isArray(message)
        ? "batch requests are not supported"
        : "invalid JSON-RPC request",
    );
  }

  const { id, method, params } = message;
  switch (method) {
    case "initialize":
      return rpcResult(id ?? null, {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: config.instructions,
      });
    case "ping":
      return rpcResult(id ?? null, {});
    case "tools/list":
      return rpcResult(id ?? null, { tools: config.tools });
    case "tools/call": {
      const name = typeof params?.name === "string" ? params.name : "";
      const args =
        params?.arguments &&
        typeof params.arguments === "object" &&
        !Array.isArray(params.arguments)
          ? (params.arguments as Record<string, unknown>)
          : {};
      const outcome = await config.dispatchTool(name, args);
      return rpcResult(id ?? null, {
        content: [
          { type: "text", text: JSON.stringify(outcome.result, null, 2) },
        ],
        isError: outcome.isError,
      });
    }
    default:
      if (id === undefined || id === null) {
        return new Response(null, { status: 202, headers: mcpHeaders() });
      }
      return rpcError(id, -32601, `method '${method}' not found`);
  }
}

export function mcpMethodNotAllowed(): Response {
  return new Response(null, { status: 405, headers: mcpHeaders() });
}

function mcpHeaders(): HeadersInit {
  return { "mcp-protocol-version": MCP_PROTOCOL_VERSION };
}

function rpcResult(id: number | string | null, result: unknown): Response {
  return Response.json(
    { jsonrpc: "2.0", id, result },
    { headers: mcpHeaders() },
  );
}

function rpcError(
  id: number | string | null,
  code: number,
  message: string,
): Response {
  return Response.json(
    { jsonrpc: "2.0", id, error: { code, message } },
    { headers: mcpHeaders() },
  );
}

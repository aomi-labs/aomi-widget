// =============================================================================
// /api/mcp/[transport] — Streamable HTTP MCP transport.
// =============================================================================
//
// The [transport] segment is required by Next routing but unused by us — the
// canonical URL clients hit is /api/mcp/http. We accept any value so future
// transports can mount alongside without breaking existing URLs.
//
// v1 runs in stateless mode (sessionIdGenerator: undefined). The MCP
// session story arrives with Postgres / plugin OAuth.

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { buildMcpServerForRequest } from "@portal/lib/aomi-mcp/mcp-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(req: Request): Promise<Response> {
  const server = buildMcpServerForRequest(req);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    return await transport.handleRequest(req);
  } finally {
    await transport.close().catch(() => {});
    await server.close().catch(() => {});
  }
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}

export async function DELETE(req: Request): Promise<Response> {
  return handle(req);
}

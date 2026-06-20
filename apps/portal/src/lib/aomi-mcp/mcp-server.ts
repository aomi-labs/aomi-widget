// =============================================================================
// MCP runtime adapter for the portal.
// =============================================================================

import { buildBackendPort, createMcpServer } from "@aomi-labs/mcp-core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { readAomiMcpEnv } from "./env";

export function buildMcpServerForRequest(req: Request): McpServer {
  const env = readAomiMcpEnv();
  const backend = buildBackendPort({
    beUrl: env.beUrl,
    authToken: env.authToken,
  });

  return createMcpServer({
    backend,
    async resolveUserId() {
      const fromHeader = req.headers.get("x-aomi-user");
      return fromHeader && fromHeader.trim().length > 0
        ? fromHeader.trim()
        : env.devUserId;
    },
    serverInfo: { name: "aomi", version: "0.0.1" },
  });
}

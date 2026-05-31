// =============================================================================
// MCP runtime adapter for the portal.
// =============================================================================
//
// Reads portal-specific config (env, singleton store/providers) and injects
// into package-level factories from @aomi-labs/mcp-core.

import {
  buildAuthPort,
  buildBackendPort,
  createMcpServer,
} from "@aomi-labs/mcp-core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getAomiAuth } from "./auth-config";
import { readEnv } from "./env";

/** Build an MCP server bound to a specific incoming Request. resolveUserId
 *  reads the request's X-Aomi-User header. */
export function buildMcpServerForRequest(req: Request): McpServer {
  const { store, providers } = getAomiAuth();
  const env = readEnv();

  const auth = buildAuthPort({ store, providers, baseUrl: env.baseUrl });
  const backend = buildBackendPort({ beUrl: env.beUrl, authToken: env.authToken });

  return createMcpServer({
    auth,
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

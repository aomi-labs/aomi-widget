// =============================================================================
// MCP runtime adapter for the portal.
// =============================================================================
//
// Wires @aomi-labs/mcp-core's Auth port to the auth package's programmatic
// API, and provides the resolveUserId hook that reads X-Aomi-User from the
// current request.
//
// The Backend port is stubbed in PR #1 — chat/list_pending throw "not
// implemented". PR #2 swaps in the real ClientSession adapter.

import {
  awaitAuth,
  beginAuth,
  lookupApproval,
  revokeApproval,
  type Store,
} from "@aomi-labs/auth";
import {
  createMcpServer,
  type AuthPort,
} from "@aomi-labs/mcp-core";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildBackendPort } from "./mcp-backend-bridge";
import { readEnv } from "./env";
import { getAomiAuth } from "./local-secret-store";

function buildAuthPort(store: Store, baseUrl: string): AuthPort {
  const providersHolder = () => getAomiAuth().providers;
  return {
    async lookupApproval(args) {
      return lookupApproval({ store }, args);
    },
    async beginAuth(args) {
      return beginAuth(
        { store, providers: providersHolder(), baseUrl },
        { userId: args.userId, initiator: "mcp" },
        { provider: args.provider },
      );
    },
    async awaitAuth(args) {
      return awaitAuth({ store }, args);
    },
    async revokeApproval(args) {
      return revokeApproval({ store }, args);
    },
  };
}

/** Build an MCP server bound to a specific incoming Request. resolveUserId
 *  reads the request's X-Aomi-User header. */
export function buildMcpServerForRequest(req: Request): McpServer {
  const { store } = getAomiAuth();
  const env = readEnv();

  const auth = buildAuthPort(store, env.baseUrl);
  const backend = buildBackendPort({ beUrl: env.beUrl });

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

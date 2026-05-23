// =============================================================================
// createMcpServer — builds a configured MCP Server with Aomi tools.
// =============================================================================
//
// Transport-agnostic. The portal connects it to a Streamable HTTP
// transport; a future `aomi mcp` CLI subcommand will connect it to stdio.
//
// v1: only `aomi_connect_app` is registered. `aomi_chat` and
// `aomi_list_pending` follow in PR #2 and PR #3.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { AuthPort } from "./ports/auth";
import type { BackendPort } from "./ports/backend";
import { ConnectAppArgs, runConnectApp } from "./tools/connect-app";
import type { McpCallCtx } from "./types";

export interface CreateMcpServerDeps {
  auth: AuthPort;
  backend: BackendPort;
  /** Resolves an Aomi user id for the current MCP request. The portal
   *  reads it from `X-Aomi-User` in v1; future will resolve from a
   *  plugin-level OAuth bearer. */
  resolveUserId: () => Promise<string>;
  serverInfo?: { name?: string; version?: string };
}

export function createMcpServer(deps: CreateMcpServerDeps): McpServer {
  const server = new McpServer({
    name: deps.serverInfo?.name ?? "aomi",
    version: deps.serverInfo?.version ?? "0.0.1",
  });

  server.registerTool(
    "aomi_connect_app",
    {
      title: "Connect an Aomi-integrated app",
      description:
        "Ensure the user has authorized Aomi to use a named app (e.g. 'dummy', 'binance'). If a grant already exists, returns silently. Otherwise starts an OAuth flow and long-polls for completion; if the user hasn't completed it before timeout, returns the auth URL for you to surface to them.",
      inputSchema: ConnectAppArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = ConnectAppArgs.parse(input);
      const result = await runConnectApp({ auth: deps.auth }, ctx, parsed);
      return {
        content: [
          { type: "text", text: JSON.stringify(result, null, 2) },
        ],
        structuredContent: result as Record<string, unknown>,
      };
    },
  );

  // Placeholder schemas — implementations land in PR #2 / #3.
  registerStubbed(server, "aomi_chat", "Stub — wired in PR #2.");
  registerStubbed(server, "aomi_list_pending", "Stub — wired in PR #3.");

  return server;
}

async function buildCtx(deps: CreateMcpServerDeps): Promise<McpCallCtx> {
  const userId = await deps.resolveUserId();
  if (!userId) {
    throw new Error("mcp-core: resolveUserId returned empty");
  }
  return { userId };
}

function registerStubbed(server: McpServer, name: string, note: string): void {
  server.registerTool(
    name,
    {
      title: name,
      description: `${note} Not implemented in this build.`,
      inputSchema: z.object({}).shape,
    },
    async () => ({
      content: [{ type: "text", text: `Tool '${name}' is not implemented in this build.` }],
      isError: true,
    }),
  );
}

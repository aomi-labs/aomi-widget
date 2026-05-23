// =============================================================================
// createMcpServer — builds a configured MCP Server with Aomi tools.
// =============================================================================
//
// Transport-agnostic. The portal connects it to a Streamable HTTP
// transport; a future `aomi mcp` CLI subcommand will connect it to stdio.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthPort } from "./ports/auth";
import type { BackendPort } from "./ports/backend";
import { ChatArgs, runChat } from "./tools/chat";
import { ConnectAppArgs, runConnectApp } from "./tools/connect-app";
import { PendingTxArgs, runPendingTx } from "./tools/pending-tx";
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
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "aomi_chat",
    {
      title: "Chat with the Aomi agent",
      description:
        "Send a message to the Aomi on-chain agent. Returns the agent's reply plus any wallet requests that got queued during the turn. If `newly_queued` is non-empty, call `aomi_pending_tx` for details, then prompt the user to sign (sign tool lands in a later release).",
      inputSchema: ChatArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = ChatArgs.parse(input);
      const result = await runChat({ backend: deps.backend }, ctx, parsed);
      return {
        content: [{ type: "text", text: result.reply || "(no reply)" }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "aomi_pending_tx",
    {
      title: "List pending wallet requests",
      description:
        "Return wallet requests the Aomi agent has staged for the user but the user has not signed yet. Read-only.",
      inputSchema: PendingTxArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = PendingTxArgs.parse(input);
      const result = await runPendingTx({ backend: deps.backend }, ctx, parsed);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  return server;
}

async function buildCtx(deps: CreateMcpServerDeps): Promise<McpCallCtx> {
  const userId = await deps.resolveUserId();
  if (!userId) {
    throw new Error("mcp-core: resolveUserId returned empty");
  }
  return { userId };
}

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
import {
  ConnectAppArgs,
  runConnectApp,
  summarizeConnectAppResult,
} from "./tools/connect-app";
import { DisconnectAppArgs, runDisconnectApp } from "./tools/disconnect-app";
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
    "connect_app",
    {
      title: "Connect an Aomi-integrated app",
      description:
        "Ensure the user has authorized Aomi to use a named app (e.g. 'dummy', 'binance', 'privy'). If a grant already exists, returns silently. Otherwise starts an OAuth flow and long-polls for completion; if the user hasn't completed it before timeout, returns the auth URL for you to surface to them.",
      inputSchema: ConnectAppArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = ConnectAppArgs.parse(input);
      const result = await runConnectApp({ auth: deps.auth }, ctx, parsed);
      return {
        content: [
          { type: "text", text: summarizeConnectAppResult(result, parsed.name) },
        ],
        structuredContent: result as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "chat",
    {
      title: "Chat with the Aomi agent",
      description:
        "Send a message to the Aomi on-chain agent. Returns the agent's reply plus any wallet requests that got queued during the turn. If `newly_queued` is non-empty, call `pending_tx` for details, then prompt the user to sign (sign tool lands in a later release).",
      inputSchema: ChatArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = ChatArgs.parse(input);
      const result = await runChat({ backend: deps.backend }, ctx, parsed);
      const lines = [result.reply || "(no reply)"];
      if (result.newly_queued.length > 0) {
        lines.push(
          "",
          `${result.newly_queued.length} new wallet request${result.newly_queued.length === 1 ? "" : "s"} queued: ${result.newly_queued.map((t) => t.id).join(", ")}. Call pending_tx for details.`,
        );
      }
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "disconnect_app",
    {
      title: "Disconnect an Aomi-integrated app",
      description:
        "Revoke the user's approval for a named app (e.g. 'dummy', 'privy', 'binance'). Soft delete — future `connect_app(name)` will start a fresh OAuth flow. Returns `not_connected` if there's no active approval to revoke.",
      inputSchema: DisconnectAppArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = DisconnectAppArgs.parse(input);
      const result = await runDisconnectApp({ auth: deps.auth }, ctx, parsed);
      const text =
        result.status === "disconnected"
          ? `Disconnected ${parsed.name}.`
          : `${parsed.name} was not connected.`;
      return {
        content: [{ type: "text", text }],
        structuredContent: result as Record<string, unknown>,
      };
    },
  );

  server.registerTool(
    "pending_tx",
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
      const text =
        result.pending.length === 0
          ? "No pending wallet requests."
          : `${result.pending.length} pending wallet request${result.pending.length === 1 ? "" : "s"}:\n` +
            result.pending
              .map((t) => {
                const bits = [`- ${t.id} (${t.kind})`];
                if (t.to) bits.push(`to: ${t.to}`);
                if (t.value) bits.push(`value: ${t.value}`);
                if (t.chain_id) bits.push(`chain: ${t.chain_id}`);
                if (t.description) bits.push(t.description);
                return bits.join("  ");
              })
              .join("\n");
      return {
        content: [{ type: "text", text }],
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

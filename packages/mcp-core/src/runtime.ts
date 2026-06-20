// =============================================================================
// createMcpServer — builds a configured MCP Server with Aomi tools.
// =============================================================================
//
// Transport-agnostic. The portal connects it to a Streamable HTTP
// transport; a future `aomi mcp` CLI subcommand will connect it to stdio.
//
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BackendPort } from "./ports/backend";
import { ChatArgs, runChat } from "./tools/chat";
import { PendingTxArgs, runPendingTx } from "./tools/pending-tx";
import type { McpCallCtx } from "./types";

export interface CreateMcpServerDeps {
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

  // ---------------------------------------------------------------------
  // chat
  // ---------------------------------------------------------------------
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

  // ---------------------------------------------------------------------
  // pending_tx
  // ---------------------------------------------------------------------
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

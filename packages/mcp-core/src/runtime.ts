// =============================================================================
// createMcpServer — builds a configured MCP Server with Aomi tools.
// =============================================================================
//
// Transport-agnostic. The portal connects it to a Streamable HTTP
// transport; a future `aomi mcp` CLI subcommand will connect it to stdio.
//
// Auth-related tools come in two flavors so the LLM can express intent
// directly:
//
//   * `connect_provider(provider)` / `disconnect_provider(provider)` —
//     unscoped (global) Aomi identity.
//   * `connect_app(application, provider)` /
//     `disconnect_app(application, provider)` — scoped to a specific
//     Aomi app (Byreal, dYdX, etc.).
//
// Both flavors share the same `(application, wallet_provider)` lookup
// key on BE; the difference is just whether `application` is NULL.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthPort } from "./ports/auth";
import type { BackendPort } from "./ports/backend";
import { ChatArgs, runChat } from "./tools/chat";
import {
  ConnectAppArgs,
  runConnectApp,
} from "./tools/connect-app";
import {
  ConnectProviderArgs,
  runConnectProvider,
  summarizeConnectResult,
} from "./tools/connect-provider";
import { DisconnectAppArgs, runDisconnectApp } from "./tools/disconnect-app";
import {
  DisconnectProviderArgs,
  runDisconnectProvider,
} from "./tools/disconnect-provider";
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

  // ---------------------------------------------------------------------
  // connect_provider — unscoped
  // ---------------------------------------------------------------------
  server.registerTool(
    "connect_provider",
    {
      title: "Connect a wallet provider (global Aomi identity)",
      description:
        "Ensure the user has authorized Aomi to use a wallet provider (e.g. 'privy', 'para', 'dummy') at the global Aomi-account level. If a global approval already exists, returns silently. Otherwise starts an OAuth flow; if not completed before timeout, returns the auth URL for you to surface to the user. For app-scoped identities (e.g. 'Privy for Byreal'), use `connect_app` instead.",
      inputSchema: ConnectProviderArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = ConnectProviderArgs.parse(input);
      const result = await runConnectProvider({ auth: deps.auth }, ctx, parsed);
      return {
        content: [
          { type: "text", text: summarizeConnectResult(result, parsed.provider) },
        ],
        structuredContent: result as Record<string, unknown>,
      };
    },
  );

  // ---------------------------------------------------------------------
  // connect_app — app-scoped
  // ---------------------------------------------------------------------
  server.registerTool(
    "connect_app",
    {
      title: "Connect a wallet provider scoped to an Aomi app",
      description:
        "Ensure the user has authorized Aomi to use `provider` (e.g. 'privy', 'para') for `application` (e.g. 'byreal', 'dydx'). Use when the user's identity inside a specific Aomi app is distinct from their other Aomi-app identities. For an unscoped (global) connection, use `connect_provider` instead.",
      inputSchema: ConnectAppArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = ConnectAppArgs.parse(input);
      const result = await runConnectApp({ auth: deps.auth }, ctx, parsed);
      const label = `${parsed.application} × ${parsed.provider}`;
      return {
        content: [{ type: "text", text: summarizeConnectResult(result, label) }],
        structuredContent: result as Record<string, unknown>,
      };
    },
  );

  // ---------------------------------------------------------------------
  // disconnect_provider — unscoped revoke
  // ---------------------------------------------------------------------
  server.registerTool(
    "disconnect_provider",
    {
      title: "Disconnect a wallet provider (global Aomi identity)",
      description:
        "Revoke the user's unscoped (global) approval for a wallet provider. Soft delete — a future `connect_provider` starts a fresh OAuth flow. Returns `not_connected` if there's no active global approval to revoke. For app-scoped revocation use `disconnect_app`.",
      inputSchema: DisconnectProviderArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = DisconnectProviderArgs.parse(input);
      const result = await runDisconnectProvider(
        { auth: deps.auth },
        ctx,
        parsed,
      );
      const text =
        result.status === "disconnected"
          ? `Disconnected ${parsed.provider}.`
          : `${parsed.provider} was not connected.`;
      return {
        content: [{ type: "text", text }],
        structuredContent: result as Record<string, unknown>,
      };
    },
  );

  // ---------------------------------------------------------------------
  // disconnect_app — app-scoped revoke
  // ---------------------------------------------------------------------
  server.registerTool(
    "disconnect_app",
    {
      title: "Disconnect a wallet provider scoped to an Aomi app",
      description:
        "Revoke the user's approval for `provider` scoped to `application`. Soft delete; future `connect_app` starts a fresh OAuth flow. Returns `not_connected` if no active approval exists for that pair.",
      inputSchema: DisconnectAppArgs.shape,
    },
    async (input) => {
      const ctx = await buildCtx(deps);
      const parsed = DisconnectAppArgs.parse(input);
      const result = await runDisconnectApp({ auth: deps.auth }, ctx, parsed);
      const label = `${parsed.application} × ${parsed.provider}`;
      const text =
        result.status === "disconnected"
          ? `Disconnected ${label}.`
          : `${label} was not connected.`;
      return {
        content: [{ type: "text", text }],
        structuredContent: result as Record<string, unknown>,
      };
    },
  );

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

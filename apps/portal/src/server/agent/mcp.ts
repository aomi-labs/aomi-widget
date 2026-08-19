import { randomBytes } from "node:crypto";

import type { McpToolDef, ToolOutcome } from "@portal/server/mcp/rpc";

import type { AgentFacade } from "./facade";
import { resolveApplication } from "./application-discovery";

export const AGENT_MCP_INSTRUCTIONS = [
  "Use aomi_chat to start or continue an Aomi Agent turn.",
  "Use the opaque cursor returned by aomi_chat or aomi_check for the next aomi_check call.",
  "When a response contains actions, hand them to the human through the Aomi portal or authenticated CLI and check again after completion.",
  "Use aomi_interrupt to stop a running turn and aomi_list_sessions to find account-owned conversations.",
].join(" ");

export const AGENT_MCP_TOOLS: McpToolDef[] = [
  {
    name: "aomi_chat",
    description: "Start or continue an asynchronous Aomi Agent turn.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string" },
        session: { type: "string" },
        application: {
          type: "string",
          description:
            "Canonical app_ id. A unique app name remains a temporary compatibility alias.",
        },
        chain_context: {
          type: "object",
          additionalProperties: false,
          properties: {
            evm: {
              type: "object",
              properties: {
                address: { type: "string" },
                chainId: { type: "integer", minimum: 1 },
              },
              required: ["address", "chainId"],
            },
            svm: {
              type: "object",
              properties: {
                address: { type: "string" },
                cluster: { type: "string" },
              },
              required: ["address", "cluster"],
            },
          },
        },
      },
      required: ["message"],
      additionalProperties: false,
    },
  },
  {
    name: "aomi_check",
    description: "Read new Agent progress using the prior opaque cursor.",
    inputSchema: {
      type: "object",
      properties: {
        session: { type: "string" },
        cursor: { type: "string" },
      },
      required: ["session"],
      additionalProperties: false,
    },
  },
  {
    name: "aomi_interrupt",
    description: "Interrupt the active turn in an Agent session.",
    inputSchema: {
      type: "object",
      properties: { session: { type: "string" } },
      required: ["session"],
      additionalProperties: false,
    },
  },
  {
    name: "aomi_list_sessions",
    description: "List recent account-owned Agent sessions.",
    inputSchema: {
      type: "object",
      properties: {
        cursor: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
];

export async function dispatchAgentMcp(
  facade: AgentFacade,
  name: string,
  args: Record<string, unknown>,
  dependencies: {
    application?: typeof resolveApplication;
    idempotencyKey?: () => string;
  } = {},
): Promise<ToolOutcome> {
  const idempotencyKey =
    dependencies.idempotencyKey ??
    (() => `mcp_${randomBytes(18).toString("base64url")}`);
  try {
    switch (name) {
      case "aomi_chat": {
        const message = text(args.message);
        if (!message) return invalid("message is required");
        const app = await (dependencies.application ?? resolveApplication)(
          text(args.application) ?? text(args.app),
          { includePrivate: true },
        );
        const session =
          text(args.session) ??
          text(args.session_id) ??
          `sess_${randomBytes(24).toString("base64url")}`;
        const delta = await facade.chat({
          request: {
            session,
            application: app.id,
            message,
            model: "default",
            wallets: wallets(args.chain_context),
          },
          idempotencyKey: idempotencyKey(),
        });
        return { result: mcpDelta(delta), isError: false };
      }
      case "aomi_check": {
        const session = text(args.session) ?? text(args.session_id);
        if (!session) return invalid("session is required");
        return {
          result: mcpDelta(
            await facade.check({
              session,
              cursor: text(args.cursor),
              waitMs: 25_000,
            }),
          ),
          isError: false,
        };
      }
      case "aomi_interrupt": {
        const session = text(args.session) ?? text(args.session_id);
        if (!session) return invalid("session is required");
        return {
          result: {
            ...mcpDelta(
              await facade.interrupt({
                session,
                idempotencyKey: idempotencyKey(),
              }),
            ),
            interrupted: true,
          },
          isError: false,
        };
      }
      case "aomi_list_sessions":
        return {
          result: await facade.sessions({
            cursor: text(args.cursor),
            limit: integer(args.limit, 20),
          }),
          isError: false,
        };
      default:
        return invalid(`unknown tool '${name}'`);
    }
  } catch (error) {
    return {
      result: {
        error: error instanceof Error ? error.message : "agent_request_failed",
      },
      isError: true,
    };
  }
}

function mcpDelta(delta: Awaited<ReturnType<AgentFacade["check"]>>) {
  return {
    session: delta.session,
    status: delta.turn.status,
    messages: delta.messages,
    activity: delta.activity,
    actions: delta.actions,
    cursor: delta.cursor,
    ...(delta.actions.length
      ? {
          handoff: {
            portal: `/?thread=${encodeURIComponent(delta.session)}`,
            guidance:
              "Ask the human to complete the pending action, then call aomi_check.",
          },
        }
      : {}),
  };
}

function wallets(value: unknown) {
  const input = record(value);
  const evm = record(input?.evm);
  const svm = record(input?.svm);
  return {
    ...(typeof evm?.address === "string" && Number.isSafeInteger(evm.chainId)
      ? { evm: { address: evm.address, chainId: Number(evm.chainId) } }
      : {}),
    ...(typeof svm?.address === "string" && typeof svm.cluster === "string"
      ? { svm: { address: svm.address, cluster: svm.cluster } }
      : {}),
  };
}

function invalid(message: string): ToolOutcome {
  return { result: { error: message }, isError: true };
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function integer(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? Math.min(100, Math.max(1, value))
    : fallback;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

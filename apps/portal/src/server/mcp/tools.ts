import "server-only";

import { execRun, resourceGet, toolCall } from "@portal/server/mcp/backend";
import { mcpThreadId } from "@portal/server/mcp/thread";

/**
 * The resident Aomi MCP tool surface — same seven tools and broad→narrow
 * funnel the in-process Rust gateway exposed (list apps → select app →
 * namespaces → tools → describe → call), reimplemented as a stateless port:
 * discovery reads the backend's static catalog, execution goes through the
 * thread-scoped kernel syscall. No per-session server state; callers pass
 * `app` explicitly (select_app returns context, it does not mutate).
 */
export type McpToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

const APP_PROPERTY = {
  type: "string",
  description:
    "Aomi app name from aomi_list_apps, such as khalani. Defaults to default.",
} as const;

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: "aomi_get_agent_context",
    description:
      "Return the authenticated Aomi MCP context: thread id, catalog summary, and the discovery workflow.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "aomi_list_apps",
    description: "List compact Aomi app candidates before selecting an app.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum apps to return, from 1 to 20. Defaults to 20.",
        },
      },
    },
  },
  {
    name: "aomi_search_apps",
    description:
      "Ranked search across Aomi apps by name, namespace, or capability — the fast broad pass. Prefer this over aomi_list_apps when the user names an action or asset (such as swap or usdc). Returns scored candidates with match reasons.",
    inputSchema: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description:
            "Search terms, such as swap, solana, or usdc. Empty lists all apps at score 0.",
        },
        limit: {
          type: "number",
          description: "Maximum apps to return, from 1 to 20. Defaults to 20.",
        },
      },
    },
  },
  {
    name: "aomi_search_tools",
    description:
      "Ranked search for tools — the fast narrow pass. Scoped to one app when app is given, global when omitted. Prefer this over aomi_list_tools + aomi_describe_tool when you know the capability you want. Returns scored candidates with match reasons; call aomi_describe_tool for the exact schema before aomi_call_tool.",
    inputSchema: {
      type: "object",
      properties: {
        q: {
          type: "string",
          description: "Search terms, such as stage transaction or balance.",
        },
        app: { ...APP_PROPERTY },
        limit: {
          type: "number",
          description: "Maximum tools to return, from 1 to 50. Defaults to 20.",
        },
      },
    },
  },
  {
    name: "aomi_select_app",
    description:
      "Load one app's full instructions and namespace catalog. Stateless: pass the same app name to later tool calls.",
    inputSchema: {
      type: "object",
      properties: { app: { ...APP_PROPERTY } },
      required: ["app"],
    },
  },
  {
    name: "aomi_list_namespaces",
    description:
      "List an app's namespace capability groups with preview tools.",
    inputSchema: {
      type: "object",
      properties: {
        app: { ...APP_PROPERTY },
        limit: {
          type: "number",
          description:
            "Maximum namespaces to return, from 1 to 50. Defaults to 50.",
        },
      },
    },
  },
  {
    name: "aomi_list_tools",
    description:
      "List tools for an app, optionally filtered by namespace. Full schemas are included only when 3 or fewer tools match; otherwise call aomi_describe_tool.",
    inputSchema: {
      type: "object",
      properties: {
        app: { ...APP_PROPERTY },
        namespace: {
          type: "string",
          description: "Optional namespace filter, such as evm-core.",
        },
        limit: {
          type: "number",
          description: "Maximum tools to return, from 1 to 50. Defaults to 10.",
        },
      },
    },
  },
  {
    name: "aomi_describe_tool",
    description:
      "Return one tool's exact input schema plus owning-skill instructions. Always call this before aomi_call_tool unless the schema was already included.",
    inputSchema: {
      type: "object",
      properties: {
        tool_id: {
          type: "string",
          description: "Tool name returned by aomi_list_tools.",
        },
        app: { ...APP_PROPERTY },
      },
      required: ["tool_id"],
    },
  },
  {
    name: "aomi_run",
    description: [
      "Run a multi-step orchestration program inside this user's Aomi thread: many tool calls in one request, with intermediate results staying server-side.",
      "Use aomi_run when steps feed each other or loop; use aomi_call_tool for a single action.",
      "The language is a small bash-like subset - ONLY these constructs:",
      "(1) capture: q=$(tool_name key=value ...)",
      "(2) bare call: tool_name key=value ...",
      "(3) pipe: tool_a k=v | tool_b k=$_.field ($_ is the previous result)",
      "(4) loop: for x in $ref; do ... done (also: for x in $(tool ...); do ... done)",
      "(5) refs: $var, $var.field, $var.items[0]",
      "(6) return $var, # comments.",
      'Arguments are always key=value; values are bare words, "quoted strings", or $refs. Unquoted words are coerced to the tool\'s schema types.',
      "NOT supported: while, if, arithmetic, grep/jq/curl or any shell command, pipes to non-tools, redirects, && or ||. Only Aomi tool names (from aomi_search_tools / aomi_list_tools) are callable.",
      "Example 1: q=$(khalani_quote from=USDC to=ETH amount=1000)\\nkhalani_swap quote_id=$q.quote_id min_out=$q.amount_out",
      "Example 2: bal=$(get_balances owner=0xme)\\nfor t in $bal.tokens; do evm_stage_tx token=$t.address amount=$t.balance; done",
      "Returns { value, steps, error?, followups? }: value is the final result, steps is a compact per-step trace for debugging, followups carries any staged-transaction route steps. On error, fix the program and resubmit - or fall back to aomi_call_tool to debug one step.",
    ].join(" "),
    inputSchema: {
      type: "object",
      properties: {
        program: {
          type: "string",
          description:
            "The orchestration program in the bash-like subset described above.",
        },
        app: { ...APP_PROPERTY },
        thread_id: {
          type: "string",
          description:
            "Optional explicit Aomi thread id. Defaults to this user's deterministic MCP thread.",
        },
      },
      required: ["program"],
    },
  },
  {
    name: "aomi_call_tool",
    description:
      "Execute a single Aomi tool inside this user's MCP thread on the Aomi backend. Skill-owned tools activate their skill automatically. For multi-step flows where results feed each other, prefer aomi_run.",
    inputSchema: {
      type: "object",
      properties: {
        tool_id: {
          type: "string",
          description: "Tool name returned by aomi_list_tools.",
        },
        arguments: {
          type: "object",
          description:
            "JSON arguments matching the schema from aomi_describe_tool.",
        },
        app: { ...APP_PROPERTY },
        thread_id: {
          type: "string",
          description:
            "Optional explicit Aomi thread id. Defaults to this user's deterministic MCP thread.",
        },
      },
      required: ["tool_id"],
    },
  },
];

type ToolArgs = Record<string, unknown>;

export type ToolOutcome = { result: unknown; isError: boolean };

export async function dispatchTool(
  canonicalUserId: string,
  name: string,
  args: ToolArgs,
): Promise<ToolOutcome> {
  switch (name) {
    case "aomi_get_agent_context": {
      const apps = await resourceGet(canonicalUserId, "/api/resource/apps");
      return wrap(apps, {
        thread: {
          id: mcpThreadId(canonicalUserId),
          resolution: "deterministic",
        },
        catalog: apps.body,
        next_step:
          "Use aomi_list_apps for discovery, then aomi_select_app, aomi_list_tools, aomi_describe_tool, and aomi_call_tool. Pass app explicitly on every call.",
      });
    }
    case "aomi_list_apps": {
      const out = await resourceGet(canonicalUserId, "/api/resource/apps", {
        limit: numeric(args.limit),
      });
      return wrap(out, out.body);
    }
    case "aomi_search_apps": {
      const out = await resourceGet(
        canonicalUserId,
        "/api/resource/search/apps",
        {
          q: text(args.q),
          limit: numeric(args.limit),
        },
      );
      return wrap(out, out.body);
    }
    case "aomi_search_tools": {
      const out = await resourceGet(
        canonicalUserId,
        "/api/resource/search/tools",
        {
          q: text(args.q),
          app: text(args.app),
          limit: numeric(args.limit),
        },
      );
      return wrap(out, out.body);
    }
    case "aomi_select_app": {
      const app = text(args.app);
      if (!app) return invalid("app is required");
      const out = await resourceGet(
        canonicalUserId,
        `/api/resource/apps/${encodeURIComponent(app)}`,
      );
      return wrap(out, out.body);
    }
    case "aomi_list_namespaces": {
      const app = text(args.app) ?? "default";
      const out = await resourceGet(
        canonicalUserId,
        `/api/resource/apps/${encodeURIComponent(app)}`,
      );
      const body = out.body as { namespace_catalog?: unknown } | null;
      return wrap(out, body?.namespace_catalog ?? out.body);
    }
    case "aomi_list_tools": {
      const out = await resourceGet(canonicalUserId, "/api/resource/tools", {
        app: text(args.app),
        namespace: text(args.namespace),
        limit: numeric(args.limit),
      });
      return wrap(out, out.body);
    }
    case "aomi_describe_tool": {
      const toolId = text(args.tool_id);
      if (!toolId) return invalid("tool_id is required");
      const out = await resourceGet(
        canonicalUserId,
        `/api/resource/tools/${encodeURIComponent(toolId)}`,
        { app: text(args.app) },
      );
      return wrap(out, out.body);
    }
    case "aomi_run": {
      const program = text(args.program);
      if (!program) return invalid("program is required");
      const threadId = text(args.thread_id) ?? mcpThreadId(canonicalUserId);
      const out = await execRun(canonicalUserId, threadId, {
        program,
        app: text(args.app),
      });
      return wrap(out, out.body);
    }
    case "aomi_call_tool": {
      const toolId = text(args.tool_id);
      if (!toolId) return invalid("tool_id is required");
      const threadId = text(args.thread_id) ?? mcpThreadId(canonicalUserId);
      const out = await toolCall(canonicalUserId, threadId, {
        tool_id: toolId,
        arguments: objectArgs(args.arguments),
        app: text(args.app),
      });
      return wrap(out, out.body);
    }
    default:
      return invalid(`unknown tool '${name}'`);
  }
}

function wrap(
  out: { ok: boolean; status: number },
  result: unknown,
): ToolOutcome {
  if (!out.ok) {
    return {
      result:
        out.status >= 500
          ? { error: "upstream_unavailable", status: out.status }
          : {
              error: "backend request failed",
              status: out.status,
              detail: result,
            },
      isError: true,
    };
  }
  return { result, isError: false };
}

function invalid(message: string): ToolOutcome {
  return { result: { error: message }, isError: true };
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numeric(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function objectArgs(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  // Mirror the Rust gateway's tolerance for stringified argument objects.
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // fall through to empty args
    }
  }
  return {};
}

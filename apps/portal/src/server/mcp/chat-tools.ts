import "server-only";

import {
  ensureThread,
  fetchState,
  interrupt,
  listThreads,
  sendChat,
  type ChatBackendResult,
} from "@portal/server/mcp/chat-backend";
import type { McpToolDef, ToolOutcome } from "@portal/server/mcp/rpc";
import { newMcpThreadId } from "@portal/server/mcp/thread";

export const CHAT_MCP_INSTRUCTIONS = [
  "Chat with the Aomi agent by calling aomi_chat with the user's request.",
  "aomi_chat starts an asynchronous turn and returns a session_id plus cursor; continue with aomi_check using both values until status is complete or awaiting_user.",
  "Each aomi_check returns only new transcript messages and newly drained tool/task activity, so relay useful progress while supervising longer work.",
  "When status is awaiting_user, show the pending wallet request and handoff guidance to the human; do not claim the operation completed until a later check confirms it.",
  "Use aomi_interrupt to stop a running turn and aomi_list_sessions to find prior account-owned conversations.",
].join(" ");

const SESSION_PROPERTY = {
  type: "string",
  description: "Aomi session id returned by aomi_chat or aomi_list_sessions.",
} as const;

const CURSOR_PROPERTY = {
  type: "object",
  description: "Opaque progress cursor returned by the previous chat/check.",
  properties: {
    messages: { type: "integer", minimum: 0 },
    system_events: { type: "integer", minimum: 0 },
  },
  required: ["messages", "system_events"],
  additionalProperties: false,
} as const;

export const CHAT_MCP_TOOLS: McpToolDef[] = [
  {
    name: "aomi_chat",
    description:
      "Start an asynchronous turn with the Aomi agent. Omit session_id to create a new account-owned conversation, then call aomi_check with the returned session_id and cursor until terminal.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "The user's request." },
        session_id: { ...SESSION_PROPERTY },
        app: {
          type: "string",
          description: "Optional Aomi app name for this turn.",
        },
      },
      required: ["message"],
      additionalProperties: false,
    },
  },
  {
    name: "aomi_check",
    description:
      "Check a running Aomi turn. Pass the cursor from the prior chat/check to receive only new messages while still receiving every newly drained activity event.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: { ...SESSION_PROPERTY },
        cursor: { ...CURSOR_PROPERTY },
      },
      required: ["session_id"],
      additionalProperties: false,
    },
  },
  {
    name: "aomi_interrupt",
    description: "Interrupt the currently processing turn in an Aomi session.",
    inputSchema: {
      type: "object",
      properties: { session_id: { ...SESSION_PROPERTY } },
      required: ["session_id"],
      additionalProperties: false,
    },
  },
  {
    name: "aomi_list_sessions",
    description:
      "List recent account-owned Aomi conversations that can be resumed with aomi_chat.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Maximum sessions to return. Defaults to 20.",
        },
      },
      additionalProperties: false,
    },
  },
];

type ToolArgs = Record<string, unknown>;
type Cursor = { messages: number; system_events: number };
type UnknownRecord = Record<string, unknown>;

export async function dispatchChatTool(
  canonicalUserId: string,
  name: string,
  args: ToolArgs,
): Promise<ToolOutcome> {
  switch (name) {
    case "aomi_chat": {
      const message = text(args.message);
      if (!message) return invalid("message is required");
      const requestedSession = text(args.session_id);
      const sessionId = requestedSession ?? newMcpThreadId();
      if (!requestedSession) {
        const created = await ensureThread(canonicalUserId, sessionId);
        if (!created.ok) return backendError(created);
      }
      const response = await sendChat(
        canonicalUserId,
        sessionId,
        message,
        text(args.app),
      );
      if (!response.ok) return backendError(response);
      return {
        result: chatResult(sessionId, message, response.body),
        isError: false,
      };
    }
    case "aomi_check": {
      const sessionId = text(args.session_id);
      if (!sessionId) return invalid("session_id is required");
      const response = await fetchState(canonicalUserId, sessionId);
      if (!response.ok) return backendError(response);
      return {
        result: stateDelta(sessionId, response.body, cursor(args.cursor)),
        isError: false,
      };
    }
    case "aomi_interrupt": {
      const sessionId = text(args.session_id);
      if (!sessionId) return invalid("session_id is required");
      const response = await interrupt(canonicalUserId, sessionId);
      if (!response.ok) return backendError(response);
      return {
        result: {
          ...stateDelta(sessionId, response.body, ZERO_CURSOR),
          interrupted: true,
        },
        isError: false,
      };
    }
    case "aomi_list_sessions": {
      const limit = integer(args.limit, 20, 1, 100);
      const response = await listThreads(canonicalUserId, limit);
      if (!response.ok) return backendError(response);
      const rows = Array.isArray(response.body) ? response.body : [];
      return {
        result: {
          sessions: rows.map((value) => {
            const row = record(value);
            return {
              id: text(row?.thread_id) ?? text(row?.session_id) ?? "",
              title: typeof row?.title === "string" ? row.title : null,
              updated_at:
                number(row?.last_active_at) ?? number(row?.updated_at) ?? null,
            };
          }),
        },
        isError: false,
      };
    }
    default:
      return invalid(`unknown tool '${name}'`);
  }
}

const ZERO_CURSOR: Cursor = { messages: 0, system_events: 0 };

function chatResult(
  sessionId: string,
  message: string,
  body: unknown,
): UnknownRecord {
  const state = stateRecord(body);
  const messages = array(state.messages);
  let promptIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const candidate = record(messages[index]);
    if (
      candidate?.sender === "user" &&
      (candidate.content === message || promptIndex === -1)
    ) {
      promptIndex = index;
      if (candidate.content === message) break;
    }
  }
  const result = stateDelta(sessionId, body, {
    messages: promptIndex + 1,
    system_events: 0,
  });
  const deliveredMessages = array(result.new_messages);
  if (result.status === "complete") {
    const reply = [...deliveredMessages]
      .reverse()
      .map(record)
      .find((entry) =>
        entry ? ["agent", "assistant"].includes(String(entry.sender)) : false,
      );
    if (typeof reply?.content === "string") result.reply = reply.content;
  }
  return result;
}

function stateDelta(
  sessionId: string,
  body: unknown,
  previous: Cursor,
): UnknownRecord {
  const state = stateRecord(body);
  const messages = array(state.messages);
  const events = array(state.system_events);
  const pending = pendingRequests(state, events);
  // The runtime appends an agent message before streaming and mutates that
  // final entry in place. Do not advance a count-only cursor past the mutable
  // tail or the completed text would never appear as a later delta.
  const stableMessageCount =
    state.is_processing === true && isAgentMessage(messages.at(-1))
      ? messages.length - 1
      : messages.length;
  const messageOffset = Math.min(previous.messages, stableMessageCount);
  const result: UnknownRecord = {
    session_id: sessionId,
    status:
      pending.length > 0
        ? "awaiting_user"
        : state.is_processing === true
          ? "processing"
          : "complete",
    new_messages: messages.slice(messageOffset, stableMessageCount),
    activity: activity(events),
    pending_requests: pending,
    title: typeof state.title === "string" ? state.title : null,
    cursor: {
      messages: stableMessageCount,
      // HTTP state drains system events. The event cursor is therefore a
      // monotonic receipt count, not an index into the next response.
      system_events: previous.system_events + events.length,
    },
  };
  if (pending.length > 0) {
    result.handoff = {
      portal_url: portalThreadUrl(sessionId),
      cli: "aomi tx sign <request-id>",
      guidance:
        "Open this session in the Aomi portal to approve, or sign from an authenticated Aomi CLI whose active session is this thread. Then call aomi_check again.",
    };
  }
  return result;
}

function isAgentMessage(value: unknown): boolean {
  const sender = text(record(value)?.sender);
  return sender === "agent" || sender === "assistant";
}

function activity(events: unknown[]): UnknownRecord[] {
  const output: UnknownRecord[] = [];
  for (const raw of events) {
    const event = normalizedEvent(raw);
    if (!event) continue;
    const type = text(event.type);
    if (type === "tool_complete") {
      output.push(
        compact({
          type,
          tool: text(event.tool_name) ?? text(event.name) ?? text(event.tool),
          status: text(event.status),
          result_preview: preview(
            event.result_preview ?? event.result ?? event.output,
          ),
        }),
      );
    } else if (type === "task_started") {
      output.push(
        compact({
          type,
          agent_id: text(event.agent_id),
          label: text(event.label),
          app: text(event.app),
          resumed:
            typeof event.resumed === "boolean" ? event.resumed : undefined,
        }),
      );
    } else if (type === "task_activity") {
      output.push(
        compact({
          type,
          agent_id: text(event.agent_id),
          kind: text(event.kind),
          tool: text(event.tool_name),
          text: preview(event.text),
          result_preview: preview(event.result_preview),
          child_seq: number(event.child_seq),
        }),
      );
    } else if (type === "task_completed") {
      output.push(
        compact({
          type,
          agent_id: text(event.agent_id),
          status: text(event.status),
          message: preview(event.message),
          staged_count: number(event.staged_count),
          steps: number(event.steps),
          duration_ms: number(event.duration_ms),
        }),
      );
    }
  }
  return output;
}

function pendingRequests(
  state: UnknownRecord,
  events: unknown[],
): UnknownRecord[] {
  const userState = record(state.user_state);
  const pending = record(userState?.pending);
  const requests: UnknownRecord[] = [];
  addPendingBucket(requests, pending, ["evmTxs", "evm_txs"], "transaction");
  addPendingBucket(requests, pending, ["evmSigs", "evm_sigs"], "eip712_sign");
  addPendingBucket(
    requests,
    pending,
    ["svmIxs", "svm_ixs"],
    "solana_transaction",
  );
  addPendingBucket(
    requests,
    pending,
    ["svmSigs", "svm_sigs"],
    "solana_signature",
  );

  for (const raw of events) {
    const event = normalizedEvent(raw);
    const type = text(event?.type);
    if (!event || !type || !type.includes("wallet")) continue;
    const payload = record(event.payload) ?? event;
    const kind =
      type === "wallet_eip712_request"
        ? "eip712_sign"
        : type.includes("solana")
          ? "solana_transaction"
          : type === "wallet_tx_request"
            ? "transaction"
            : undefined;
    if (!kind) continue;
    const request = shapedPending(
      text(payload.pending_tx_id) ??
        text(payload.pending_eip712_id) ??
        text(payload.tx_id) ??
        text(payload.id) ??
        String(requests.length + 1),
      kind,
      payload,
    );
    if (!requests.some((known) => known.id === request.id)) {
      requests.push(request);
    }
  }
  return requests;
}

function addPendingBucket(
  output: UnknownRecord[],
  pending: UnknownRecord | undefined,
  keys: string[],
  kind: string,
): void {
  const bucket = keys.map((key) => record(pending?.[key])).find(Boolean);
  if (!bucket) return;
  for (const [id, value] of Object.entries(bucket)) {
    output.push(shapedPending(id, kind, record(value) ?? {}));
  }
}

function shapedPending(
  rawId: string,
  kind: string,
  value: UnknownRecord,
): UnknownRecord {
  const typedData = record(value.typedData) ?? record(value.typed_data);
  const domain = record(typedData?.domain);
  return compact({
    id: rawId.startsWith("tx-") ? rawId : `tx-${rawId}`,
    kind,
    to: text(value.to),
    value: text(value.value),
    chain_id: number(value.chainId) ?? number(value.chain_id),
    cluster: text(value.cluster),
    description: text(value.description) ?? text(value.label),
    primary_type: text(typedData?.primaryType) ?? text(typedData?.primary_type),
    domain: text(domain?.name),
    verifying_contract:
      text(domain?.verifyingContract) ?? text(domain?.verifying_contract),
  });
}

function normalizedEvent(value: unknown): UnknownRecord | undefined {
  const outer = record(value);
  if (!outer) return undefined;
  if (typeof outer.type === "string") return outer;
  const inline = record(outer.InlineCall);
  if (!inline || typeof inline.type !== "string") return undefined;
  return { ...record(inline.payload), ...inline, type: inline.type };
}

function stateRecord(value: unknown): UnknownRecord {
  return record(value) ?? {};
}

function cursor(value: unknown): Cursor {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      return ZERO_CURSOR;
    }
  }
  const raw = record(parsed);
  return {
    messages: nonNegativeInteger(raw?.messages),
    system_events: nonNegativeInteger(raw?.system_events),
  };
}

function compact(value: UnknownRecord): UnknownRecord {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );
}

function preview(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  let output: string;
  if (typeof value === "string") {
    output = value;
  } else {
    try {
      output = JSON.stringify(value);
    } catch {
      output = String(value);
    }
  }
  return output.length > 500 ? `${output.slice(0, 499)}…` : output;
}

function portalThreadUrl(sessionId: string): string {
  const base =
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.AOMI_PORTAL_BASE_URL?.trim() ||
    (process.env.VERCEL_ENV === "production"
      ? "https://portal.aomi.dev"
      : process.env.VERCEL_ENV === "preview"
        ? "https://chat-staging.aomi.dev"
        : "http://127.0.0.1:3000");
  const url = new URL(base);
  url.searchParams.set("thread", sessionId);
  return url.toString();
}

function backendError(response: ChatBackendResult): ToolOutcome {
  return {
    result: {
      error: "backend request failed",
      status: response.status,
      detail: response.body,
    },
    isError: true,
  };
}

function invalid(message: string): ToolOutcome {
  return { result: { error: message }, isError: true };
}

function record(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function number(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function nonNegativeInteger(value: unknown): number {
  const parsed = number(value);
  return parsed === undefined ? 0 : Math.max(0, Math.floor(parsed));
}

function integer(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = number(value);
  return parsed === undefined
    ? fallback
    : Math.min(maximum, Math.max(minimum, Math.floor(parsed)));
}

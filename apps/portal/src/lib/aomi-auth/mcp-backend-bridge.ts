// =============================================================================
// BackendPort impl — talks to Aomi BE via AomiClient.
// =============================================================================
//
// v1 conventions (BE-aligned):
//
//   * `session_id == client_id == user_id` — BE's "non-sessional" mode
//     (ApiAuth::is_non_sessional). One persistent BE-side session per
//     Aomi user, no per-MCP-request rotation.
//
//   * Blocking chat: send POST /api/chat, then poll GET /api/state every
//     `POLL_INTERVAL_MS` until `is_processing` flips false. Return the
//     latest agent-sender message text + the diff of newly-queued
//     wallet requests.
//
//   * No SSE / ClientSession — we use the raw HTTP shape so there's no
//     event-emitter lifecycle to tear down per MCP request. Polling is
//     fine for one-off tool calls; SSE only earns its keep for long
//     interactive sessions.

import {
  AomiClient,
  type AomiMessage,
  type AomiStateResponse,
  type UserState,
} from "@aomi-labs/client";
import type {
  BackendChatReply,
  BackendPort,
  PendingTxInfo,
} from "@aomi-labs/mcp-core";

const POLL_INTERVAL_MS = 500;
const POLL_MAX_MS = 60_000; // matches Vercel Pro max function duration

export interface BackendPortDeps {
  beUrl: string;
  /** Override fetch (tests). Defaults to global fetch. */
  fetchImpl?: typeof fetch;
  /** Sleep helper (tests). */
  sleep?: (ms: number) => Promise<void>;
}

export function buildBackendPort(deps: BackendPortDeps): BackendPort {
  const client = new AomiClient({
    baseUrl: deps.beUrl,
    fetch: deps.fetchImpl,
  });
  const sleep = deps.sleep ?? defaultSleep;

  return {
    async chat({ userId, message }) {
      // 1. Snapshot pre-call pending state so we can diff.
      const preState = await client.fetchState(userId, undefined, userId);
      const preIds = new Set(extractPendingTx(preState.user_state).map((t) => t.id));

      // 2. Send the chat. Returns initial response immediately; if the
      //    agent kicks off async work, `is_processing` will be true.
      let last = await client.sendMessage(userId, message, {
        clientId: userId,
      });

      // 3. Poll until processing settles or we hit the cap.
      const deadline = Date.now() + POLL_MAX_MS;
      while (last.is_processing && Date.now() < deadline) {
        await sleep(POLL_INTERVAL_MS);
        last = (await client.fetchState(
          userId,
          undefined,
          userId,
        )) as typeof last;
      }

      // 4. Final reply: latest agent-sender message that came in after
      //    the user's message we just sent. Falls back to empty string
      //    when the agent only queued a wallet request with no text.
      const reply = latestAgentReplyText(last.messages);

      // 5. Diff pending state to surface new queued requests.
      const allPending = extractPendingTx(last.user_state);
      const newly_queued = allPending.filter((t) => !preIds.has(t.id));

      const result: BackendChatReply = { reply, newly_queued };
      return result;
    },

    async listPendingTx({ userId }) {
      const state = await client.fetchState(userId, undefined, userId);
      return extractPendingTx(state.user_state);
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers — parsing user_state pending maps into PendingTxInfo.
// ---------------------------------------------------------------------------

function extractPendingTx(
  userState: UserState | null | undefined,
): PendingTxInfo[] {
  if (!userState) return [];
  const out: PendingTxInfo[] = [];

  const evmTxs = asRecord(userState.pending_txs);
  if (evmTxs) {
    for (const [rawId, rawValue] of Object.entries(evmTxs)) {
      const id = displayId(rawId);
      const tx = asRecord(rawValue);
      if (!id || !tx) continue;
      const to = strOrUndef(tx.to);
      out.push({
        id,
        kind: "transaction",
        to,
        value: strOrUndef(tx.value),
        data: strOrUndef(tx.data),
        chain_id: numOrUndef(tx.chain_id),
        description: strOrUndef(tx.label),
      });
    }
  }

  const eip712s = asRecord(userState.pending_eip712s);
  if (eip712s) {
    for (const [rawId, rawValue] of Object.entries(eip712s)) {
      const id = displayId(rawId);
      const req = asRecord(rawValue);
      if (!id || !req) continue;
      out.push({
        id,
        kind: "eip712_sign",
        description: strOrUndef(req.description) ?? strOrUndef(req.label),
      });
    }
  }

  const solTxs = asRecord(userState.pending_solana_txs);
  if (solTxs) {
    for (const [rawId, rawValue] of Object.entries(solTxs)) {
      const id = displayId(rawId);
      const req = asRecord(rawValue);
      if (!id || !req) continue;
      out.push({
        id,
        kind: "solana_sign",
        cluster: strOrUndef(req.cluster),
        description: strOrUndef(req.description),
      });
    }
  }

  return out;
}

function latestAgentReplyText(messages: AomiMessage[] | null | undefined): string {
  if (!messages || messages.length === 0) return "";
  // Walk backwards: first agent/assistant message before the last user
  // message is the "current turn's" final agent message.
  let lastUserIdx = messages.length;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === "user") {
      lastUserIdx = i;
      break;
    }
  }
  for (let i = messages.length - 1; i > lastUserIdx; i--) {
    const m = messages[i];
    if ((m.sender === "agent" || m.sender === "assistant") && m.content) {
      return m.content;
    }
  }
  return "";
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

function strOrUndef(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function numOrUndef(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Backend pending-tx ids look like numeric strings; CLI displays them as
 *  `tx-N`. Same convention here so the id matches what `aomi tx list` shows. */
function displayId(rawId: string): string | null {
  const n = parseInt(rawId, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return `tx-${n}`;
}

// Avoid the AomiStateResponse import being unused if helpers stay self-contained.
type _ensureImport = AomiStateResponse;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

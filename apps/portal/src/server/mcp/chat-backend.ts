import "server-only";

import { getPool, mintAccountBearer } from "@aomi-labs/account";
import { configuredBackendUrl } from "@portal/server/backend-url";
import { portalFailures } from "@portal/server/bff/failures";
import { mcpThreadId } from "@portal/server/mcp/thread";

export type ChatBackendResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

export type McpChainContext =
  | { family: "evm"; chain_id: number }
  | {
      family: "solana";
      cluster: "solana:mainnet" | "solana:devnet" | "solana:testnet";
    };

type HeadlessUserState = {
  connection: { is_connected: boolean };
  evm?: { address?: string; chain_id?: number };
  svm?: { address?: string; cluster?: string };
  ext: { client_type: "mcp" };
};

/** Register a freshly generated thread against the authenticated account. */
export async function ensureThread(
  canonicalUserId: string,
  sessionId: string,
): Promise<ChatBackendResult> {
  return threadRequest(
    canonicalUserId,
    sessionId,
    "/api/threads",
    { method: "POST" },
    "mcp_chat_ensure_thread",
  );
}

/** Fire one agent turn, seeding account wallets for this headless surface. */
export async function sendChat(
  canonicalUserId: string,
  sessionId: string,
  message: string,
  app?: string,
  chainContext?: McpChainContext,
): Promise<ChatBackendResult> {
  const url = new URL(`${configuredBackendUrl()}/api/thread/chat`);
  url.searchParams.set("message", message);
  if (app) url.searchParams.set("app", app);
  const userState = await headlessUserState(canonicalUserId, chainContext);
  if (userState) {
    url.searchParams.set("user_state", JSON.stringify(userState));
  }
  return threadRequest(
    canonicalUserId,
    sessionId,
    url,
    { method: "POST" },
    "mcp_chat_send",
  );
}

export async function fetchState(
  canonicalUserId: string,
  sessionId: string,
): Promise<ChatBackendResult> {
  return threadRequest(
    canonicalUserId,
    sessionId,
    "/api/thread/state",
    { method: "GET" },
    "mcp_chat_state",
  );
}

export async function interrupt(
  canonicalUserId: string,
  sessionId: string,
): Promise<ChatBackendResult> {
  return threadRequest(
    canonicalUserId,
    sessionId,
    "/api/thread/interrupt",
    { method: "POST" },
    "mcp_chat_interrupt",
  );
}

export async function listThreads(
  canonicalUserId: string,
  limit?: number,
): Promise<ChatBackendResult> {
  const url = new URL(`${configuredBackendUrl()}/api/threads`);
  if (limit !== undefined) url.searchParams.set("limit", String(limit));
  return threadRequest(
    canonicalUserId,
    mcpThreadId(canonicalUserId),
    url,
    { method: "GET" },
    "mcp_chat_list_threads",
  );
}

async function threadRequest(
  canonicalUserId: string,
  sessionId: string,
  path: string | URL,
  init: RequestInit,
  operation: string,
): Promise<ChatBackendResult> {
  const { bearer } = await mintAccountBearer(canonicalUserId);
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${bearer}`);
  headers.set("x-session-id", sessionId);
  headers.set("x-thread-id", sessionId);
  const url =
    path instanceof URL ? path : new URL(`${configuredBackendUrl()}${path}`);
  return backendJson(url, { ...init, headers }, operation);
}

async function backendJson(
  url: URL,
  init: RequestInit,
  operation: string,
): Promise<ChatBackendResult> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { error: text };
  }
  if (response.status >= 500) {
    portalFailures.handle({
      source: "upstream_response",
      upstream: "rust",
      status: response.status,
      response: { status: 200, error: "upstream_unavailable" },
      context: {
        routeFamily: "/agent/mcp",
        operation,
        method: typeof init.method === "string" ? init.method : "GET",
      },
    });
  }
  return { ok: response.ok, status: response.status, body };
}

async function headlessUserState(
  canonicalUserId: string,
  chainContext?: McpChainContext,
): Promise<HeadlessUserState | undefined> {
  let rows: Array<Record<string, unknown>> = [];
  try {
    const result = await getPool().query(
      `select chain_type, address
         from public_keys
        where user_id = $1
        order by is_primary desc, created_at asc`,
      [canonicalUserId],
    );
    rows = result.rows;
  } catch {
    // Wallet hydration is advisory. The agent can still return its normal
    // connect/authorize guidance when the account graph cannot be read. An
    // explicit caller-supplied chain remains authoritative independently.
  }
  const evm = rows.find(
    (row) => String(row.chain_type).toLowerCase() === "evm",
  );
  const svm = rows.find((row) =>
    ["svm", "solana"].includes(String(row.chain_type).toLowerCase()),
  );
  if (!evm && !svm && !chainContext) return undefined;
  return {
    connection: { is_connected: Boolean(evm || svm) },
    ...(evm || chainContext?.family === "evm"
      ? {
          evm: {
            ...(evm ? { address: String(evm.address) } : {}),
            ...(chainContext?.family === "evm"
              ? { chain_id: chainContext.chain_id }
              : {}),
          },
        }
      : {}),
    ...(svm || chainContext?.family === "solana"
      ? {
          svm: {
            ...(svm ? { address: String(svm.address) } : {}),
            ...(chainContext?.family === "solana"
              ? { cluster: chainContext.cluster }
              : {}),
          },
        }
      : {}),
    ext: { client_type: "mcp" },
  };
}

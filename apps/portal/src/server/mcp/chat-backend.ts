import "server-only";

import { mintAccountBearer } from "@aomi-labs/account";
import { configuredBackendUrl } from "@portal/server/backend-url";
import { portalFailures } from "@portal/server/bff/failures";
import { mcpThreadId } from "@portal/server/mcp/thread";
import type { ResolvedWallets } from "@portal/server/mcp/wallet-selection";

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

/**
 * Fire one agent turn on this headless surface.
 *
 * `wallets` carries the addresses the caller chose, already checked against
 * the account by `resolveSessionWallets`. This function does not look wallets
 * up: an operating address must arrive here having been selected, never
 * inferred from the account graph at send time.
 */
export async function sendChat(
  canonicalUserId: string,
  sessionId: string,
  message: string,
  app?: string,
  chainContext?: McpChainContext,
  wallets?: ResolvedWallets,
): Promise<ChatBackendResult> {
  const url = new URL(`${configuredBackendUrl()}/api/thread/chat`);
  url.searchParams.set("message", message);
  if (app) url.searchParams.set("app", app);
  const userState = headlessUserState(wallets ?? {}, chainContext);
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
        routeFamily: "/api/mcp",
        operation,
        method: typeof init.method === "string" ? init.method : "GET",
      },
    });
  }
  return { ok: response.ok, status: response.status, body };
}

/**
 * Shape the selected wallets into the backend's `user_state` wire format.
 *
 * `is_connected` reports whether this turn has an operating wallet at all. On
 * a headless surface that means a wallet was chosen and ownership confirmed —
 * not merely that a row exists somewhere in the account graph.
 */
function headlessUserState(
  wallets: ResolvedWallets,
  chainContext?: McpChainContext,
): HeadlessUserState | undefined {
  const evm = wallets.evm;
  const svm = wallets.svm;
  if (!evm && !svm && !chainContext) return undefined;
  return {
    connection: { is_connected: Boolean(evm || svm) },
    ...(evm || chainContext?.family === "evm"
      ? {
          evm: {
            ...(evm ? { address: evm } : {}),
            ...(chainContext?.family === "evm"
              ? { chain_id: chainContext.chain_id }
              : {}),
          },
        }
      : {}),
    ...(svm || chainContext?.family === "solana"
      ? {
          svm: {
            ...(svm ? { address: svm } : {}),
            ...(chainContext?.family === "solana"
              ? { cluster: chainContext.cluster }
              : {}),
          },
        }
      : {}),
    ext: { client_type: "mcp" },
  };
}

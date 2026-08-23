import "server-only";

import { getPool, mintAccountBearer } from "@aomi-labs/account";
import { AomiClient } from "@aomi-labs/client";
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
  return withMcpClient(canonicalUserId, "mcp_chat_ensure_thread", (client) =>
    client.createThread(sessionId),
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
  const userState = await headlessUserState(canonicalUserId, chainContext);
  return withMcpClient(canonicalUserId, "mcp_chat_send", (client) =>
    client.sendMessage(sessionId, message, {
      app,
      userState,
    }),
  );
}

export async function fetchState(
  canonicalUserId: string,
  sessionId: string,
): Promise<ChatBackendResult> {
  return withMcpClient(canonicalUserId, "mcp_chat_state", (client) =>
    client.fetchState(sessionId),
  );
}

export async function interrupt(
  canonicalUserId: string,
  sessionId: string,
): Promise<ChatBackendResult> {
  return withMcpClient(
    canonicalUserId,
    "mcp_chat_interrupt",
    (client) => client.interrupt(sessionId),
  );
}

export async function listThreads(
  canonicalUserId: string,
  limit?: number,
): Promise<ChatBackendResult> {
  const sessionId = mcpThreadId(canonicalUserId);
  return withMcpClient(
    canonicalUserId,
    "mcp_chat_list_threads",
    (client) =>
      client.request("GET", "/api/threads", {
        sessionId,
        query: limit === undefined ? undefined : { limit },
      }),
  );
}

async function withMcpClient(
  canonicalUserId: string,
  operation: string,
  run: (client: AomiClient) => Promise<unknown>,
): Promise<ChatBackendResult> {
  let captured: ChatBackendResult | undefined;
  const client = new AomiClient({
    baseUrl: configuredBackendUrl(),
    getAccountBearer: async () =>
      (await mintAccountBearer(canonicalUserId)).bearer,
    fetch: async (input, init) => {
      const response = await fetch(input, { ...init, cache: "no-store" });
      const text = await response.clone().text();
      let body: unknown;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = { error: text };
      }
      captured = {
        ok: response.ok,
        status: response.status,
        body,
      };
      if (response.status >= 500) {
        portalFailures.handle({
          source: "upstream_response",
          upstream: "rust",
          status: response.status,
          response: { status: 200, error: "upstream_unavailable" },
          context: {
            routeFamily: "/api/mcp",
            operation,
            method:
              typeof init?.method === "string" ? init.method : "GET",
          },
        });
      }
      return response;
    },
  });
  try {
    await run(client);
    return captured ?? { ok: true, status: 200, body: null };
  } catch {
    return (
      captured ?? {
        ok: false,
        status: 500,
        body: { error: "request_failed" },
      }
    );
  }
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

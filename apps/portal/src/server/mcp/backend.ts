import "server-only";

import { mintAccountBearer } from "@aomi-labs/account";
import { configuredBackendUrl } from "@portal/server/backend-url";
import { portalFailures } from "@portal/server/bff/failures";

/**
 * BFF → kernel calls for the MCP port. Discovery reads the backend's static
 * catalog (`GET /api/resource/*`); execution is the thread-scoped kernel
 * syscall (`POST /api/exec/tool-call`). Both carry the AccountBearer this BFF
 * mints for the canonical user; execution adds `X-Thread-Id`, which the
 * Cloudflare Worker rendezvous-hashes to the thread's owning backend
 * replica — the same routing the portal chat path uses.
 */
export type BackendResult = {
  ok: boolean;
  status: number;
  body: unknown;
};

export async function resourceGet(
  canonicalUserId: string,
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<BackendResult> {
  const url = new URL(`${configuredBackendUrl()}${path}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  const { bearer } = await mintAccountBearer(canonicalUserId);
  return backendJson(
    url,
    {
      method: "GET",
      headers: { authorization: `Bearer ${bearer}` },
    },
    "mcp_resource_get",
  );
}

export async function toolCall(
  canonicalUserId: string,
  threadId: string,
  body: { tool_id: string; arguments: Record<string, unknown>; app?: string },
): Promise<BackendResult> {
  const { bearer } = await mintAccountBearer(canonicalUserId);
  return backendJson(
    new URL(`${configuredBackendUrl()}/api/exec/tool-call`),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
        "x-thread-id": threadId,
      },
      body: JSON.stringify(body),
    },
    "mcp_tool_call",
  );
}

export async function execRun(
  canonicalUserId: string,
  threadId: string,
  body: { program: string; app?: string },
): Promise<BackendResult> {
  const { bearer } = await mintAccountBearer(canonicalUserId);
  return backendJson(
    new URL(`${configuredBackendUrl()}/api/exec/run`),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
        "x-thread-id": threadId,
      },
      body: JSON.stringify(body),
    },
    "mcp_exec_run",
  );
}

async function backendJson(
  url: URL,
  init: RequestInit,
  operation: string,
): Promise<BackendResult> {
  const response = await fetch(url, { ...init, cache: "no-store" });
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
    return {
      ok: false,
      status: response.status,
      body: { error: "upstream_unavailable" },
    };
  }

  const text = await response.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    if (response.ok) throw error;
    body = { error: text };
  }
  return { ok: response.ok, status: response.status, body };
}

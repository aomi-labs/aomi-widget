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
  payment?: {
    required?: string;
    response?: string;
    receipt?: string;
  };
};

type ExecutionContext = {
  app: string;
  application_id?: number;
  platform?: string;
  skills?: string[];
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
  body: {
    tool_id: string;
    arguments: Record<string, unknown>;
  } & ExecutionContext,
  idempotencyKey: string,
  paymentSignature?: string,
): Promise<BackendResult> {
  const { bearer } = await mintAccountBearer(canonicalUserId);
  const url = executionUrl("/api/exec/tool-call", body);
  return backendJson(
    url,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
        ...(paymentSignature ? { "payment-signature": paymentSignature } : {}),
        "x-thread-id": threadId,
      },
      body: JSON.stringify({ ...body, public_pipeline: true }),
    },
    "mcp_tool_call",
  );
}

export async function execRun(
  canonicalUserId: string,
  threadId: string,
  body: { program: string } & ExecutionContext,
  idempotencyKey: string,
  paymentSignature?: string,
): Promise<BackendResult> {
  const { bearer } = await mintAccountBearer(canonicalUserId);
  const url = executionUrl("/api/exec/run", body);
  return backendJson(
    url,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
        "idempotency-key": idempotencyKey,
        ...(paymentSignature ? { "payment-signature": paymentSignature } : {}),
        "x-thread-id": threadId,
      },
      body: JSON.stringify({ ...body, public_pipeline: true }),
    },
    "mcp_exec_run",
  );
}

function executionUrl(path: string, context: ExecutionContext): URL {
  const url = new URL(`${configuredBackendUrl()}${path}`);
  url.searchParams.set("app", context.app);
  if (context.application_id !== undefined) {
    url.searchParams.set("application_id", String(context.application_id));
  }
  if (context.platform) url.searchParams.set("platform", context.platform);
  return url;
}

async function backendJson(
  url: URL,
  init: RequestInit,
  operation: string,
): Promise<BackendResult> {
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
        routeFamily: "/pipeline/mcp",
        operation,
        method: typeof init.method === "string" ? init.method : "GET",
      },
    });
  }
  const payment = paymentHeaders(response.headers);
  return {
    ok: response.ok,
    status: response.status,
    body,
    ...(payment ? { payment } : {}),
  };
}

function paymentHeaders(
  headers: Headers,
): BackendResult["payment"] | undefined {
  const required = headers.get("payment-required") ?? undefined;
  const response = headers.get("payment-response") ?? undefined;
  const receipt = headers.get("payment-receipt") ?? undefined;
  return required || response || receipt
    ? { required, response, receipt }
    : undefined;
}

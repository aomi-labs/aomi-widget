import "server-only";

import { mintAgentApiBearer } from "@aomi-labs/account";

const REQUEST_HEADERS = new Set([
  "accept",
  "content-type",
  "idempotency-key",
  "payment-signature",
  "x-request-id",
]);

const RESPONSE_HEADERS = new Set([
  "cache-control",
  "content-type",
  "mcp-protocol-version",
  "payment-required",
  "payment-response",
  "retry-after",
  "x-request-id",
]);

export function configuredAgentApiUrl(): string {
  const configured = process.env.AOMI_AGENT_API_URL?.trim();
  if (configured) return absoluteOrigin(configured, "AOMI_AGENT_API_URL");
  if (
    process.env.VERCEL_ENV === "preview" ||
    process.env.VERCEL_ENV === "production"
  ) {
    throw new Error("AOMI_AGENT_API_URL is required in hosted environments");
  }
  return "http://127.0.0.1:8082";
}

/**
 * Authenticated BFF -> api-server proxy. It intentionally has no Agent DTO,
 * cursor, action, or MCP knowledge: the Rust process owns the public protocol.
 */
export async function proxyAgentApi(
  request: Request,
  canonicalUserId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const incoming = new URL(request.url);
  if (!incoming.pathname.startsWith("/v1/agent/")) {
    return Response.json(
      { error: { code: "not_found", message: "Not found" } },
      { status: 404 },
    );
  }
  const upstream = new URL(
    `${incoming.pathname}${incoming.search}`,
    configuredAgentApiUrl(),
  );
  const { bearer } = await mintAgentApiBearer(canonicalUserId);
  const headers = allowlisted(request.headers, REQUEST_HEADERS);
  headers.set("authorization", `Bearer ${bearer}`);
  const response = await fetchImpl(upstream, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : request.body,
    cache: "no-store",
    redirect: "manual",
    // Node fetch requires this for a streamed Request body.
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  return new Response(response.body, {
    status: response.status,
    headers: allowlisted(response.headers, RESPONSE_HEADERS),
  });
}

function allowlisted(source: Headers, allowed: ReadonlySet<string>): Headers {
  const headers = new Headers();
  source.forEach((value, name) => {
    if (allowed.has(name.toLowerCase())) headers.set(name, value);
  });
  return headers;
}

function absoluteOrigin(value: string, name: string): string {
  try {
    const url = new URL(value);
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new Error(`${name} must be an absolute URL`);
  }
}

import { getPool } from "@aomi-labs/account";
import { portalFailures } from "@portal/server/bff/failures";

const MCP_AUTHORIZE_PATH = "/api/auth/mcp/authorize";

/**
 * Something upstream of this route handler rewrites loopback `redirect_uri`
 * hosts on the deployed stack (`127.0.0.1` -> `localhost`) — param-specific,
 * so it is OAuth-aware, but it is NOT better-auth (1.6.19 does exact-match
 * validation and no loopback rewriting; verified against its source) and not
 * portal code. Rather than chase the platform layer, snap the param back to
 * the client's registered URI, which holds regardless of which layer mutates.
 */
export async function withRegisteredMcpRedirectUri(
  request: Request,
  lookupRedirectUrls = registeredRedirectUrls,
): Promise<Request> {
  if (request.method !== "GET") return request;
  const url = new URL(request.url);
  if (url.pathname !== MCP_AUTHORIZE_PATH) return request;

  const clientId = url.searchParams.get("client_id");
  const redirectUri = url.searchParams.get("redirect_uri");
  if (!clientId || !redirectUri) return request;

  const registered = await lookupRedirectUrls(clientId).catch(
    (error: unknown) => {
      portalFailures.handle({
        source: "upstream_request",
        upstream: "supabase",
        error,
        context: {
          routeFamily: MCP_AUTHORIZE_PATH,
          operation: "mcp_oauth_redirect_lookup",
          method: "GET",
        },
      });
      return [];
    },
  );
  const exactRedirectUri = selectRegisteredRedirectUri(redirectUri, registered);
  if (!exactRedirectUri || exactRedirectUri === redirectUri) return request;

  url.searchParams.set("redirect_uri", exactRedirectUri);
  return new Request(url.toString(), {
    headers: request.headers,
    method: request.method,
  });
}

export function selectRegisteredRedirectUri(
  redirectUri: string,
  registeredRedirectUrls: readonly string[],
): string | null {
  if (registeredRedirectUrls.includes(redirectUri)) return redirectUri;
  const requested = parseUrl(redirectUri);
  if (!requested || !isLoopback(requested)) return null;

  return (
    registeredRedirectUrls.find((candidate) => {
      const registered = parseUrl(candidate);
      return (
        registered &&
        isLoopback(registered) &&
        registered.protocol === requested.protocol &&
        registered.port === requested.port &&
        registered.pathname === requested.pathname &&
        registered.search === requested.search
      );
    }) ?? null
  );
}

async function registeredRedirectUrls(clientId: string): Promise<string[]> {
  const result = await getPool().query<{ redirect_urls?: string }>(
    "select redirect_urls from ba_oauth_applications where client_id = $1 limit 1",
    [clientId],
  );
  const value = result.rows[0]?.redirect_urls;
  return typeof value === "string"
    ? value
        .split(",")
        .map((url) => url.trim())
        .filter(Boolean)
    : [];
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isLoopback(url: URL): boolean {
  return (
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1")
  );
}

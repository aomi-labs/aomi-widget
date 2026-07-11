import { getPool } from "@aomi-labs/account";

const MCP_AUTHORIZE_PATH = "/api/auth/mcp/authorize";

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

  const registered = await lookupRedirectUrls(clientId).catch(() => []);
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

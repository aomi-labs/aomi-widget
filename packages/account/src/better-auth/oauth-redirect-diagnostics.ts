import { createHash } from "node:crypto";

import { getPool } from "../db/pool";

export const BETTER_AUTH_OAUTH_PROVIDER_VERSION = "1.7.1";

export type OAuthRedirectFailureDiagnostics = {
  clientIdHash: string;
  clientFound: boolean;
  registeredRedirectCount: number;
  registeredStorageShape:
    | "json_array"
    | "json_encoded_array"
    | "missing"
    | "invalid";
  requestedUrlValid: boolean;
  credentialsAbsent: boolean;
  fragmentAbsent: boolean;
  exactMatch: boolean;
  loopbackMatch: boolean;
  protocolMatch: boolean;
  hostnameMatch: boolean;
  portMatch: boolean;
  pathMatch: boolean;
  queryMatch: boolean;
};

/**
 * Explain a rejected redirect without returning any URL or client identifier.
 * This is observability only: Better Auth remains the authorization decision.
 */
export async function oauthRedirectFailureDiagnostics(
  clientId: string,
  requestedRedirectUri: string,
): Promise<OAuthRedirectFailureDiagnostics> {
  const result = await getPool().query(
    `select redirect_uris
       from ba_oauth_clients
      where client_id = $1
      limit 1`,
    [clientId],
  );
  const stored = result.rows[0]?.redirect_uris;
  const { redirects, shape } = redirectValues(stored);
  const requested = parsedUrl(requestedRedirectUri);
  const registered = redirects.map(parsedUrl).filter(isUrl);
  const credentialsAbsent = requested
    ? !requested.username && !requested.password
    : false;
  const fragmentAbsent = requested ? !requested.hash : false;
  const compare = (part: (url: URL) => string) =>
    Boolean(
      requested && registered.some((url) => part(url) === part(requested)),
    );

  return {
    clientIdHash: hashOAuthClientId(clientId),
    clientFound: result.rows.length > 0,
    registeredRedirectCount: redirects.length,
    registeredStorageShape: shape,
    requestedUrlValid: Boolean(requested),
    credentialsAbsent,
    fragmentAbsent,
    exactMatch: redirects.includes(requestedRedirectUri),
    loopbackMatch: Boolean(
      requested &&
      credentialsAbsent &&
      fragmentAbsent &&
      registered.some(
        (url) =>
          isLoopbackIp(url.hostname) &&
          url.hostname === requested.hostname &&
          url.protocol === requested.protocol &&
          url.pathname === requested.pathname &&
          url.search === requested.search &&
          !url.username &&
          !url.password &&
          !url.hash,
      ),
    ),
    protocolMatch: compare((url) => url.protocol),
    hostnameMatch: compare((url) => url.hostname),
    portMatch: compare((url) => url.port),
    pathMatch: compare((url) => url.pathname),
    queryMatch: compare((url) => url.search),
  };
}

export function hashOAuthClientId(clientId: string): string {
  return createHash("sha256").update(clientId).digest("hex").slice(0, 16);
}

function redirectValues(value: unknown): {
  redirects: string[];
  shape: OAuthRedirectFailureDiagnostics["registeredStorageShape"];
} {
  if (value === undefined || value === null) {
    return { redirects: [], shape: "missing" };
  }
  if (Array.isArray(value)) {
    return {
      redirects: value.filter(
        (item): item is string => typeof item === "string",
      ),
      shape: "json_array",
    };
  }
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return {
          redirects: parsed.filter(
            (item): item is string => typeof item === "string",
          ),
          shape: "json_encoded_array",
        };
      }
    } catch {
      // Report the shape, never the value.
    }
  }
  return { redirects: [], shape: "invalid" };
}

function parsedUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isUrl(value: URL | null): value is URL {
  return value !== null;
}

function isLoopbackIp(hostname: string): boolean {
  const host = hostname.startsWith("[")
    ? hostname.slice(1, -1).toLowerCase()
    : hostname.toLowerCase();
  if (host === "::1") return true;
  const octets = host.split(".");
  return (
    octets.length === 4 &&
    octets.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255) &&
    octets[0] === "127"
  );
}

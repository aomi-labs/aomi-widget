import "server-only";

import { getOrCreateAomiUserForBetterAuthSession } from "@aomi-labs/account";
import { auth, parseSiwsMessage } from "@aomi-labs/account/better-auth";
import { parseSiweMessage } from "viem/siwe";

import type { AccountInternalPrincipal } from "./internal-principal";
import { asRecord, type TokenPayload } from "./oauth-common";
import {
  PostgresOAuthPersistence,
  type OAuthPersistence,
} from "./oauth-persistence";

export { PostgresOAuthPersistence } from "./oauth-persistence";
export type { OAuthPersistence } from "./oauth-persistence";

const ACCESS_PREFIX = "aomi_at_";
const REFRESH_PREFIX = "aomi_rt_";
const ALLOWED_SCOPES = new Set(["agent", "profile", "offline_access"]);

export async function oauthMetadata(request: Request): Promise<Response> {
  const issuer = oauthIssuer(request);
  return oauthJson({
    issuer,
    authorization_endpoint: `${issuer}/api/auth/oauth2/authorize`,
    token_endpoint: `${issuer}/api/auth/oauth2/token`,
    device_authorization_endpoint: `${issuer}/api/auth/oauth2/device/code`,
    registration_endpoint: `${issuer}/api/auth/oauth2/register`,
    scopes_supported: [...ALLOWED_SCOPES],
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "urn:ietf:params:oauth:grant-type:device_code",
      "urn:aomi:params:oauth:grant-type:siwe",
      "urn:aomi:params:oauth:grant-type:siws",
    ],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}

export async function protectedResourceMetadata(
  request: Request,
): Promise<Response> {
  const issuer = oauthIssuer(request);
  return oauthJson({
    resource: agentResource(request),
    authorization_servers: [issuer],
    scopes_supported: ["agent"],
    bearer_methods_supported: ["header"],
  });
}

export async function registerOAuthClient(request: Request): Promise<Response> {
  const input = await request.json().catch(() => null);
  const record = asRecord(input);
  const redirectUris = Array.isArray(record?.redirectUris)
    ? record.redirectUris.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  if (!redirectUris.length || !redirectUris.every(validRedirectUri)) {
    return oauthError(400, "invalid_redirect_uri");
  }
  const response = await delegateAuth(request, "/mcp/register", {
    redirect_uris: redirectUris,
    client_name:
      typeof record?.clientName === "string"
        ? record.clientName
        : "Aomi client",
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: [...ALLOWED_SCOPES].join(" "),
  });
  if (!response.ok) return response;
  const body = asRecord(await response.json());
  return oauthJson(
    {
      clientId: body?.clientId,
      redirectUris: body?.redirectUrls,
    },
    201,
  );
}

export async function authorizeOAuthClient(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  if (
    url.searchParams.get("response_type") !== "code" ||
    url.searchParams.get("code_challenge_method") !== "S256" ||
    !url.searchParams.get("code_challenge") ||
    !validScopes(url.searchParams.get("scope") ?? undefined) ||
    url.searchParams.get("resource") !== agentResource(request)
  ) {
    return oauthError(400, "invalid_request");
  }
  url.pathname = "/api/auth/mcp/authorize";
  if (!url.searchParams.has("prompt"))
    url.searchParams.set("prompt", "consent");
  return auth.handler(new Request(url, request));
}

export async function decideOAuthConsent(request: Request): Promise<Response> {
  const input = asRecord(await request.json().catch(() => null));
  if (
    typeof input?.transaction !== "string" ||
    (input.decision !== "approve" && input.decision !== "deny")
  ) {
    return oauthError(400, "invalid_request");
  }
  const response = await delegateAuth(request, "/oauth2/consent", {
    consent_code: input.transaction,
    accept: input.decision === "approve",
  });
  if (!response.ok) return response;
  const body = asRecord(await response.json());
  return oauthJson({ redirectTo: body?.redirectURI });
}

export async function createDeviceAuthorization(
  request: Request,
): Promise<Response> {
  const input = await form(request);
  if (
    !input.client_id ||
    !validScopes(input.scope) ||
    input.resource !== agentResource(request)
  ) {
    return oauthError(400, "invalid_request");
  }
  return delegateAuth(request, "/device/code", {
    client_id: input.client_id,
    scope: input.scope,
  });
}

export async function exchangeOAuthToken(
  request: Request,
  dependencies: {
    persistence?: OAuthPersistence;
    delegate?: typeof delegateAuth;
  } = {},
): Promise<Response> {
  const persistence =
    dependencies.persistence ?? new PostgresOAuthPersistence();
  const delegate = dependencies.delegate ?? delegateAuth;
  const input = await form(request);
  const clientId = input.client_id;
  if (!clientId) return oauthError(400, "invalid_client");

  if (input.grant_type === "authorization_code") {
    const response = await delegate(request, "/mcp/token", input);
    return prefixTokenResponse(response);
  }
  if (input.grant_type === "refresh_token") {
    const raw = prefixed(input.refresh_token, REFRESH_PREFIX);
    if (!raw) return oauthError(401, "invalid_grant");
    const claim = await persistence.claimRefresh(raw);
    if (!claim) return oauthError(401, "invalid_grant");
    const response = await delegate(request, "/mcp/token", {
      ...input,
      refresh_token: claim.claim,
    });
    if (!response.ok) {
      await persistence.restoreRefresh(claim, raw);
      return response;
    }
    await persistence.finishRefresh(claim);
    return prefixTokenResponse(response);
  }
  if (input.grant_type === "urn:ietf:params:oauth:grant-type:device_code") {
    const response = await delegate(request, "/device/token", input);
    if (!response.ok) return response;
    const device = asRecord(await response.json());
    const sessionToken = string(device?.access_token);
    const scopes = scopesFrom(string(device?.scope));
    if (!sessionToken || !scopes) return oauthError(401, "invalid_grant");
    const issued = await persistence.issueFromSession({
      sessionToken,
      clientId,
      scopes,
    });
    return issued ? publicToken(issued) : oauthError(401, "invalid_grant");
  }
  if (
    input.grant_type === "urn:aomi:params:oauth:grant-type:siwe" ||
    input.grant_type === "urn:aomi:params:oauth:grant-type:siws"
  ) {
    const family = input.grant_type.endsWith("siwe") ? "siwe" : "siws";
    const client = await persistence.client(clientId);
    if (
      !client ||
      client.disabled ||
      !client.directWalletGrants.includes(family)
    ) {
      return oauthError(401, "unauthorized_client");
    }
    const scopes = scopesFrom(input.scope ?? "agent");
    if (!scopes || input.resource !== agentResource(request)) {
      return oauthError(400, "invalid_request");
    }
    const proof = walletProof(family, input.challenge, input.signature);
    if (!proof) return oauthError(400, "invalid_request");
    const response = await delegate(request, `/${family}/verify`, proof);
    if (!response.ok) return oauthError(401, "invalid_grant");
    const verified = asRecord(await response.json());
    const sessionToken = string(verified?.token);
    if (!sessionToken) return oauthError(401, "invalid_grant");
    const issued = await persistence.issueFromSession({
      sessionToken,
      clientId,
      scopes,
    });
    return issued ? publicToken(issued) : oauthError(401, "invalid_grant");
  }
  return oauthError(400, "unsupported_grant_type");
}

export async function validateOAuthAccessToken(
  accessToken: string,
  persistence: OAuthPersistence = new PostgresOAuthPersistence(),
): Promise<Omit<AccountInternalPrincipal, "kind"> | null> {
  const raw = prefixed(accessToken, ACCESS_PREFIX);
  if (!raw) return null;
  const token = await persistence.access(raw);
  if (!token) return null;
  const canonical = await getOrCreateAomiUserForBetterAuthSession({
    betterAuthUserId: token.betterAuthUserId,
    email: token.email,
    emailVerified: token.emailVerified,
    name: token.name,
    avatarUrl: token.image,
  });
  return {
    canonicalUserId: canonical.id,
    clientId: token.clientId,
    scopes: token.scopes,
  };
}

export async function resolveOAuthPrincipal(
  request: Request,
): Promise<AccountInternalPrincipal | null> {
  const match = /^Bearer (aomi_at_[A-Za-z0-9._~-]+)$/.exec(
    request.headers.get("authorization") ?? "",
  );
  if (!match) return null;
  const principal = await validateOAuthAccessToken(match[1]);
  return principal ? { kind: "account", ...principal } : null;
}

export function oauthChallenge(request: Request, scope = "agent"): Response {
  const metadata = `${oauthIssuer(request)}/.well-known/oauth-protected-resource/v1/agent`;
  return oauthJson(
    {
      error: {
        code: "authentication_required",
        message: "OAuth access token required",
        retryable: false,
      },
    },
    401,
    {
      "www-authenticate": `Bearer resource_metadata="${metadata}", scope="${scope}"`,
    },
  );
}

async function delegateAuth(
  request: Request,
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = `/api/auth${path}`;
  url.search = "";
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  return auth.handler(
    new Request(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

async function prefixTokenResponse(response: Response): Promise<Response> {
  if (!response.ok) return response;
  const body = asRecord(await response.json());
  const access = string(body?.access_token);
  if (!access) return oauthError(500, "server_error");
  return publicToken({
    access_token: access,
    refresh_token: string(body?.refresh_token),
    token_type: "Bearer",
    expires_in: Number(body?.expires_in ?? 3600),
    scope: string(body?.scope) ?? "",
  });
}

function publicToken(tokenPayload: TokenPayload): Response {
  return oauthJson({
    ...tokenPayload,
    access_token: `${ACCESS_PREFIX}${tokenPayload.access_token}`,
    ...(tokenPayload.refresh_token
      ? { refresh_token: `${REFRESH_PREFIX}${tokenPayload.refresh_token}` }
      : {}),
    token_type: "Bearer",
  });
}

function walletProof(
  family: "siwe" | "siws",
  challenge: string | undefined,
  signature: string | undefined,
): Record<string, unknown> | null {
  if (!challenge || !signature) return null;
  try {
    if (family === "siwe") {
      const parsed = parseSiweMessage(challenge);
      if (!parsed.address || !parsed.chainId) return null;
      return {
        message: challenge,
        signature,
        walletAddress: parsed.address,
        chainId: parsed.chainId,
      };
    }
    const parsed = parseSiwsMessage(challenge);
    return parsed
      ? {
          message: challenge,
          signature,
          walletAddress: parsed.address,
          chainId: parsed.chainId,
          intent: "sign-in",
        }
      : null;
  } catch {
    return null;
  }
}

function oauthIssuer(request: Request): string {
  const configured = process.env.BETTER_AUTH_URL?.trim();
  return configured ? new URL(configured).origin : new URL(request.url).origin;
}

function agentResource(request: Request): string {
  return `${oauthIssuer(request)}/v1/agent`;
}

function validRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

function validScopes(value: string | undefined): boolean {
  return scopesFrom(value) !== null;
}

function scopesFrom(value: string | undefined): string[] | null {
  if (!value) return null;
  const scopes = [...new Set(value.split(/\s+/).filter(Boolean))];
  return scopes.includes("agent") &&
    scopes.every((scope) => ALLOWED_SCOPES.has(scope))
    ? scopes
    : null;
}

function prefixed(value: string | undefined, prefix: string): string | null {
  return value?.startsWith(prefix) && value.length > prefix.length
    ? value.slice(prefix.length)
    : null;
}

async function form(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  const input = contentType.includes("application/json")
    ? asRecord(await request.json().catch(() => null))
    : Object.fromEntries(new URLSearchParams(await request.text()));
  return Object.fromEntries(
    Object.entries(input ?? {}).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  );
}

function oauthJson(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      pragma: "no-cache",
      ...Object.fromEntries(new Headers(headers)),
    },
  });
}

function oauthError(status: number, error: string): Response {
  return oauthJson({ error, error_description: error }, status);
}

function string(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

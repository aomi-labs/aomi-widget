import { createLocalJWKSet, jwtVerify } from "jose";
import type { AomiOAuthResource } from "../authorization";
import {
  acquireAomiDeviceGrant,
  discoverAomiAuthorizationServer,
  refreshAomiOAuthGrant,
} from "../oauth";
import { joinUrl, normalizeBaseUrl, requestJson } from "./auth";
import type { CliOAuthGrant } from "./state";

const DEVICE_GRANT = "urn:ietf:params:oauth:grant-type:device_code";

export class CliOAuthError extends Error {
  constructor(
    readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = "CliOAuthError";
  }
}

export async function signInWithOAuthDevice(input: {
  baseUrl: string;
  resource: AomiOAuthResource;
  scopes: readonly string[];
  expectedSubject: string;
  clientId?: string;
  fetch?: typeof fetch;
  openBrowser?: (url: string) => void | Promise<void>;
  now?: () => number;
}): Promise<CliOAuthGrant> {
  if (!input.expectedSubject) {
    throw new CliOAuthError(
      "account_session_required",
      "OAuth resource access requires an authenticated account session",
    );
  }
  const fetchImpl = input.fetch ?? fetch;
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const metadata = await discoverAomiAuthorizationServer({
    portalBaseUrl: baseUrl,
    fetch: fetchImpl,
  });
  const clientId =
    input.clientId ??
    requiredString(
      (
        await requestJson<{ client_id?: unknown }>(
          fetchImpl,
          joinUrl(metadata.issuer, "/oauth2/register"),
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              client_name: "Aomi CLI",
              token_endpoint_auth_method: "none",
              grant_types: [DEVICE_GRANT, "refresh_token"],
              resources: [input.resource],
              scope: input.scopes.join(" "),
            }),
          },
          "OAuth client registration",
        )
      ).client_id,
      "client_id",
    );
  const grant = await acquireAomiDeviceGrant({
    metadata,
    clientId,
    subject: input.expectedSubject,
    request: { resource: input.resource, scopes: input.scopes },
    fetch: fetchImpl,
    openBrowser: input.openBrowser ?? openUrl,
    onVerification: ({ verificationUriComplete, verificationUri, userCode }) =>
      console.log(
        `Open ${verificationUriComplete ?? verificationUri} and enter code ${userCode}`,
      ),
    now: input.now,
  });
  requireBearerGrant(grant.tokenType);
  const jwtExpiresAt = await verifyGrant(
    fetchImpl,
    metadata.jwks_uri,
    grant.accessToken,
    {
      issuer: metadata.issuer,
      resource: input.resource,
      subject: input.expectedSubject,
      now: input.now,
    },
  );
  return {
    clientId: grant.clientId,
    accessToken: grant.accessToken,
    refreshToken: grant.refreshToken,
    expiresAt: Math.min(grant.expiresAt, jwtExpiresAt),
    resource: grant.resource,
    scopes: grant.scopes,
    tokenType: grant.tokenType,
    issuer: metadata.issuer,
    origin: new URL(baseUrl).origin,
    subject: input.expectedSubject,
  };
}

export async function refreshCliOAuthGrant(input: {
  baseUrl: string;
  grant: CliOAuthGrant;
  fetch?: typeof fetch;
  now?: () => number;
}): Promise<CliOAuthGrant> {
  const fetchImpl = input.fetch ?? fetch;
  const origin = new URL(normalizeBaseUrl(input.baseUrl)).origin;
  if (input.grant.origin !== origin) {
    throw new CliOAuthError(
      "invalid_grant",
      "OAuth grant origin does not match the active Portal",
    );
  }
  const metadata = await discoverAomiAuthorizationServer({
    portalBaseUrl: input.baseUrl,
    fetch: fetchImpl,
  });
  if (metadata.issuer !== input.grant.issuer) {
    throw new CliOAuthError("invalid_grant", "OAuth grant issuer changed");
  }
  try {
    const refreshed = await refreshAomiOAuthGrant({
      metadata,
      grant: input.grant,
      request: {
        resource: input.grant.resource,
        scopes: input.grant.scopes,
      },
      fetch: fetchImpl,
      now: input.now,
    });
    requireBearerGrant(refreshed.tokenType);
    const jwtExpiresAt = await verifyGrant(
      fetchImpl,
      metadata.jwks_uri,
      refreshed.accessToken,
      {
        issuer: metadata.issuer,
        resource: input.grant.resource,
        subject: input.grant.subject,
        now: input.now,
      },
    );
    return {
      ...input.grant,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: Math.min(refreshed.expiresAt, jwtExpiresAt),
      scopes: refreshed.scopes,
      tokenType: refreshed.tokenType,
    };
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "refresh_failed";
    throw new CliOAuthError(
      code,
      error instanceof Error ? error.message : code,
    );
  }
}

function requireBearerGrant(tokenType: "Bearer" | "DPoP" | undefined): void {
  if (tokenType === "DPoP") {
    throw new CliOAuthError(
      "invalid_response",
      "CLI OAuth device tokens must use the Bearer token type",
    );
  }
}

async function verifyGrant(
  fetchImpl: typeof fetch,
  jwksUri: string,
  accessToken: string,
  expected: {
    issuer: string;
    resource: string;
    subject: string;
    now?: () => number;
  },
): Promise<number> {
  const response = await fetchImpl(jwksUri, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new CliOAuthError(
      "jwks_failed",
      `OAuth JWKS failed: HTTP ${response.status}`,
    );
  }
  const jwks = (await response.json()) as { keys?: unknown[] };
  if (!Array.isArray(jwks.keys)) {
    throw new CliOAuthError("invalid_jwks", "OAuth JWKS response is invalid");
  }
  try {
    const { payload } = await jwtVerify(
      accessToken,
      createLocalJWKSet(jwks as Parameters<typeof createLocalJWKSet>[0]),
      {
        issuer: expected.issuer,
        audience: expected.resource,
        algorithms: ["EdDSA"],
        requiredClaims: ["iss", "aud", "sub", "exp"],
        currentDate: expected.now ? new Date(expected.now()) : undefined,
      },
    );
    if (payload.sub !== expected.subject) {
      throw new CliOAuthError(
        "subject_mismatch",
        "OAuth token subject does not match the active account",
      );
    }
    return payload.exp! * 1000;
  } catch (error) {
    if (error instanceof CliOAuthError) throw error;
    throw new CliOAuthError(
      "invalid_token",
      error instanceof Error ? error.message : "OAuth access token is invalid",
    );
  }
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new CliOAuthError(
      "invalid_response",
      `OAuth response is missing ${name}`,
    );
  }
  return value;
}

async function openUrl(url: string) {
  const { spawn } = await import("node:child_process");
  const [command, args] =
    process.platform === "darwin"
      ? ["open", [url]]
      : process.platform === "win32"
        ? ["cmd", ["/c", "start", "", url]]
        : ["xdg-open", [url]];
  spawn(command, args, { detached: true, stdio: "ignore" }).unref();
}

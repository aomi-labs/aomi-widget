import "server-only";

import { auth } from "@aomi-labs/account/better-auth";
import {
  AOMI_CANONICAL_USER_CLAIM,
  AOMI_PRINCIPAL_CLASS_CLAIM,
} from "@aomi-labs/account/better-auth";
import { getOrCreateAomiUserForBetterAuthSession } from "@aomi-labs/account/account";
import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import type { JWTPayload } from "jose";

import { getBetterAuthSession } from "@portal/server/account/session";
import { resolveE2ECanonicalUserId } from "@portal/server/e2e-wallet";
import { isGuestRestEnabled } from "./features";
import { aomiOAuthResources, type AomiPublicResource } from "./resources";

export type ApiPrincipal = {
  canonicalUserId: string;
  scopes: readonly string[];
  resource: AomiPublicResource;
  clientId?: string;
  authSource: "oauth" | "session";
  principalClass: "user" | "guest";
  grantId?: string;
  sid?: string;
};

export class ApiPrincipalError extends Error {
  constructor(
    readonly status: 401 | 403,
    readonly code: "invalid_token" | "insufficient_scope" | "csrf_failed",
    readonly requiredScopes: readonly string[] = [],
  ) {
    super(code);
  }
}

const resourceClient = oauthProviderResourceClient(auth).getActions();

export function isOAuthCredential(request: Request): boolean {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const [scheme, credential] = authorization.split(/\s+/, 2);
  return (
    scheme?.toLowerCase() === "dpop" ||
    (scheme?.toLowerCase() === "bearer" && credential?.split(".").length === 3)
  );
}

export async function resolveApiPrincipal(input: {
  request: Request;
  resource: AomiPublicResource;
  requiredScopes: readonly string[];
  sessionScopes: readonly string[];
}): Promise<ApiPrincipal> {
  const e2eCanonicalUserId = resolveE2ECanonicalUserId(input.request);
  if (e2eCanonicalUserId) {
    enforceCookieCsrf(input.request);
    return {
      canonicalUserId: e2eCanonicalUserId,
      scopes: [...input.sessionScopes],
      resource: input.resource,
      authSource: "session",
      principalClass: "user",
      sid: "e2e-session",
    };
  }
  if (isOAuthCredential(input.request)) {
    let claims: JWTPayload;
    try {
      claims = await resourceClient.verifyAccessTokenRequest(input.request, {
        verifyOptions: { audience: input.resource },
        requiredScopes: input.requiredScopes,
        dpop: { signingAlgorithms: ["ES256", "EdDSA"] },
      });
    } catch (error) {
      const status =
        typeof error === "object" && error && "status" in error
          ? Number(error.status)
          : 401;
      throw new ApiPrincipalError(
        status === 403 ? 403 : 401,
        status === 403 ? "insufficient_scope" : "invalid_token",
        input.requiredScopes,
      );
    }
    const principal = await principalFromOAuthClaims(claims, input.resource);
    const session = await getBetterAuthSession(input.request);
    if (session?.user?.id) {
      const sessionCanonical = await getOrCreateAomiUserForBetterAuthSession({
        betterAuthUserId: session.user.id,
      });
      if (sessionCanonical.id !== principal.canonicalUserId) {
        throw new ApiPrincipalError(401, "invalid_token");
      }
    }
    if (
      principal.principalClass === "guest" &&
      !isGuestRestEnabled(input.resource)
    ) {
      throw new ApiPrincipalError(
        403,
        "insufficient_scope",
        input.requiredScopes,
      );
    }
    return principal;
  }

  // A non-JWT bearer is a Better Auth session token: the bearer plugin lets
  // getSession resolve it, which is how guest/SDK clients (no cookie
  // cross-origin) carry their session. An unresolvable credential still lands
  // on the trailing 401.
  const session = await getBetterAuthSession(input.request);
  if (session?.user?.id) {
    // Cookie-carried sessions are browser-ambient and need CSRF proof; a
    // request bearing an Authorization header cannot be forged cross-site
    // (custom headers force a CORS preflight), so it passes without one.
    if (!input.request.headers.has("authorization")) {
      enforceCookieCsrf(input.request);
    }
    const canonical = await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId: session.user.id,
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      name: session.user.name,
      avatarUrl: session.user.image,
    });
    const principalClass = session.user.isAnonymous === true ? "guest" : "user";
    if (principalClass === "guest" && !isGuestRestEnabled(input.resource)) {
      throw new ApiPrincipalError(
        403,
        "insufficient_scope",
        input.requiredScopes,
      );
    }
    const scopes =
      principalClass === "guest"
        ? guestScopes(input.resource, input.sessionScopes)
        : [...input.sessionScopes];
    for (const required of input.requiredScopes) {
      if (!scopes.includes(required)) {
        throw new ApiPrincipalError(
          403,
          "insufficient_scope",
          input.requiredScopes,
        );
      }
    }
    return {
      canonicalUserId: canonical.id,
      scopes,
      resource: input.resource,
      authSource: "session",
      principalClass,
      sid: session.session ? "session" : undefined,
    };
  }
  throw new ApiPrincipalError(401, "invalid_token");
}

export async function principalFromOAuthClaims(
  claims: JWTPayload,
  resource: AomiPublicResource,
): Promise<ApiPrincipal> {
  const canonicalClaim = claims[AOMI_CANONICAL_USER_CLAIM];
  const principalClassClaim = claims[AOMI_PRINCIPAL_CLASS_CLAIM];
  if (
    typeof claims.sub !== "string" ||
    typeof canonicalClaim !== "string" ||
    !["user", "guest"].includes(String(principalClassClaim))
  ) {
    throw new ApiPrincipalError(401, "invalid_token");
  }
  const defensive = await getOrCreateAomiUserForBetterAuthSession({
    betterAuthUserId: claims.sub,
  });
  if (defensive.id !== canonicalClaim) {
    console.warn("oauth canonical identity disagreement", {
      clientId: stringClaim(claims.client_id) ?? stringClaim(claims.azp),
    });
    throw new ApiPrincipalError(401, "invalid_token");
  }
  const scopes = String(claims.scope ?? "")
    .split(/\s+/)
    .filter(Boolean);
  const principalClass = principalClassClaim as "user" | "guest";
  const boundedScopes =
    principalClass === "guest" ? guestScopes(resource, scopes) : scopes;
  if (boundedScopes.length !== scopes.length) {
    throw new ApiPrincipalError(403, "insufficient_scope", boundedScopes);
  }
  return {
    canonicalUserId: canonicalClaim,
    scopes: boundedScopes,
    resource,
    clientId: stringClaim(claims.client_id) ?? stringClaim(claims.azp),
    authSource: "oauth",
    principalClass,
    grantId: stringClaim(claims.jti),
    sid: stringClaim(claims.sid),
  };
}

function guestScopes(resource: AomiPublicResource, scopes: readonly string[]) {
  const path = new URL(resource).pathname;
  const ceiling = path.includes("agent")
    ? new Set(["agent:read", "agent:write", "mcp:agent", "offline_access"])
    : new Set([
        "pipeline:catalog",
        "mcp:pipeline",
        "offline_access",
        ...(process.env.AOMI_GUEST_PIPELINE_EXECUTION_ENABLED === "true"
          ? ["pipeline:execute"]
          : []),
      ]);
  return scopes.filter((scope) => ceiling.has(scope));
}

function enforceCookieCsrf(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
  if (request.headers.has("authorization")) return;
  const origin = request.headers.get("origin");
  const expected = new Set([
    new URL(request.url).origin,
    aomiOAuthResources().issuer,
  ]);
  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",", 1)[0]
    ?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",", 1)[0]?.trim() ??
    "https";
  if (forwardedHost) expected.add(`${forwardedProto}://${forwardedHost}`);
  if (!origin || !expected.has(origin)) {
    throw new ApiPrincipalError(403, "csrf_failed");
  }
}

function stringClaim(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function apiAuthError(
  error: unknown,
  resource: AomiPublicResource,
): Response {
  const principalError =
    error instanceof ApiPrincipalError
      ? error
      : new ApiPrincipalError(401, "invalid_token");
  const metadata = `/.well-known/oauth-protected-resource${new URL(resource).pathname}`;
  const params = [
    `resource_metadata="${new URL(metadata, resource)}"`,
    `error="${principalError.code}"`,
    principalError.requiredScopes.length
      ? `scope="${principalError.requiredScopes.join(" ")}"`
      : null,
  ].filter(Boolean);
  return Response.json(
    { error: { code: principalError.code, message: "Authorization failed" } },
    {
      status: principalError.status,
      headers: { "www-authenticate": `Bearer ${params.join(", ")}` },
    },
  );
}

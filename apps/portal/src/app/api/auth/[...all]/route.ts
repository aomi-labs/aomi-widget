import { auth } from "@aomi-labs/account/better-auth";
import {
  aomiOAuthResources,
  guestScopesForAomiResource,
  narrowMcpRegistrationScopes,
} from "@aomi-labs/account/better-auth";

import {
  applyManagedWidgetCors,
  isManagedWidgetClientOrigin,
  managedWidgetPreflight,
  oauthBodyClientId,
  publicDiscoveryResponse,
} from "@portal/server/oauth/cors";
import { enforceAomiOAuthRequestPolicy } from "@portal/server/oauth/request-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleAuth(request: Request) {
  const path = new URL(request.url).pathname;
  const isBrowserGrantEndpoint = ["/oauth2/token", "/oauth2/revoke"].some(
    (suffix) => path.endsWith(suffix),
  );
  const origin = request.headers.get("origin");
  const crossOrigin =
    origin !== null && origin !== aomiOAuthResources().portalOrigin;
  const browserClientId =
    isBrowserGrantEndpoint && crossOrigin
      ? await oauthBodyClientId(request)
      : undefined;
  if (
    isBrowserGrantEndpoint &&
    crossOrigin &&
    !(await isManagedWidgetClientOrigin(origin, browserClientId))
  ) {
    return Response.json({ error: "origin_not_allowed" }, { status: 403 });
  }
  const policyFailure = await enforceAomiOAuthRequestPolicy(request);
  if (policyFailure) return policyFailure;
  if (request.method === "POST" && path.endsWith("/sign-in/anonymous")) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session) {
      return Response.json({ code: "session_exists" }, { status: 409 });
    }
  }
  if (request.method === "POST" && path.endsWith("/oauth2/consent")) {
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user.isAnonymous === true) {
      const body = (await request
        .clone()
        .json()
        .catch(() => null)) as Record<string, unknown> | null;
      const requested = String(body?.scope ?? "")
        .split(/\s+/)
        .filter(Boolean);
      if (!body || requested.length === 0) {
        return Response.json(
          {
            error: "invalid_request",
            error_description:
              "Guest consent must explicitly select its bounded scopes",
          },
          { status: 400 },
        );
      }
      const oauthQuery =
        typeof body.oauth_query === "string"
          ? new URLSearchParams(body.oauth_query)
          : null;
      const consentResources = oauthQuery?.getAll("resource") ?? [];
      const oidcOnly =
        consentResources.length === 0 &&
        requested.includes("openid") &&
        requested.every((scope) =>
          ["openid", "profile", "email", "offline_access"].includes(scope),
        );
      if (oidcOnly) {
        // Identity-only consent is intentionally separate from Aomi resource
        // grants and remains governed by Better Auth's signed OAuth query.
      } else {
        if (consentResources.length !== 1) {
          return Response.json(
            {
              error: "invalid_target",
              error_description: "Guest consent requires one signed resource",
            },
            { status: 400 },
          );
        }
        const resource = consentResources[0];
        const bounded = guestScopesForAomiResource(resource, requested);
        if (bounded.length === 0) {
          return Response.json(
            {
              error: "invalid_scope",
              error_description: "No guest-safe scope selected",
            },
            { status: 400 },
          );
        }
        request = new Request(request, {
          body: JSON.stringify({ ...body, scope: bounded.join(" ") }),
        });
      }
    }
  }
  let response = await auth.handler(request);
  if (request.method === "POST" && path.endsWith("/oauth2/register")) {
    response = await narrowRegisteredScopes(request, response);
  }
  if (request.method === "GET" && path.endsWith("/jwks")) {
    response = publicDiscoveryResponse(response);
  }
  if (isBrowserGrantEndpoint && crossOrigin) {
    response = await applyManagedWidgetCors({
      request,
      response,
      clientId: browserClientId,
    });
  }
  if (isObservedOAuthPath(path)) {
    console.info("better_auth_oauth_endpoint", {
      endpoint: path.slice(path.lastIndexOf("/api/auth") + "/api/auth".length),
      method: request.method,
      resultClass:
        response.status < 400
          ? "success"
          : response.status < 500
            ? "client_error"
            : "server_error",
      status: response.status,
    });
  }
  return response;
}

/**
 * Advertise the scopes this client actually asked for, not every scope it is
 * allowed to hold.
 *
 * Better Auth answers a dynamic registration with the whole allowed scope set
 * regardless of what the client requested. An MCP client then asks for its
 * entire advertised set at authorize, where `enforceAomiOAuthRequestPolicy`
 * validates it against the single requested resource — so advertising Agent
 * and Pipeline scopes together produced a request no one resource could
 * satisfy, and login failed with invalid_scope before the browser opened.
 *
 * A client already tells us which resource it means, by deriving its requested
 * scope from that resource's protected-resource metadata. Echoing that back is
 * what lets `codex mcp add aomi-agent` and `codex mcp add aomi-pipeline` each
 * log in.
 *
 * This narrows what is advertised, not what is stored: the grant itself is
 * still bounded at authorize and token, which is where the one-exact-resource
 * rule and per-resource scope validation run.
 */
async function narrowRegisteredScopes(
  request: Request,
  response: Response,
): Promise<Response> {
  if (!response.ok) return response;
  const requested = await request
    .clone()
    .json()
    .then((body: unknown) =>
      body && typeof body === "object" && "scope" in body
        ? String((body as { scope?: unknown }).scope ?? "")
        : "",
    )
    .catch(() => "");
  const registered = (await response
    .clone()
    .json()
    .catch(() => null)) as Record<string, unknown> | null;
  if (!registered) return response;
  const body = JSON.stringify({
    ...registered,
    scope: narrowMcpRegistrationScopes(requested).join(" "),
  });
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isObservedOAuthPath(path: string): boolean {
  return ["/oauth2/", "/device/", "/jwks"].some((part) => path.includes(part));
}

export const GET = handleAuth;
export const POST = handleAuth;
export const PUT = handleAuth;
export const PATCH = handleAuth;
export const DELETE = handleAuth;

export async function OPTIONS(request: Request) {
  const path = new URL(request.url).pathname;
  if (
    ["/oauth2/token", "/oauth2/revoke"].some((suffix) => path.endsWith(suffix))
  ) {
    return managedWidgetPreflight(request, ["POST", "OPTIONS"]);
  }
  if (path.endsWith("/jwks")) {
    return publicDiscoveryResponse(new Response(null, { status: 204 }));
  }
  return new Response(null, { status: 204 });
}

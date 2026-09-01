import {
  aomiOAuthResourcePolicy,
  aomiOAuthResources,
  narrowScopesForAomiResource,
  validateAomiResourceScopes,
} from "./resources";

type OAuthError =
  | "invalid_client_metadata"
  | "invalid_request"
  | "invalid_scope"
  | "invalid_target"
  | "unauthorized_client";

type RequestValues = {
  get(name: string): string | null;
  getAll(name: string): string[];
};

export type AomiOAuthPolicyResult =
  | { kind: "reject"; response: Response }
  | { kind: "continue"; request: Request };

/**
 * Aomi's public API grants are deliberately stricter than generic RFC 8707:
 * every grant has one exact resource and never mixes OIDC identity scopes into
 * an API token. Better Auth remains the protocol implementation; this guard is
 * the code-owned Aomi policy applied before its endpoint parser.
 *
 * Scopes are NARROWED to the requested resource rather than rejected for being
 * broader than it. MCP clients build their scope request from the
 * authorization server's `scopes_supported`, which necessarily spans every
 * resource this server hosts, so a client asking for one resource still asks
 * for the whole list — verified by capturing what Codex sends. Rejecting that
 * made MCP login impossible for both resources, and there is no single
 * advertised set that satisfies two resources whose scopes do not overlap.
 * RFC 6749 §3.3 lets the authorization server issue a narrower scope than was
 * requested, which is exactly the right answer here: the grant that gets minted
 * still carries only scopes valid for its one resource, so the boundary is
 * unchanged while the flow completes.
 */
export async function enforceAomiOAuthRequestPolicy(
  request: Request,
): Promise<AomiOAuthPolicyResult> {
  const path = new URL(request.url).pathname;
  if (request.method === "POST" && path.endsWith("/oauth2/register")) {
    const rejection = await enforceMcpRegistration(request);
    return rejection ? reject(rejection) : proceed(request);
  }

  const isAuthorize =
    request.method === "GET" && path.endsWith("/oauth2/authorize");
  const isDevice = request.method === "POST" && path.endsWith("/device/code");
  const isToken = request.method === "POST" && path.endsWith("/oauth2/token");
  if (!isAuthorize && !isDevice && !isToken) return proceed(request);

  const values = isAuthorize
    ? new URL(request.url).searchParams
    : await formValues(request);
  if (!values) {
    return reject(oauthError("invalid_request", "Malformed OAuth request"));
  }

  const resources = values.getAll("resource").filter(Boolean);
  const scopes = splitScopes(values.get("scope"));
  const oidcOnly =
    resources.length === 0 &&
    scopes.includes("openid") &&
    scopes.every((scope) =>
      ["openid", "profile", "email", "offline_access"].includes(scope),
    );

  // OIDC-only authorization is a separate use case. Token callers make that
  // intent explicit with scope so an omitted Aomi resource cannot be confused
  // with an identity-only exchange.
  if (oidcOnly) return proceed(request);
  if (resources.length !== 1) {
    return reject(
      oauthError(
        "invalid_target",
        "Exactly one Aomi resource parameter is required",
      ),
    );
  }
  if (!aomiOAuthResourcePolicy(resources[0])) {
    return reject(oauthError("invalid_target", "Unknown Aomi resource"));
  }
  if ((isAuthorize || isDevice) && scopes.length === 0) {
    return reject(
      oauthError("invalid_scope", "Aomi resource scopes are required"),
    );
  }
  if (scopes.length === 0) return proceed(request);

  const narrowed = narrowScopesForAomiResource(resources[0], scopes);
  if (narrowed.length === 0) {
    return reject(
      oauthError("invalid_scope", "No scope is valid for this resource"),
    );
  }
  // Belt and braces: whatever survives narrowing must still satisfy the policy
  // outright, so a bug in the narrowing cannot widen a grant.
  const result = validateAomiResourceScopes(resources[0], narrowed);
  if (!result.ok) {
    return reject(
      oauthError(result.error, "Scopes are not valid for this resource"),
    );
  }
  if (narrowed.length === scopes.length) return proceed(request);
  return proceed(await withScope(request, isAuthorize, narrowed.join(" ")));
}

function reject(response: Response): AomiOAuthPolicyResult {
  return { kind: "reject", response };
}

function proceed(request: Request): AomiOAuthPolicyResult {
  return { kind: "continue", request };
}

/** Rebuild the request carrying the narrowed scope, query or form as needed. */
async function withScope(
  request: Request,
  isAuthorize: boolean,
  scope: string,
): Promise<Request> {
  // Build the replacement from explicit parts rather than cloning the original
  // init: carrying the source request's `signal` across constructors is
  // rejected outright by some runtimes.
  if (isAuthorize) {
    const url = new URL(request.url);
    url.searchParams.set("scope", scope);
    return new Request(url, {
      method: request.method,
      headers: request.headers,
    });
  }
  const form = new URLSearchParams(await request.clone().text());
  form.set("scope", scope);
  return new Request(request.url, {
    method: request.method,
    headers: request.headers,
    body: form.toString(),
  });
}

async function enforceMcpRegistration(
  request: Request,
): Promise<Response | null> {
  const metadata = (await request
    .clone()
    .json()
    .catch(() => null)) as Record<string, unknown> | null;
  if (!metadata) {
    return oauthError("invalid_client_metadata", "Malformed client metadata");
  }
  if (String(metadata.token_endpoint_auth_method ?? "none") !== "none") {
    return oauthError(
      "invalid_client_metadata",
      "Unauthenticated registration is limited to public clients",
    );
  }
  const grants = stringArray(metadata.grant_types);
  if (
    grants.includes("client_credentials") ||
    grants.some(
      (grant) => !["authorization_code", "refresh_token"].includes(grant),
    )
  ) {
    return oauthError(
      "unauthorized_client",
      "Registration is limited to authorization-code MCP clients",
    );
  }
  // RFC 7591 client metadata has no resource field, and the MCP clients we
  // support register without one: they bind the resource later, per RFC 8707,
  // on authorize and token. Registration is client identity only, so requiring
  // a resource here rejected every real client before it could reach the
  // browser flow. `enforceAomiOAuthRequestPolicy` above is what holds the
  // one-exact-resource invariant, on the requests that actually mint a grant.
  // A client that does declare `resources` is still held to exactly one.
  const requestedResources = stringArray(metadata.resources);
  if (requestedResources.length === 0) return null;
  const resources = aomiOAuthResources();
  if (
    requestedResources.length !== 1 ||
    ![resources.agentMcp, resources.pipelineMcp].includes(
      requestedResources[0] as typeof resources.agentMcp,
    )
  ) {
    return oauthError(
      "invalid_target",
      "Registration is limited to one MCP resource",
    );
  }
  const scopes = splitScopes(
    typeof metadata.scope === "string" ? metadata.scope : null,
  );
  const validated = validateAomiResourceScopes(requestedResources[0], scopes);
  if (!validated.ok) {
    return oauthError(validated.error, "Invalid MCP registration scopes");
  }
  return null;
}

async function formValues(request: Request): Promise<RequestValues | null> {
  const type = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (type.includes("application/x-www-form-urlencoded")) {
    return new URLSearchParams(await request.clone().text());
  }
  if (type.includes("application/json")) {
    const body = (await request
      .clone()
      .json()
      .catch(() => null)) as Record<string, unknown> | null;
    if (!body) return null;
    return {
      get(name) {
        const value = body[name];
        return typeof value === "string" ? value : null;
      },
      getAll(name) {
        const value = body[name];
        if (typeof value === "string") return [value];
        return stringArray(value);
      },
    };
  }
  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function splitScopes(value: string | null): string[] {
  return (value ?? "").split(/\s+/).filter(Boolean);
}

function oauthError(error: OAuthError, errorDescription: string): Response {
  return Response.json(
    { error, error_description: errorDescription },
    { status: error === "unauthorized_client" ? 401 : 400 },
  );
}

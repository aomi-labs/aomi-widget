import { auth } from "@aomi-labs/account/better-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleAuth(request: Request) {
  const path = new URL(request.url).pathname;
  if (request.method === "POST" && path.endsWith("/oauth2/register")) {
    const metadata = await request
      .clone()
      .json()
      .catch(() => ({}));
    const method = String(metadata?.token_endpoint_auth_method ?? "none");
    if (method !== "none") {
      return Response.json(
        {
          error: "invalid_client_metadata",
          error_description:
            "Unauthenticated dynamic registration is limited to public clients",
        },
        { status: 400 },
      );
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
      const allowed = new Set([
        "agent:read",
        "agent:write",
        "pipeline:catalog",
        "mcp:agent",
        "mcp:pipeline",
        "offline_access",
        ...(process.env.AOMI_GUEST_PIPELINE_EXECUTION_ENABLED === "true"
          ? ["pipeline:execute"]
          : []),
      ]);
      const bounded = requested.filter((scope) => allowed.has(scope));
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
  const response = await auth.handler(request);
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

function isObservedOAuthPath(path: string): boolean {
  return ["/oauth2/", "/device/", "/jwks"].some((part) => path.includes(part));
}

export const GET = handleAuth;
export const POST = handleAuth;
export const PUT = handleAuth;
export const PATCH = handleAuth;
export const DELETE = handleAuth;

import { proxyAgentApi } from "@portal/server/agent-api-proxy";
import {
  apiAuthError,
  resolveApiPrincipal,
} from "@portal/server/oauth/principal";
import {
  AGENT_SCOPES,
  aomiOAuthResources,
} from "@portal/server/oauth/resources";
import {
  applyManagedWidgetOriginCors,
  managedWidgetPreflight,
} from "@portal/server/oauth/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle(request: Request): Promise<Response> {
  const resource = aomiOAuthResources().agentRest;
  let response: Response;
  try {
    const requiredScopes = agentRouteScopes(request);
    const principal = await resolveApiPrincipal({
      request,
      resource,
      requiredScopes,
      sessionScopes: AGENT_SCOPES.filter((scope) => scope !== "mcp:agent"),
    });
    const delegatedScopes = [...requiredScopes];
    if (
      requiredScopes.includes("agent:write") &&
      principal.scopes.includes("custody:delegate")
    ) {
      delegatedScopes.push("custody:delegate");
    }
    response = await proxyAgentApi(request, {
      ...principal,
      scopes: delegatedScopes,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      ["invalid_token", "insufficient_scope", "csrf_failed"].includes(
        error.message,
      )
    ) {
      response = apiAuthError(error, resource);
    } else {
      response = Response.json(
        {
          error: {
            code: "upstream_unavailable",
            message: "Agent API unavailable",
          },
        },
        { status: 502 },
      );
    }
  }
  return applyManagedWidgetOriginCors({ request, response });
}

function agentRouteScopes(request: Request): string[] {
  if (request.method === "GET") return ["agent:read"];
  if (/\/actions\/[^/]+\/result$/.test(new URL(request.url).pathname)) {
    return ["agent:actions:resolve"];
  }
  const scopes = ["agent:write"];
  if (request.headers.has("payment-signature")) scopes.push("payments:submit");
  return scopes;
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = (request: Request) =>
  managedWidgetPreflight(request, [
    "GET",
    "POST",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ]);

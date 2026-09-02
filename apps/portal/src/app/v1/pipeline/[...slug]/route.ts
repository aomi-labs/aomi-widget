import { proxyAgentApi } from "@portal/server/agent-api-proxy";
import {
  apiAuthError,
  resolveApiPrincipal,
} from "@portal/server/oauth/principal";
import {
  PIPELINE_SCOPES,
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
  const resource = aomiOAuthResources().pipelineRest;
  let response: Response;
  try {
    const requiredScopes = [
      request.method === "GET" ? "pipeline:catalog" : "pipeline:execute",
      ...(request.headers.has("payment-signature") ? ["payments:submit"] : []),
    ];
    const principal = await resolveApiPrincipal({
      request,
      resource,
      requiredScopes,
      sessionScopes: PIPELINE_SCOPES.filter(
        (scope) => scope !== "mcp:pipeline",
      ),
    });
    const delegatedScopes = [...requiredScopes];
    if (
      requiredScopes.includes("pipeline:execute") &&
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
            message: "Pipeline API unavailable",
          },
        },
        { status: 502 },
      );
    }
  }
  return applyManagedWidgetOriginCors({ request, response });
}

export const GET = handle;
export const POST = handle;
export const OPTIONS = (request: Request) =>
  managedWidgetPreflight(request, ["GET", "POST", "OPTIONS"]);

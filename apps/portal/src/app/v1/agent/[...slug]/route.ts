import { resolveCanonicalUserId } from "@portal/server/canonical-session";
import { proxyAgentApi } from "@portal/server/agent-api-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle(request: Request): Promise<Response> {
  const canonicalUserId = await resolveCanonicalUserId(request);
  if (!canonicalUserId) {
    return Response.json(
      {
        error: {
          code: "authentication_required",
          message: "Authentication required",
        },
      },
      { status: 401 },
    );
  }
  try {
    return await proxyAgentApi(request, canonicalUserId);
  } catch {
    return Response.json(
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

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;

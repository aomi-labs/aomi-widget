import { handleAgentMcp } from "@portal/server/agent/mcp";
import {
  oauthChallenge,
  resolveOAuthPrincipal,
} from "@portal/server/agent/oauth";
import { mcpMethodNotAllowed } from "@portal/server/mcp/rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const principal = await resolveOAuthPrincipal(request);
  return principal
    ? handleAgentMcp(request, principal)
    : oauthChallenge(request);
}

export const GET = mcpMethodNotAllowed;
export const DELETE = mcpMethodNotAllowed;

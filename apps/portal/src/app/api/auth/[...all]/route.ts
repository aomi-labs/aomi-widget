import { auth } from "@aomi-labs/account/better-auth";
import { withRegisteredMcpRedirectUri } from "@portal/server/mcp/oauth-redirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleAuth(request: Request) {
  return auth.handler(await withRegisteredMcpRedirectUri(request));
}

export const GET = handleAuth;
export const POST = handleAuth;
export const PUT = handleAuth;
export const PATCH = handleAuth;
export const DELETE = handleAuth;

import { auth } from "@portal/lib/mcp-auth";

const MCP_SCOPE = "aomi:mcp";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const metadata = await auth.api.getMcpOAuthConfig({
    request,
    asResponse: false,
  });

  if (!metadata) {
    return Response.json(null, { status: 500 });
  }

  const scopes = new Set(metadata.scopes_supported ?? []);
  scopes.add(MCP_SCOPE);

  return Response.json({
    ...metadata,
    issuer: `${new URL(request.url).origin}/api/auth`,
    scopes_supported: [...scopes],
  });
}

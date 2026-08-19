import { type NextRequest, NextResponse } from "next/server";

const ALLOWED_PROVIDERS = new Set(["privy", "para"]);

/**
 * OAuth wallet provider authorization redirect.
 * Handles /auth/privy and /auth/para requests from the MCP backend
 * and redirects to the correct delegation endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return new NextResponse("Unsupported wallet provider", { status: 404 });
  }

  const searchParams = request.nextUrl.searchParams;

  // Redirect to the correct API delegation endpoint with all query parameters
  const delegationUrl = new URL(request.nextUrl.origin);
  delegationUrl.pathname = `/api/delegation/${provider}/begin`;
  delegationUrl.search = searchParams.toString();

  return NextResponse.redirect(delegationUrl);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


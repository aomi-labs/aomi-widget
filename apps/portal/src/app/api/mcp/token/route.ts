import { NextRequest, NextResponse } from "next/server";

import { mintAccountBearer } from "@aomi-labs/account";
import { getSessionedCanonicalId } from "@portal/lib/aomi-account/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const canonicalId = await getSessionedCanonicalId(request);
  if (!canonicalId) {
    return NextResponse.json(
      { error: "Portal session required" },
      { status: 401 },
    );
  }

  try {
    const { accessToken, expiresAt } = await mintAccountBearer(canonicalId);
    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_at: expiresAt,
      user_id: canonicalId,
    });
  } catch (error) {
    console.warn("MCP token handoff: could not mint AccountBearer", {
      message: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Could not mint MCP bearer" },
      { status: 503 },
    );
  }
}

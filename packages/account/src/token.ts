import { type NextRequest, NextResponse } from "next/server";

import { mintAccountBearer } from "./bearer";
import type { ResolveCanonicalUserId } from "./proxy";

/**
 * The shared AccountBearer route helper. The app supplies session resolution;
 * this package only mints a freshly signed backend bearer for the resolved
 * canonical user.
 *
 * This is the **direct-to-backend** seam: a client that wants to talk to the Rust
 * backend itself (not through this BFF's proxy) pulls a short-lived backend bearer
 * from here. The `aomi` CLI does **not** need it for normal use — it points at the
 * BFF and lets the proxy mint inline from the session it presents.
 *
 * ```ts
 * export const GET = createBearerTokenRoute({ resolveCanonicalUserId });
 * export const runtime = "nodejs";
 * ```
 */
export function createBearerTokenRoute(config: {
  resolveCanonicalUserId: ResolveCanonicalUserId;
}) {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const userId = await config.resolveCanonicalUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }
    try {
      const { bearer, expiresAt } = await mintAccountBearer(userId);
      return NextResponse.json({
        bearer,
        expires_at: expiresAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to mint bearer";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

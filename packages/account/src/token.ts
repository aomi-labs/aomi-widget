import { type NextRequest, NextResponse } from "next/server";

import { mintAccountBearer } from "./bearer";
import { getSessionedCanonicalId } from "./session";

/**
 * The shared **token** route every Aomi BFF mounts at `/api/bff/auth/token`.
 * Reads the BFF session (via `getSessionedCanonicalId` — `Authorization: Bearer
 * <aomi_session>` first, cookie fallback) and returns a freshly minted
 * AccountBearer for the canonical user it carries.
 *
 * This is the **direct-to-backend** seam: a client that wants to talk to the Rust
 * backend itself (not through this BFF's proxy) pulls a short-lived backend bearer
 * from here. The `aomi` CLI does **not** need it for normal use — it points at the
 * BFF and lets the proxy mint inline from the session it presents — but the
 * endpoint exists as the drop-in analog of arixon's BetterAuth `jwt()` plugin at
 * `GET /api/auth/token` (same role, same response), so the migration is a URL
 * swap. See docs/handoffs/bff-betterauth-integration.md §3.
 *
 * ```ts
 * export const GET = createBearerTokenRoute();
 * export const runtime = "nodejs";
 * ```
 */
export function createBearerTokenRoute() {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const userId = await getSessionedCanonicalId(request);
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

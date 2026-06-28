import { type NextRequest, NextResponse } from "next/server";

import { mintAccountBearer } from "./bearer";
import { readSessionCookie, SESSION_COOKIE } from "./session";

/**
 * The shared **token** route every Aomi BFF mounts at `/api/bff/auth/token`.
 * Reads the BFF session and returns a freshly minted AccountBearer for the
 * canonical user it carries.
 *
 * This is the seam a **headless** client (the `aomi` CLI) uses. A browser never
 * needs it — the same-origin proxy mints and injects the bearer inline — but the
 * CLI can't be same-origin, so it holds the long-lived session and pulls a
 * short-lived backend bearer from here, refreshing on 401/expiry. That is the
 * exact loop arixon's BetterAuth `jwt()` plugin serves at `GET /api/auth/token`,
 * so this route is shaped as its drop-in: same role, same response.
 *
 * The session is read from `Authorization: Bearer <aomi_session>` first — the
 * header shape arixon's `bearer()` plugin uses — then the `aomi_session` cookie
 * as a fallback. Pre-matching the header means the CLI migrates onto BetterAuth
 * by swapping the URL only (`/api/bff/auth/token` → `/api/auth/token`). See
 * docs/handoffs/bff-betterauth-integration.md §3.
 *
 * ```ts
 * export const GET = createBearerTokenRoute();
 * export const runtime = "nodejs";
 * ```
 */
export function createBearerTokenRoute() {
  return async function GET(request: NextRequest): Promise<NextResponse> {
    const userId = await readSessionCookie(readSessionToken(request));
    if (!userId) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }
    try {
      const { accessToken, expiresAt } = await mintAccountBearer(userId);
      return NextResponse.json({
        access_token: accessToken,
        token_type: "Bearer",
        expires_at: expiresAt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to mint bearer";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

/**
 * The session token from `Authorization: Bearer <aomi_session>` (preferred — the
 * header arixon's bearer() plugin uses) or the `aomi_session` cookie (browser /
 * same-origin fallback). Either way it is the HS256 session JWT, not the backend
 * bearer this route returns.
 */
function readSessionToken(request: NextRequest): string | undefined {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (match) return match[1].trim();
  }
  return request.cookies.get(SESSION_COOKIE)?.value;
}

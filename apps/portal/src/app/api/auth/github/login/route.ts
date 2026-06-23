import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "aomi_github_oauth_state";

// GET /api/auth/github/login — kick off "Sign in with GitHub".
// Redirects to GitHub's user-authorization page; the callback below mints the
// portal GitHub session. Requires `GITHUB_OAUTH_CLIENT_ID` (the client id of the
// GitHub App used for login) and that `<origin>/api/auth/github/callback` is a
// registered OAuth redirect on that App.
export async function GET(req: Request) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID?.trim();
  if (!clientId) {
    return NextResponse.json(
      { error: "GITHUB_OAUTH_CLIENT_ID is not configured" },
      { status: 500 },
    );
  }
  const origin = new URL(req.url).origin;
  const state = randomBytes(16).toString("hex");

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", `${origin}/api/auth/github/callback`);
  authorize.searchParams.set("state", state);

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}

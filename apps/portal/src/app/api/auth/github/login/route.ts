import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OAUTH_STATE_COOKIE = "aomi_github_oauth_state";
const STAGING_CLIENT_ID = "Iv23liYCfZYr4JhvfwgN";
const PRODUCTION_CLIENT_ID = "Iv23liMWx5sEbC2mMRBu";

function githubOAuthClientId(req: Request): string {
  const host = new URL(req.url).hostname;
  if (process.env.VERCEL_ENV === "production" || host === "portal.aomi.dev") {
    return PRODUCTION_CLIENT_ID;
  }
  return STAGING_CLIENT_ID;
}

// GET /api/auth/github/login — kick off "Sign in with GitHub".
// Redirects to GitHub's user-authorization page; the callback below mints the
// portal GitHub session. The client id is public; only the matching client
// secret lives backend-side in the GitHub App config used by oauth/exchange.
export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const state = randomBytes(16).toString("hex");

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", githubOAuthClientId(req));
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

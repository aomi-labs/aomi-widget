import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { deploymentClient } from "@portal/server/bff/backend";
import { setGitHubSessionCookie } from "@portal/lib/aomi-account/github-session";

const OAUTH_STATE_COOKIE = "aomi_github_oauth_state";
// The GitHub App index whose client id `GITHUB_OAUTH_CLIENT_ID` belongs to — the
// backend exchange must use the matching client secret. 1 = build App.
const LOGIN_APP_INDEX = 1;

// GET /api/auth/github/callback?code=...&state=... — finish "Sign in with
// GitHub": verify CSRF state, exchange the code for the GitHub identity
// (backend-side), mint the portal GitHub session cookie, return to /settings.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settings = new URL("/settings", url.origin);

  const jar = await cookies();
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    settings.searchParams.set("github_error", "invalid_oauth_state");
    return NextResponse.redirect(settings);
  }

  try {
    const client = await deploymentClient();
    const identity = await client.exchangeGitHubCode({
      code,
      app: LOGIN_APP_INDEX,
    });
    if (!identity.githubUserId) {
      settings.searchParams.set("github_error", "identity_unresolved");
      return NextResponse.redirect(settings);
    }
    const res = NextResponse.redirect(settings);
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    await setGitHubSessionCookie(res, {
      githubUserId: identity.githubUserId,
      githubLogin: identity.githubLogin,
    });
    return res;
  } catch {
    settings.searchParams.set("github_error", "exchange_failed");
    return NextResponse.redirect(settings);
  }
}

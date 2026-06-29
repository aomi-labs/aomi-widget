import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { deploymentClient } from "@portal/server/bff/backend";
import { setGitHubSessionCookie } from "@portal/server/cookies/github";

const OAUTH_STATE_COOKIE = "aomi_github_oauth_state";
// Sign-in runs against the one-shot App so the resulting user token can
// enumerate the user's one-shot installations (skip-install detection). The
// backend exchange uses the matching client secret. 2 = one-shot App.
const LOGIN_APP_INDEX = 2;

function deploySettingsUrl(req: Request): URL {
  const url = new URL(req.url);
  const settings = new URL("/settings", url.origin);
  settings.searchParams.set("launch", "github");
  return settings;
}

// GET /api/bff/auth/github/callback?code=...&state=... — finish "Sign in with
// GitHub": verify CSRF state, exchange the code for the GitHub identity
// (backend-side), mint the portal GitHub session cookie, return to /settings.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const settings = deploySettingsUrl(req);

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
      installationId: identity.installationId,
    });
    return res;
  } catch {
    settings.searchParams.set("github_error", "exchange_failed");
    return NextResponse.redirect(settings);
  }
}

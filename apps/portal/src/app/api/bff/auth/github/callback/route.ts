import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

import { API_PATHS } from "@portal/lib/api-paths";
import { deploymentClient } from "@portal/server/bff/backend";
import { portalFailures } from "@portal/server/bff/failures";
import { setGitHubSessionCookie } from "@portal/server/cookies/github";

const OAUTH_STATE_COOKIE = "aomi_github_oauth_state";
// Sign-in runs against the one-shot App so the resulting user token can
// enumerate the user's one-shot installations (skip-install detection). The
// backend exchange uses the matching client secret. 2 = one-shot App.
const LOGIN_APP_INDEX = 2;
const ROUTE_FAMILY = "/api/bff/auth/github/callback";

function deploymentsUrl(req: Request): URL {
  const url = new URL(req.url);
  const deployments = new URL("/deployments", url.origin);
  deployments.searchParams.set("launch", "github");
  return deployments;
}

// GET /api/bff/auth/github/callback?code=...&state=... — finish "Sign in with
// GitHub": verify CSRF state, exchange the code for the GitHub identity
// (backend-side), mint the portal GitHub session cookie, return to /deployments.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const deployments = deploymentsUrl(req);

  const jar = await cookies();
  const expectedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    deployments.searchParams.set("github_error", "invalid_oauth_state");
    return NextResponse.redirect(deployments);
  }

  try {
    const client = await deploymentClient();
    const identity = await client.exchangeGitHubCode({
      code,
      app: LOGIN_APP_INDEX,
      redirectUri: `${url.origin}${API_PATHS.bff.auth.github.callback}`,
    });
    if (!identity.githubUserId) {
      deployments.searchParams.set("github_error", "identity_unresolved");
      return NextResponse.redirect(deployments);
    }
    const res = NextResponse.redirect(deployments);
    res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    await setGitHubSessionCookie(res, {
      githubUserId: identity.githubUserId,
      githubLogin: identity.githubLogin,
      installationId: identity.installationId,
    });
    return res;
  } catch (error) {
    const failure = portalFailures.handle({
      source: "launch",
      error,
      context: {
        routeFamily: ROUTE_FAMILY,
        operation: "github.oauth_exchange",
        method: req.method,
      },
    });
    if (failure.reason === "service_credential_rejected") {
      deployments.searchParams.set("github_error", "service_auth_forbidden");
      return NextResponse.redirect(deployments);
    }

    deployments.searchParams.set("github_error", "exchange_failed");
    return NextResponse.redirect(deployments);
  }
}

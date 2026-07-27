import { BackendError } from "@aomi-labs/deploy";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { configuredBackendUrl } from "@build/server/backend-url";
import {
  readGitHubOAuthRequest,
  setGitHubSessionCookie,
} from "@build/server/cookies/github";
import {
  GITHUB_OAUTH_REQUEST_COOKIE,
  clearGitHubOAuthRequest,
  exchangeGitHubSession,
  finishCliAuthorization,
} from "@build/server/github-auth";

export const runtime = "nodejs";

function deploymentsUrl(req: Request): URL {
  const url = new URL("/operate/deployments", req.url);
  url.searchParams.set("launch", "github");
  return url;
}

function browserError(req: Request, error: string): NextResponse {
  const redirect = deploymentsUrl(req);
  redirect.searchParams.set("github_error", error);
  return NextResponse.redirect(redirect);
}

function cliError(
  redirectUri: string,
  state: string,
  error: string,
): NextResponse {
  const redirect = new URL(redirectUri);
  redirect.searchParams.set("error", error);
  redirect.searchParams.set("state", state);
  return NextResponse.redirect(redirect);
}

// The only GitHub OAuth callback. Browser login ends in Build; CLI login resumes
// the signed loopback continuation after minting the same browser session.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const oauthRequest = await readGitHubOAuthRequest(
    jar.get(GITHUB_OAUTH_REQUEST_COOKIE)?.value,
  );
  const pendingContinuation = oauthRequest?.continuation;

  if (!code || !state || !oauthRequest || state !== oauthRequest.oauthState) {
    return pendingContinuation?.kind === "cli"
      ? cliError(
          pendingContinuation.redirectUri,
          pendingContinuation.state,
          "invalid_oauth_state",
        )
      : browserError(req, "invalid_oauth_state");
  }
  const continuation = oauthRequest.continuation;

  try {
    const session = await exchangeGitHubSession(code, url.origin);
    const response =
      continuation.kind === "cli"
        ? await finishCliAuthorization(session, continuation)
        : NextResponse.redirect(deploymentsUrl(req));
    clearGitHubOAuthRequest(response);
    await setGitHubSessionCookie(response, session);
    return response;
  } catch (error) {
    if (error instanceof BackendError && error.status === 403) {
      console.error(
        "GitHub sign-in exchange forbidden by backend service auth",
        {
          backendUrl: configuredBackendUrl(),
          status: error.status,
          body: error.body,
        },
      );
      return continuation.kind === "cli"
        ? cliError(
            continuation.redirectUri,
            continuation.state,
            "service_auth_forbidden",
          )
        : browserError(req, "service_auth_forbidden");
    }

    console.error("GitHub sign-in exchange failed", error);
    return continuation.kind === "cli"
      ? cliError(
          continuation.redirectUri,
          continuation.state,
          "exchange_failed",
        )
      : browserError(req, "exchange_failed");
  }
}

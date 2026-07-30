import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  type GitHubOAuthContinuation,
  readGitHubOAuthRequest,
  setGitHubSessionCookie,
} from "@build/server/cookies/github";
import {
  GITHUB_OAUTH_REQUEST_COOKIE,
  clearGitHubOAuthRequest,
  exchangeGitHubSession,
  finishCliAuthorization,
} from "@build/server/github-auth";
import { buildFailures } from "@build/server/bff/failures";

export const runtime = "nodejs";

function deploymentsUrl(req: Request): URL {
  const url = new URL("/operate/deployments", req.url);
  url.searchParams.set("launch", "github");
  return url;
}

function oauthError(
  req: Request,
  continuation: GitHubOAuthContinuation | undefined,
  error: string,
): NextResponse {
  const cli = continuation?.kind === "cli";
  const redirect = cli
    ? new URL(continuation.redirectUri)
    : deploymentsUrl(req);
  redirect.searchParams.set(cli ? "error" : "github_error", error);
  if (cli) redirect.searchParams.set("state", continuation.state);
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
    return oauthError(req, pendingContinuation, "invalid_oauth_state");
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
    const failure = buildFailures.handle({
      source: "launch",
      error,
      context: {
        routeFamily: "/api/bff/auth/github/callback",
        operation: "github.oauth_exchange",
        method: req.method,
      },
    });
    return oauthError(
      req,
      continuation,
      failure.reason === "service_credential_rejected"
        ? "service_auth_forbidden"
        : "exchange_failed",
    );
  }
}

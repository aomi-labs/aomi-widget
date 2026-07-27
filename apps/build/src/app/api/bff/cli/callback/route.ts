import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_PATHS } from "@build/lib/api-paths";
import { deploymentClient } from "@build/server/bff/backend";
import {
  issueGitHubCliExchange,
  readGitHubCliLoginRequest,
  setGitHubSessionCookie,
} from "@build/server/cookies/github";
import { GITHUB_LOGIN_APP_INDEX } from "@build/server/github-oauth-config";
import {
  CLI_LOGIN_REQUEST_COOKIE,
  CLI_OAUTH_STATE_COOKIE,
} from "../login/route";

export const runtime = "nodejs";

function errorRedirect(
  redirectUri: string | undefined,
  state: string | undefined,
  error: string,
): NextResponse {
  if (!redirectUri) {
    return NextResponse.json({ error }, { status: 400 });
  }
  const redirect = new URL(redirectUri);
  redirect.searchParams.set("error", error);
  if (state) redirect.searchParams.set("state", state);
  return NextResponse.redirect(redirect);
}

// GET /api/bff/cli/callback — GitHub OAuth callback for the local CLI login.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const oauthState = url.searchParams.get("state");
  const jar = await cookies();
  const expectedOauthState = jar.get(CLI_OAUTH_STATE_COOKIE)?.value;
  const loginRequest = await readGitHubCliLoginRequest(
    jar.get(CLI_LOGIN_REQUEST_COOKIE)?.value,
  );

  if (
    !code ||
    !oauthState ||
    !expectedOauthState ||
    oauthState !== expectedOauthState ||
    !loginRequest
  ) {
    return errorRedirect(
      loginRequest?.redirectUri,
      loginRequest?.state,
      "invalid_oauth_state",
    );
  }

  try {
    const identity = await (await deploymentClient()).exchangeGitHubCode({
      code,
      app: GITHUB_LOGIN_APP_INDEX,
      redirectUri: `${url.origin}${API_PATHS.bff.cli.callback}`,
    });
    if (!identity.githubUserId) {
      return errorRedirect(
        loginRequest.redirectUri,
        loginRequest.state,
        "identity_unresolved",
      );
    }

    const session = {
      githubUserId: identity.githubUserId,
      githubLogin: identity.githubLogin,
      installationId: identity.installationId,
    };
    const exchangeCode = await issueGitHubCliExchange({
      session,
      codeChallenge: loginRequest.codeChallenge,
    });
    const redirect = new URL(loginRequest.redirectUri);
    redirect.searchParams.set("code", exchangeCode);
    redirect.searchParams.set("state", loginRequest.state);

    const response = NextResponse.redirect(redirect);
    response.cookies.set(CLI_OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    response.cookies.set(CLI_LOGIN_REQUEST_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
    await setGitHubSessionCookie(response, session);
    return response;
  } catch (error) {
    console.error("CLI GitHub sign-in exchange failed", error);
    return errorRedirect(
      loginRequest.redirectUri,
      loginRequest.state,
      "exchange_failed",
    );
  }
}

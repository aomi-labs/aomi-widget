import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import {
  issueGitHubCliLoginRequest,
} from "@build/server/cookies/github";
import { githubOAuthClientId } from "@build/server/github-oauth-config";

export const runtime = "nodejs";

export const CLI_OAUTH_STATE_COOKIE = "aomi_cli_github_oauth_state";
export const CLI_LOGIN_REQUEST_COOKIE = "aomi_cli_login_request";

function validLoopbackRedirect(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(
      url.hostname,
    );
    if (
      url.protocol !== "http:" ||
      !loopback ||
      !url.port ||
      url.username ||
      url.password ||
      url.pathname !== "/callback"
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function validOpaque(value: string | null, min: number, max: number): boolean {
  return Boolean(
    value &&
      value.length >= min &&
      value.length <= max &&
      /^[A-Za-z0-9_-]+$/.test(value),
  );
}

// GET /api/bff/cli/login?redirect_uri=http://127.0.0.1:PORT/callback
//   &state=...&code_challenge=...
// Starts a GitHub login for a local CLI. The signed request cookie binds the
// callback to an exact loopback listener and PKCE challenge.
export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const redirectUri = validLoopbackRedirect(
    requestUrl.searchParams.get("redirect_uri"),
  );
  const state = requestUrl.searchParams.get("state");
  const codeChallenge = requestUrl.searchParams.get("code_challenge");
  if (
    !redirectUri ||
    !validOpaque(state, 32, 128) ||
    !validOpaque(codeChallenge, 43, 128)
  ) {
    return NextResponse.json(
      { error: "invalid CLI login request" },
      { status: 400 },
    );
  }

  const oauthState = randomBytes(32).toString("hex");
  const callback = new URL("/api/bff/cli/callback", requestUrl.origin);
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", githubOAuthClientId(req));
  authorize.searchParams.set("redirect_uri", callback.toString());
  authorize.searchParams.set("state", oauthState);

  const signedRequest = await issueGitHubCliLoginRequest({
    redirectUri: redirectUri.toString(),
    state: state!,
    codeChallenge: codeChallenge!,
  });
  const response = NextResponse.redirect(authorize);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  response.cookies.set(CLI_OAUTH_STATE_COOKIE, oauthState, cookieOptions);
  response.cookies.set(CLI_LOGIN_REQUEST_COOKIE, signedRequest, cookieOptions);
  return response;
}

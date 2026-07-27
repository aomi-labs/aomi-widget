import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

/**
 * Aomi Build's standalone GitHub session. After "Sign in with GitHub", the app
 * exchanges the OAuth
 * code for the user's GitHub identity (backend-side, secret never in the
 * browser), then mints this cookie. It carries the GitHub user id (`sub`) the
 * onboarding dashboard scopes every "my sources" read to.
 *
 * HS256 JWT signed with `PORTAL_ONLY_SESSION_SECRET` for launch compatibility.
 * Aomi Build both signs and verifies; the backend never sees
 * this cookie. httpOnly so the browser can't read it; the client learns "am I
 * signed in" only through `/api/bff/auth/github/status`.
 */
export const GITHUB_SESSION_COOKIE = "aomi_github";
const TTL_SECONDS = 7 * 24 * 60 * 60;
const CLI_SESSION_AUDIENCE = "aomi-build-cli";
const CLI_EXCHANGE_AUDIENCE = "aomi-build-cli-exchange";
const CLI_LOGIN_REQUEST_AUDIENCE = "aomi-build-cli-login-request";
const CLI_EXCHANGE_TTL_SECONDS = 2 * 60;
const CLI_LOGIN_REQUEST_TTL_SECONDS = 10 * 60;

export interface GitHubSession {
  githubUserId: string;
  githubLogin: string;
  /**
   * Most-recent one-shot App installation visible to this user at sign-in, if
   * any. Lets the onboarding wizard skip the install step when the App is
   * already installed. `null` when not installed.
   */
  installationId?: string | null;
}

export interface GitHubCliLoginRequest {
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

export interface GitHubCliExchange {
  session: GitHubSession;
  codeChallenge: string;
}

function secret(): Uint8Array {
  const value = process.env.PORTAL_ONLY_SESSION_SECRET?.trim();
  if (!value || value.length < 16) {
    throw new Error(
      "PORTAL_ONLY_SESSION_SECRET is not set (or too short) — the GitHub session cookie needs a signing secret",
    );
  }
  return new TextEncoder().encode(value);
}

export async function issueGitHubSession(session: GitHubSession): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    login: session.githubLogin,
    installationId: session.installationId ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.githubUserId)
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(secret());
}

function githubSessionClaims(session: GitHubSession) {
  return {
    login: session.githubLogin,
    installationId: session.installationId ?? null,
  };
}

function sessionFromPayload(payload: {
  sub?: string;
  login?: unknown;
  installationId?: unknown;
}): GitHubSession | null {
  const githubUserId = typeof payload.sub === "string" ? payload.sub : "";
  if (!githubUserId) return null;
  return {
    githubUserId,
    githubLogin: typeof payload.login === "string" ? payload.login : "",
    installationId:
      typeof payload.installationId === "string"
        ? payload.installationId
        : null,
  };
}

export async function readGitHubSession(
  token: string | undefined,
): Promise<GitHubSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return sessionFromPayload(payload);
  } catch {
    return null;
  }
}

/** Long-lived bearer used by the CLI after the browser login completes. */
export async function issueGitHubCliSession(
  session: GitHubSession,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    ...githubSessionClaims(session),
    kind: "cli_session",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.githubUserId)
    .setAudience(CLI_SESSION_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(secret());
}

export async function readGitHubCliSession(
  token: string | undefined,
): Promise<GitHubSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      audience: CLI_SESSION_AUDIENCE,
    });
    if (payload.kind !== "cli_session") return null;
    return sessionFromPayload(payload);
  } catch {
    return null;
  }
}

/** Signed browser handoff state. It binds the loopback redirect and PKCE challenge. */
export async function issueGitHubCliLoginRequest(
  request: GitHubCliLoginRequest,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    redirectUri: request.redirectUri,
    state: request.state,
    codeChallenge: request.codeChallenge,
    kind: "cli_login_request",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(CLI_LOGIN_REQUEST_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + CLI_LOGIN_REQUEST_TTL_SECONDS)
    .sign(secret());
}

export async function readGitHubCliLoginRequest(
  token: string | undefined,
): Promise<GitHubCliLoginRequest | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      audience: CLI_LOGIN_REQUEST_AUDIENCE,
    });
    if (
      payload.kind !== "cli_login_request" ||
      typeof payload.redirectUri !== "string" ||
      typeof payload.state !== "string" ||
      typeof payload.codeChallenge !== "string"
    ) {
      return null;
    }
    return {
      redirectUri: payload.redirectUri,
      state: payload.state,
      codeChallenge: payload.codeChallenge,
    };
  } catch {
    return null;
  }
}

/** Short-lived code placed on the loopback redirect; PKCE protects its exchange. */
export async function issueGitHubCliExchange(
  exchange: GitHubCliExchange,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    ...githubSessionClaims(exchange.session),
    codeChallenge: exchange.codeChallenge,
    kind: "cli_exchange",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(exchange.session.githubUserId)
    .setAudience(CLI_EXCHANGE_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + CLI_EXCHANGE_TTL_SECONDS)
    .sign(secret());
}

export async function readGitHubCliExchange(
  token: string | undefined,
): Promise<GitHubCliExchange | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      audience: CLI_EXCHANGE_AUDIENCE,
    });
    if (
      payload.kind !== "cli_exchange" ||
      typeof payload.codeChallenge !== "string"
    ) {
      return null;
    }
    const session = sessionFromPayload(payload);
    return session
      ? { session, codeChallenge: payload.codeChallenge }
      : null;
  } catch {
    return null;
  }
}

/** The GitHub session bound to the current request's cookie jar, or null. */
export async function getGitHubSession(): Promise<GitHubSession | null> {
  const jar = await cookies();
  return readGitHubSession(jar.get(GITHUB_SESSION_COOKIE)?.value);
}

/** CLI bearer when present, otherwise the browser's GitHub session cookie. */
export async function getGitHubSessionFromRequest(
  request: Request,
): Promise<GitHubSession | null> {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const token = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
    return readGitHubCliSession(token);
  }
  return getGitHubSession();
}

export async function setGitHubSessionCookie(
  response: NextResponse,
  session: GitHubSession,
): Promise<void> {
  const token = await issueGitHubSession(session);
  response.cookies.set(GITHUB_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export function clearGitHubSessionCookie(response: NextResponse): void {
  response.cookies.set(GITHUB_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

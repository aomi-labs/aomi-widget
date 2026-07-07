import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";

/**
 * The portal's **standalone GitHub session**. After "Sign in with GitHub", the
 * portal exchanges the OAuth code for the user's GitHub identity (backend-side,
 * secret never in the browser), then mints this cookie. It carries the GitHub
 * user id (`sub`) the onboarding dashboard scopes every "my sources" read to.
 *
 * HS256 JWT signed with `PORTAL_ONLY_SESSION_SECRET` — the same portal-only
 * symmetric secret. The portal both signs and verifies; the backend never sees
 * this cookie. httpOnly so the browser can't read it; the client learns "am I
 * signed in" only through `/api/bff/auth/github/status`.
 */
export const GITHUB_SESSION_COOKIE = "aomi_github";
const TTL_SECONDS = 7 * 24 * 60 * 60;

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

export async function readGitHubSession(
  token: string | undefined,
): Promise<GitHubSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
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
  } catch {
    return null;
  }
}

/** The GitHub session bound to the current request's cookie jar, or null. */
export async function getGitHubSession(): Promise<GitHubSession | null> {
  const jar = await cookies();
  return readGitHubSession(jar.get(GITHUB_SESSION_COOKIE)?.value);
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

import type { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { resolveOrCreateCanonicalUser } from "./account-graph";

export const SESSION_COOKIE = "aomi_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function secret(): Uint8Array {
  const value = (
    process.env.AOMI_SESSION_SECRET ?? process.env.PORTAL_ONLY_SESSION_SECRET
  )?.trim();
  if (!value || value.length < 16) {
    throw new Error(
      "AOMI_SESSION_SECRET is not set (or too short) - the BFF session cookie needs a signing secret",
    );
  }
  return new TextEncoder().encode(value);
}

export async function issueSessionCookie(
  canonicalUserId: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(canonicalUserId)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(secret());
}

export async function readSessionCookie(
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  response: NextResponse,
  canonicalUserId: string,
): Promise<void> {
  const token = await issueSessionCookie(canonicalUserId);
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/**
 * Resolve the canonical backend user id from the incoming BetterAuth-session-first flow.
 * Browsers present the BetterAuth cookie; headless clients present the bearer()
 * token in Authorization. The proxy then mints the short-lived AccountBearer
 * for the Rust backend from this canonical id.
 */
export async function getSessionedCanonicalId(
  request: NextRequest,
): Promise<string | null> {
  const { auth } = await import("@aomi-labs/auth/better-auth");
  const { getOrCreateAomiUserForBetterAuthSession } = await import(
    "@aomi-labs/auth/account"
  );
  const session = await auth.api.getSession({ headers: request.headers });
  const sessionUser = session?.user;
  const betterAuthUserId =
    typeof sessionUser?.id === "string" ? sessionUser.id : null;
  if (sessionUser && betterAuthUserId) {
    const aomiUser = await getOrCreateAomiUserForBetterAuthSession({
      betterAuthUserId,
      email: sessionUser.email,
      emailVerified: sessionUser.emailVerified ?? undefined,
      name: sessionUser.name,
      avatarUrl: sessionUser.image,
    });
    const user = await resolveOrCreateCanonicalUser({
      provider: "better_auth",
      subject: betterAuthUserId,
      canonicalUserId: aomiUser.id,
    });
    return user.userId;
  }

  const authorization = request.headers.get("authorization");
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    const fromHeader = await readSessionCookie(match?.[1]?.trim());
    if (fromHeader) return fromHeader;
  }
  return readSessionCookie(request.cookies.get(SESSION_COOKIE)?.value);
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

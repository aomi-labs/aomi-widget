import type { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { auth } from "@aomi-labs/auth/better-auth";
import { getOrCreateAomiUserForBetterAuthSession } from "@aomi-labs/auth/account";
import { resolveOrCreateCanonicalUser } from "./account-graph";

/**
 * The BFF's **own** session — a stripped-down, Better-Auth-style session cookie
 * that carries our canonical user id. This is the identity root: it is
 * established by *us* and is independent of any provider. Privy/Para sign-in is
 * a separate, downstream act that *links a credential* and resolves which
 * canonical user this session belongs to; once the cookie is set, the session
 * stands on its own — "we own our whole cookie creation, not dependent on
 * Privy" (service-identity.md, "Identity root").
 *
 * The cookie is an HS256 JWT (`sub` = canonical user id) signed with a
 * **symmetric** HMAC secret. The issuing app both signs and verifies it, so for
 * this cookie verify == forge: the secret must live ONLY on the BFF and is never
 * shared with the backend (which never sees this cookie — the proxy strips it).
 * httpOnly so the browser never reads it. The AccountBearer for the backend is
 * *derived from this session* (see `mintAccountBearer`), not carried by the
 * browser — the proxy injects it server-side from this cookie (Option 2).
 *
 * Shared across every Aomi BFF (portal, base, landing): the cookie name + claim
 * are the seam, so a session minted by one app is the same shape everywhere.
 */
export const SESSION_COOKIE = "aomi_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function secret(): Uint8Array {
  // `AOMI_SESSION_SECRET` is the shared name; `PORTAL_ONLY_SESSION_SECRET` is
  // accepted as a fallback so portal's existing deploy keeps working unchanged.
  const value = (
    process.env.AOMI_SESSION_SECRET ?? process.env.PORTAL_ONLY_SESSION_SECRET
  )?.trim();
  if (!value || value.length < 16) {
    throw new Error(
      "AOMI_SESSION_SECRET is not set (or too short) — the BFF session cookie needs a signing secret",
    );
  }
  return new TextEncoder().encode(value);
}

/** Sign a session cookie binding the browser to a canonical user id. */
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

/** Verify a session cookie and return its canonical user id, or null. */
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

/** Set the session cookie on a response (called after login resolves the user). */
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
 * Read the canonical user id bound to the request's session, or null. The
 * session is taken from `Authorization: Bearer <aomi_session>` **first** — the
 * header a headless client (the `aomi` CLI) presents, matching arixon's
 * `bearer()` plugin — then the `aomi_session` cookie (browsers). Either carrier
 * is the HS256 session JWT; a forged or non-session bearer (e.g. an EdDSA backend
 * bearer) simply fails `readSessionCookie` and is ignored.
 */
export async function getSessionedCanonicalId(
  request: NextRequest,
): Promise<string | null> {
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

/** Clear the session cookie (sign-out). */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

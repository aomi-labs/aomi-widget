// =============================================================================
// GitHub session codec — the BFF-side "who is signed in with GitHub" seam.
//
// After "Sign in with GitHub", the BFF exchanges the OAuth code for the user's
// GitHub identity (backend-side; the client secret never reaches the browser)
// and mints this cookie: an HS256 JWT signed with a host-held symmetric
// secret. The BFF both signs and verifies; the Aomi backend never sees it.
// httpOnly, so the browser learns "am I signed in" only via the status route.
//
// Hosts that already have their own GitHub session can skip this codec and
// hand `createLaunchRoutes` any `(req) => GitHubSession | null` function.
// =============================================================================

import { jwtVerify, SignJWT } from "jose";
import {
  appendSetCookie,
  defaultSecure,
  readCookie,
  serializeCookie,
} from "./cookies";

export const GITHUB_SESSION_COOKIE = "aomi_github";
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface GitHubSession {
  githubUserId: string;
  githubLogin: string;
  /**
   * Most-recent one-shot App installation visible to this user at sign-in, if
   * any. Lets the wizard skip the install step when the App is already
   * installed. `null` when not installed.
   */
  installationId?: string | null;
}

export type GitHubSessionCodecOptions = {
  /** Symmetric signing secret (>= 16 chars). Host-held; never sent anywhere. */
  secret: string;
  /** Cookie name. Default `aomi_github`. */
  cookieName?: string;
  /** Session lifetime in seconds. Default 7 days. */
  ttlSeconds?: number;
  /** `Secure` cookie flag. Default: true when NODE_ENV === "production". */
  secure?: boolean;
};

export type GitHubSessionCodec = {
  cookieName: string;
  /** Sign a session into a JWT. */
  issue(session: GitHubSession): Promise<string>;
  /** Verify a JWT back into a session (null on any failure). */
  read(token: string | undefined): Promise<GitHubSession | null>;
  /** The session carried by a request's cookie header, or null. */
  fromRequest(req: Request): Promise<GitHubSession | null>;
  /** Append the session cookie to a Response. */
  attach(res: Response, session: GitHubSession): Promise<Response>;
  /** Append an expired session cookie to a Response. */
  clear(res: Response): Response;
};

export function createGitHubSessionCodec(
  options: GitHubSessionCodecOptions,
): GitHubSessionCodec {
  const secretValue = options.secret?.trim();
  if (!secretValue || secretValue.length < 16) {
    throw new Error(
      "GitHub session codec needs a signing secret of at least 16 characters",
    );
  }
  const secret = new TextEncoder().encode(secretValue);
  const cookieName = options.cookieName ?? GITHUB_SESSION_COOKIE;
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const secure = options.secure ?? defaultSecure();

  async function issue(session: GitHubSession): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({
      login: session.githubLogin,
      installationId: session.installationId ?? null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(session.githubUserId)
      .setIssuedAt(now)
      .setExpirationTime(now + ttlSeconds)
      .sign(secret);
  }

  async function read(
    token: string | undefined,
  ): Promise<GitHubSession | null> {
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, secret);
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

  return {
    cookieName,
    issue,
    read,
    fromRequest(req: Request) {
      return read(readCookie(req, cookieName));
    },
    async attach(res: Response, session: GitHubSession) {
      const token = await issue(session);
      return appendSetCookie(
        res,
        serializeCookie(cookieName, token, {
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/",
          maxAge: ttlSeconds,
        }),
      );
    },
    clear(res: Response) {
      return appendSetCookie(
        res,
        serializeCookie(cookieName, "", {
          httpOnly: true,
          secure,
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        }),
      );
    },
  };
}

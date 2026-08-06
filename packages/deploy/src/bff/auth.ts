// =============================================================================
// GitHub session + "Sign in with GitHub" auth routes for the launch dashboard.
//
// After OAuth, the BFF exchanges the code for the user's GitHub identity
// (backend-side; the client secret never reaches the browser) and mints an
// HS256 JWT cookie signed with a host-held symmetric secret. The BFF both
// signs and verifies; the Aomi backend never sees it. httpOnly, so the browser
// learns "am I signed in" only via the status route.
//
// Hosts that already have their own GitHub session can skip this codec and
// hand `createLaunchRoutes` any `(req) => GitHubSession | null` function.
//
// Auth routes:
//   login    GET  — redirect to GitHub's user-authorization page (CSRF state)
//   callback GET  — verify state, exchange code backend-side, mint the session
//   status   GET  — { signedIn, githubLogin, installationId } for UI gating
//   signout  POST — drop the session cookie
//
// The OAuth **client id** is public; the matching client secret lives in the
// Aomi backend's GitHub App config (`exchangeGitHubCode` runs there). The
// defaults are Aomi's one-shot App ids; hosts running their own GitHub App
// override `oauth.clientId`.
// =============================================================================

import { jwtVerify, SignJWT } from "jose";
import type { BackendClient } from "../backend";
import { assertServerOnly } from "../backend";
import {
  appendSetCookie,
  defaultSecure,
  jsonResponse,
  randomHex,
  readCookie,
  serializeCookie,
} from "./http";

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

const OAUTH_STATE_COOKIE = "aomi_github_oauth_state";

// Aomi's one-shot App OAuth client ids (app index 2). Sign-in runs against the
// one-shot App so the user token can list one-shot installations for the
// skip-install check; the callback exchanges against the same app index.
const AOMI_STAGING_CLIENT_ID = "Iv23lilgvJz13pJekLSZ";
const AOMI_PRODUCTION_CLIENT_ID = "Iv23li4wPpAfoGOJ6v0Q";
const DEFAULT_LOGIN_APP_INDEX = 2;

function defaultClientId(req: Request): string {
  const host = new URL(req.url).hostname;
  if (process.env.VERCEL_ENV === "production" || host === "portal.aomi.dev") {
    return AOMI_PRODUCTION_CLIENT_ID;
  }
  return AOMI_STAGING_CLIENT_ID;
}

export type GitHubAuthRoutes = {
  login: (req: Request) => Promise<Response>;
  callback: (req: Request) => Promise<Response>;
  status: (req: Request) => Promise<Response>;
  signout: (req: Request) => Promise<Response>;
};

export type GitHubAuthRoutesOptions = {
  /** Deployment client per request — `callback` exchanges the code with it. */
  client: () => BackendClient | Promise<BackendClient>;
  /** Session codec that signs/reads the GitHub session cookie. */
  session: GitHubSessionCodec;
  /** Path the callback route is mounted at, e.g. "/api/bff/auth/github/callback". */
  callbackPath: string;
  /** Where the callback returns the browser to (path or absolute). Default "/". */
  returnTo?: string;
  oauth?: {
    /** GitHub App OAuth client id (public). Default: Aomi's one-shot App. */
    clientId?: string | ((req: Request) => string);
    /** Which configured backend GitHub App exchanges the code. Default 2. */
    loginAppIndex?: number;
  };
  /** `Secure` flag for the state cookie. Default: NODE_ENV === "production". */
  secure?: boolean;
};

export function createGitHubAuthRoutes(
  options: GitHubAuthRoutesOptions,
): GitHubAuthRoutes {
  assertServerOnly();

  const secure = options.secure ?? defaultSecure();
  const loginAppIndex =
    options.oauth?.loginAppIndex ?? DEFAULT_LOGIN_APP_INDEX;

  function clientId(req: Request): string {
    const configured = options.oauth?.clientId;
    if (typeof configured === "function") return configured(req);
    return configured ?? defaultClientId(req);
  }

  function returnToUrl(req: Request): URL {
    const origin = new URL(req.url).origin;
    const target = new URL(options.returnTo ?? "/", origin);
    target.searchParams.set("launch", "github");
    return target;
  }

  function redirect(location: URL | string): Response {
    // 307 matches NextResponse.redirect's default; for these GET-only hops it
    // is equivalent to 302 and keeps host behavior stable across frameworks.
    return new Response(null, {
      status: 307,
      headers: { Location: String(location) },
    });
  }

  const login = async (req: Request): Promise<Response> => {
    const origin = new URL(req.url).origin;
    const state = await randomHex(16);

    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId(req));
    authorize.searchParams.set(
      "redirect_uri",
      `${origin}${options.callbackPath}`,
    );
    authorize.searchParams.set("state", state);

    return appendSetCookie(
      redirect(authorize),
      serializeCookie(OAUTH_STATE_COOKIE, state, {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      }),
    );
  };

  const callback = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const target = returnToUrl(req);

    const expectedState = readCookie(req, OAUTH_STATE_COOKIE);
    if (!code || !state || !expectedState || state !== expectedState) {
      target.searchParams.set("github_error", "invalid_oauth_state");
      return redirect(target);
    }

    try {
      const client = await options.client();
      const identity = await client.exchangeGitHubCode({
        code,
        app: loginAppIndex,
      });
      if (!identity.githubUserId) {
        target.searchParams.set("github_error", "identity_unresolved");
        return redirect(target);
      }
      const res = appendSetCookie(
        redirect(target),
        serializeCookie(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 }),
      );
      return options.session.attach(res, {
        githubUserId: identity.githubUserId,
        githubLogin: identity.githubLogin,
        installationId: identity.installationId,
      });
    } catch {
      target.searchParams.set("github_error", "exchange_failed");
      return redirect(target);
    }
  };

  // What the client needs to gate the UI: whether a GitHub session exists and
  // its login. The github_user_id stays server-side.
  const status = async (req: Request): Promise<Response> => {
    const session = await options.session.fromRequest(req);
    return jsonResponse(
      {
        signedIn: Boolean(session),
        githubLogin: session?.githubLogin ?? null,
        // Present when the one-shot App is already installed → the wizard
        // skips the install step.
        installationId: session?.installationId ?? null,
      },
      200,
    );
  };

  const signout = async (_req: Request): Promise<Response> => {
    return options.session.clear(jsonResponse({ ok: true }, 200));
  };

  return { login, callback, status, signout };
}

// @vitest-environment node
// New coverage for the extracted seams: the GitHub session codec and the
// "Sign in with GitHub" auth route factory.
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeploymentClient } from "../src/client";
import { createGitHubSessionCodec } from "../src/bff/github-session";
import { createGitHubAuthRoutes } from "../src/bff/github-auth-routes";
import { readCookie } from "../src/bff/cookies";

const SECRET = "test-secret-at-least-16-chars";

function codec() {
  return createGitHubSessionCodec({ secret: SECRET, secure: false });
}

function authRoutes() {
  return createGitHubAuthRoutes({
    client: () =>
      new DeploymentClient({
        aomi: {
          backendUrl: "http://127.0.0.1:8080",
          activationToken: "service-token",
        },
      }),
    session: codec(),
    callbackPath: "/api/bff/auth/github/callback",
    returnTo: "/deploy",
  });
}

function cookieValue(res: Response, name: string): string | undefined {
  const header = res.headers.get("set-cookie") ?? "";
  // Multiple Set-Cookie headers arrive comma-joined in undici's view.
  for (const part of header.split(/,(?=[^;]+=)/)) {
    const [pair] = part.trim().split(";");
    const eq = pair.indexOf("=");
    if (eq !== -1 && pair.slice(0, eq) === name) {
      return decodeURIComponent(pair.slice(eq + 1));
    }
  }
  return undefined;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createGitHubSessionCodec", () => {
  it("round-trips a session through issue/read", async () => {
    const c = codec();
    const token = await c.issue({
      githubUserId: "42",
      githubLogin: "alice",
      installationId: "555",
    });
    const session = await c.read(token);
    expect(session).toEqual({
      githubUserId: "42",
      githubLogin: "alice",
      installationId: "555",
    });
  });

  it("rejects a token signed with a different secret", async () => {
    const other = createGitHubSessionCodec({
      secret: "another-secret-16-chars-long",
      secure: false,
    });
    const token = await other.issue({ githubUserId: "42", githubLogin: "a" });
    expect(await codec().read(token)).toBeNull();
  });

  it("reads the session from a request cookie header", async () => {
    const c = codec();
    const token = await c.issue({ githubUserId: "42", githubLogin: "alice" });
    const req = new Request("http://localhost:3000/api/bff/launch/sources", {
      headers: { cookie: `other=1; aomi_github=${encodeURIComponent(token)}` },
    });
    const session = await c.fromRequest(req);
    expect(session?.githubUserId).toBe("42");
  });

  it("attach/clear write the session cookie onto a Response", async () => {
    const c = codec();
    const attached = await c.attach(Response.json({ ok: true }), {
      githubUserId: "42",
      githubLogin: "alice",
    });
    const token = cookieValue(attached, "aomi_github");
    expect(token).toBeTruthy();
    expect((await c.read(token))?.githubLogin).toBe("alice");
    expect(attached.headers.get("set-cookie")).toContain("HttpOnly");

    const cleared = c.clear(Response.json({ ok: true }));
    expect(cleared.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("requires a >= 16 char secret", () => {
    expect(() => createGitHubSessionCodec({ secret: "short" })).toThrow(
      /signing secret/,
    );
  });
});

describe("createGitHubAuthRoutes", () => {
  it("login redirects to GitHub with a CSRF state cookie", async () => {
    const res = await authRoutes().login(
      new Request("http://localhost:3000/api/bff/auth/github/login"),
    );
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.origin).toBe("https://github.com");
    expect(location.pathname).toBe("/login/oauth/authorize");
    expect(location.searchParams.get("redirect_uri")).toBe(
      "http://localhost:3000/api/bff/auth/github/callback",
    );
    const state = cookieValue(res, "aomi_github_oauth_state");
    expect(state).toBe(location.searchParams.get("state"));
  });

  it("callback rejects a mismatched OAuth state", async () => {
    const res = await authRoutes().callback(
      new Request(
        "http://localhost:3000/api/bff/auth/github/callback?code=abc&state=evil",
        { headers: { cookie: "aomi_github_oauth_state=expected" } },
      ),
    );
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/deploy");
    expect(location.searchParams.get("github_error")).toBe(
      "invalid_oauth_state",
    );
  });

  it("callback exchanges the code backend-side and mints the session", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json({
        github_user_id: "42",
        github_login: "alice",
        installation_id: 555,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await authRoutes().callback(
      new Request(
        "http://localhost:3000/api/bff/auth/github/callback?code=abc&state=tok",
        { headers: { cookie: "aomi_github_oauth_state=tok" } },
      ),
    );
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location")!);
    expect(location.pathname).toBe("/deploy");
    expect(location.searchParams.get("launch")).toBe("github");
    expect(location.searchParams.get("github_error")).toBeNull();

    // The exchange ran against the backend with the one-shot app index.
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/integrations/github-app/oauth/exchange?code=abc&app=2",
    );

    const token = cookieValue(res, "aomi_github");
    const session = await codec().read(token);
    expect(session).toEqual({
      githubUserId: "42",
      githubLogin: "alice",
      installationId: "555",
    });
  });

  it("status reports the session without leaking github_user_id", async () => {
    const c = codec();
    const token = await c.issue({
      githubUserId: "42",
      githubLogin: "alice",
      installationId: null,
    });
    const routes = authRoutes();

    const signedIn = await routes.status(
      new Request("http://localhost:3000/api/bff/auth/github/status", {
        headers: { cookie: `aomi_github=${encodeURIComponent(token)}` },
      }),
    );
    expect(await signedIn.json()).toEqual({
      signedIn: true,
      githubLogin: "alice",
      installationId: null,
    });

    const anonymous = await routes.status(
      new Request("http://localhost:3000/api/bff/auth/github/status"),
    );
    expect(await anonymous.json()).toEqual({
      signedIn: false,
      githubLogin: null,
      installationId: null,
    });
  });

  it("signout clears the session cookie", async () => {
    const res = await authRoutes().signout(
      new Request("http://localhost:3000/api/bff/auth/github/signout", {
        method: "POST",
      }),
    );
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("set-cookie")).toContain("aomi_github=");
    expect(res.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});

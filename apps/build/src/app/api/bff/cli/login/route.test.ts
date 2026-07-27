// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { readGitHubCliLoginRequest } from "@build/server/cookies/github";
import { CLI_LOGIN_REQUEST_COOKIE, GET } from "./route";

describe("CLI browser login", () => {
  beforeEach(() => {
    vi.stubEnv(
      "PORTAL_ONLY_SESSION_SECRET",
      "test-only-session-secret-that-is-long-enough",
    );
  });

  it("rejects non-loopback callback URLs", async () => {
    const url = new URL("https://build-staging.aomi.dev/api/bff/cli/login");
    url.searchParams.set("redirect_uri", "https://attacker.example/callback");
    url.searchParams.set("state", "s".repeat(43));
    url.searchParams.set("code_challenge", "c".repeat(43));

    const response = await GET(new Request(url));
    expect(response.status).toBe(400);
  });

  it("binds the exact loopback callback, state, and PKCE challenge", async () => {
    const redirectUri = "http://127.0.0.1:43210/callback";
    const state = "s".repeat(43);
    const codeChallenge = "c".repeat(43);
    const url = new URL("https://build-staging.aomi.dev/api/bff/cli/login");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);

    const response = await GET(new Request(url));
    expect(response.status).toBe(307);
    const authorize = new URL(response.headers.get("location")!);
    expect(authorize.origin).toBe("https://github.com");
    expect(authorize.searchParams.get("redirect_uri")).toBe(
      "https://build-staging.aomi.dev/api/bff/cli/callback",
    );

    const cookie = response.cookies.get(CLI_LOGIN_REQUEST_COOKIE)?.value;
    await expect(readGitHubCliLoginRequest(cookie)).resolves.toEqual({
      redirectUri,
      state,
      codeChallenge,
    });
  });
});

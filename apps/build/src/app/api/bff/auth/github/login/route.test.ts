// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readGitHubOAuthRequest } from "@build/server/cookies/github";

import { GET } from "./route";

async function continuation(res: Response) {
  const cookie = res.headers
    .getSetCookie()
    .find((value) => value.startsWith("aomi_github_oauth_request="));
  const token = cookie?.split(";", 1)[0]?.split("=", 2)[1];
  return readGitHubOAuthRequest(token);
}

describe("GitHub login route", () => {
  beforeEach(() => {
    vi.stubEnv("PORTAL_ONLY_SESSION_SECRET", "test-only-github-session-secret");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the staging one-shot-app client id outside production", async () => {
    const res = await GET(
      new Request("http://localhost:3000/api/bff/auth/github/login"),
    );
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("https://github.com/login/oauth/authorize");
    expect(location).toContain("client_id=Iv23lilgvJz13pJekLSZ");
    expect(location).toContain(
      encodeURIComponent("http://localhost:3000/api/bff/auth/github/callback"),
    );
  });

  it("uses the production one-shot-app client id on the production host", async () => {
    const res = await GET(
      new Request("https://build.aomi.dev/api/bff/auth/github/login"),
    );
    expect(res.headers.get("location")).toContain(
      "client_id=Iv23li4wPpAfoGOJ6v0Q",
    );
  });

  it("keeps a same-origin return location in the signed continuation", async () => {
    const res = await GET(
      new Request(
        "http://localhost:3000/api/bff/auth/github/login?return_to=%2Foperate%2Fdeployments%2Fnew%3Fplatform%3Dworld-market-apps%26mode%3Dimport",
      ),
    );

    await expect(continuation(res)).resolves.toMatchObject({
      continuation: {
        kind: "browser",
        returnTo:
          "/operate/deployments/new?platform=world-market-apps&mode=import",
      },
    });
  });

  it("falls back to a same-origin referrer and ignores an external return location", async () => {
    const res = await GET(
      new Request(
        "http://localhost:3000/api/bff/auth/github/login?return_to=https%3A%2F%2Fevil.example%2Fsteal",
        {
          headers: {
            referer:
              "http://localhost:3000/projects?platform=world-market-apps",
          },
        },
      ),
    );

    await expect(continuation(res)).resolves.toMatchObject({
      continuation: {
        kind: "browser",
        returnTo: "/projects?platform=world-market-apps",
      },
    });
  });
});

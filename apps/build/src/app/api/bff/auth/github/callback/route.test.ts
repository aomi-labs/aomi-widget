// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "@aomi-labs/deploy";

import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  oauthState: undefined as string | undefined,
  exchangeGitHubCode: vi.fn(),
  setGitHubSessionCookie: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "aomi_github_oauth_request" && mocks.oauthState
        ? { value: mocks.oauthState }
        : undefined,
  })),
}));

vi.mock("@build/server/bff/backend", () => ({
  deploymentClient: vi.fn(async () => ({
    exchangeGitHubCode: mocks.exchangeGitHubCode,
  })),
}));

vi.mock("@build/server/cookies/github", () => ({
  readGitHubOAuthRequest: vi.fn(async () =>
    mocks.oauthState
      ? {
          oauthState: mocks.oauthState,
          continuation: { kind: "browser" },
        }
      : null,
  ),
  setGitHubSessionCookie: mocks.setGitHubSessionCookie,
}));

describe("GitHub callback route", () => {
  beforeEach(() => {
    mocks.oauthState = undefined;
    mocks.exchangeGitHubCode.mockReset();
    mocks.setGitHubSessionCookie.mockReset();
  });

  it("redirects callback failures back to deployments with the launch marker", async () => {
    const res = await GET(
      new Request(
        "http://localhost:3000/api/bff/auth/github/callback?code=x&state=y",
      ),
    );
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/operate/deployments");
    expect(location.searchParams.get("launch")).toBe("github");
    expect(location.searchParams.get("github_error")).toBe(
      "invalid_oauth_state",
    );
  });

  it("exchanges GitHub code with the one-shot app and matching redirect URI", async () => {
    mocks.oauthState = "state-123";
    mocks.exchangeGitHubCode.mockResolvedValue({
      githubUserId: "4738254",
      githubLogin: "han",
      installationId: "123",
    });

    const res = await GET(
      new Request(
        "http://localhost:3000/api/bff/auth/github/callback?code=code-123&state=state-123",
      ),
    );

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/operate/deployments");
    expect(location.searchParams.get("launch")).toBe("github");
    expect(mocks.exchangeGitHubCode).toHaveBeenCalledWith({
      code: "code-123",
      app: 2,
      redirectUri: "http://localhost:3000/api/bff/auth/github/callback",
    });
    expect(mocks.setGitHubSessionCookie).toHaveBeenCalled();
  });

  it("redirects backend service-auth failures with a specific error code", async () => {
    mocks.oauthState = "state-123";
    mocks.exchangeGitHubCode.mockRejectedValue(
      new BackendError("exchange_github_code", 403, "forbidden"),
    );

    const res = await GET(
      new Request(
        "http://localhost:3000/api/bff/auth/github/callback?code=code-123&state=state-123",
      ),
    );

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/operate/deployments");
    expect(location.searchParams.get("github_error")).toBe(
      "service_auth_forbidden",
    );
  });
});

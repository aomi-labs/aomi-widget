// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "@aomi-labs/deploy";

import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  oauthState: undefined as string | undefined,
  exchangeGitHubCode: vi.fn(),
  setGitHubSessionCookie: vi.fn(),
  reportFailure: vi.fn(),
}));

vi.mock("@portal/server/bff/failures", () => ({
  portalFailures: { handle: mocks.reportFailure },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      name === "aomi_github_oauth_state" && mocks.oauthState
        ? { value: mocks.oauthState }
        : undefined,
  })),
}));

vi.mock("@portal/server/bff/backend", () => ({
  backendClient: vi.fn(async () => ({
    exchangeGitHubCode: mocks.exchangeGitHubCode,
  })),
}));

vi.mock("@portal/server/cookies/github", () => ({
  setGitHubSessionCookie: mocks.setGitHubSessionCookie,
}));

describe("GitHub callback route", () => {
  beforeEach(() => {
    mocks.oauthState = undefined;
    mocks.exchangeGitHubCode.mockReset();
    mocks.setGitHubSessionCookie.mockReset();
    mocks.reportFailure.mockReset();
    mocks.reportFailure.mockReturnValue({
      reason: "local_exception",
      responseStatus: 500,
      responseError: "internal_error",
    });
  });

  it("redirects callback failures back to deployments with the launch marker", async () => {
    const res = await GET(
      new Request(
        "http://localhost:3000/api/bff/auth/github/callback?code=x&state=y",
      ),
    );
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.pathname).toBe("/deployments");
    expect(location.searchParams.get("launch")).toBe("github");
    expect(location.searchParams.get("github_error")).toBe(
      "invalid_oauth_state",
    );
    expect(mocks.reportFailure).not.toHaveBeenCalled();
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
    expect(location.pathname).toBe("/deployments");
    expect(location.searchParams.get("launch")).toBe("github");
    expect(mocks.exchangeGitHubCode).toHaveBeenCalledWith({
      code: "code-123",
      app: 2,
      redirectUri: "http://localhost:3000/api/bff/auth/github/callback",
    });
    expect(mocks.setGitHubSessionCookie).toHaveBeenCalled();
  });

  it.each([
    [401, "exchange_failed"],
    [403, "service_auth_forbidden"],
  ])(
    "redirects backend service-auth %s with the existing error code",
    async (status, expectedError) => {
      mocks.oauthState = "state-123";
      const failure = new BackendError(
        "exchange_github_code",
        status,
        "forbidden",
        "private backend body",
      );
      mocks.exchangeGitHubCode.mockRejectedValue(failure);
      mocks.reportFailure.mockReturnValue({
        reason: "service_credential_rejected",
        upstreamStatus: status,
        responseStatus: 500,
        responseError: "internal_error",
      });

      const res = await GET(
        new Request(
          "http://localhost:3000/api/bff/auth/github/callback?code=code-123&state=state-123",
        ),
      );

      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location") ?? "");
      expect(location.pathname).toBe("/deployments");
      expect(location.searchParams.get("github_error")).toBe(expectedError);
      expect(mocks.reportFailure).toHaveBeenCalledWith({
        source: "launch",
        error: failure,
        context: {
          routeFamily: "/api/bff/auth/github/callback",
          operation: "github.oauth_exchange",
          method: "GET",
        },
      });
    },
  );

  it("logs a downstream Rust 5xx without creating a duplicate Issue", async () => {
    mocks.oauthState = "state-123";
    mocks.exchangeGitHubCode.mockRejectedValue(
      new BackendError(
        "exchange_github_code",
        503,
        "unavailable",
        "private backend body",
      ),
    );
    mocks.reportFailure.mockReturnValue({
      reason: "upstream_response_failed",
      responseStatus: 503,
      responseError: "upstream_unavailable",
    });

    const res = await GET(
      new Request(
        "http://localhost:3000/api/bff/auth/github/callback?code=private-code&state=state-123",
      ),
    );

    expect(res.status).toBe(307);
    const location = new URL(res.headers.get("location") ?? "");
    expect(location.searchParams.get("github_error")).toBe("exchange_failed");
    expect(mocks.reportFailure).toHaveBeenCalledWith({
      source: "launch",
      error: expect.any(BackendError),
      context: {
        routeFamily: "/api/bff/auth/github/callback",
        operation: "github.oauth_exchange",
        method: "GET",
      },
    });
  });
});

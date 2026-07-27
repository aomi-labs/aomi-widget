// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getGitHubSessionFromRequest,
  issueGitHubCliExchange,
  issueGitHubCliLoginRequest,
  issueGitHubCliSession,
  issueGitHubSession,
  readGitHubCliExchange,
  readGitHubCliLoginRequest,
  readGitHubCliSession,
} from "./github";

const session = {
  githubUserId: "12345",
  githubLogin: "builder",
  installationId: "67890",
};

describe("GitHub CLI sessions", () => {
  beforeEach(() => {
    vi.stubEnv(
      "PORTAL_ONLY_SESSION_SECRET",
      "test-only-session-secret-that-is-long-enough",
    );
  });

  it("accepts a CLI bearer and preserves the verified GitHub identity", async () => {
    const token = await issueGitHubCliSession(session);

    await expect(readGitHubCliSession(token)).resolves.toEqual(session);
    await expect(
      getGitHubSessionFromRequest(
        new Request("https://build.example.test/api/bff/cli/status", {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    ).resolves.toEqual(session);
  });

  it("does not accept a browser session cookie as a CLI bearer", async () => {
    const browserToken = await issueGitHubSession(session);
    await expect(readGitHubCliSession(browserToken)).resolves.toBeNull();
  });

  it("round-trips signed PKCE login and exchange state", async () => {
    const login = {
      redirectUri: "http://127.0.0.1:43210/callback",
      state: "s".repeat(43),
      codeChallenge: "c".repeat(43),
    };
    const loginToken = await issueGitHubCliLoginRequest(login);
    await expect(readGitHubCliLoginRequest(loginToken)).resolves.toEqual(login);

    const exchange = { session, codeChallenge: login.codeChallenge };
    const exchangeToken = await issueGitHubCliExchange(exchange);
    await expect(readGitHubCliExchange(exchangeToken)).resolves.toEqual(
      exchange,
    );
    await expect(readGitHubCliSession(exchangeToken)).resolves.toBeNull();
  });
});

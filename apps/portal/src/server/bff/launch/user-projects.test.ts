// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { userProjectsRoute } from "./routes";

vi.mock("@aomi-labs/account", () => ({
  portalService: () => ({
    mint: vi.fn(async () => ({
      accessToken: "service-token",
      expiresAt: Date.now() + 300_000,
    })),
  }),
}));

const getGitHubSession = vi.fn();
vi.mock("@portal/server/cookies/github", () => ({
  getGitHubSession: () => getGitHubSession(),
}));

function req() {
  return new Request("http://localhost:3000/api/bff/launch/projects");
}

describe("userProjectsRoute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("401s when there is no GitHub session", async () => {
    getGitHubSession.mockResolvedValueOnce(null);
    const res = await userProjectsRoute(req());
    expect(res.status).toBe(401);
  });

  it("returns the session user's projects, scoped to the cookie's github_user_id", async () => {
    getGitHubSession.mockResolvedValueOnce({
      githubUserId: "42",
      githubLogin: "alice",
    });
    const fetchMock = vi.fn(async () =>
      Response.json({
        projects: [
          {
            id: 99,
            installation_id: 555,
            repository_link: "https://github.com/alice/bot",
            github_user_id: "42",
            apps: [
              {
                id: 5,
                name: "bot",
                is_active: true,
                loaded: true,
                app_release_tag: "apps-555-r1-bot-abc",
              },
            ],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await userProjectsRoute(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.githubLogin).toBe("alice");
    expect(body.projects[0]).toMatchObject({
      id: 99,
      installationId: 555,
      apps: [{ id: 5, name: "bot", isActive: true, loaded: true }],
    });

    // The backend call is scoped to the session's github_user_id.
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(
      "/api/integrations/github-app/user/projects?github_user_id=42",
    );
  });
});

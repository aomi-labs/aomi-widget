// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { githubAppInstallUrl } from "./client";
import { sessionScopedFetch } from "@portal/lib/settings-api";

vi.mock("@portal/lib/settings-api", () => ({
  sessionScopedFetch: vi.fn(),
}));

const sessionScopedFetchMock = vi.mocked(sessionScopedFetch);

describe("githubAppInstallUrl", () => {
  beforeEach(() => {
    sessionScopedFetchMock.mockReset();
    sessionScopedFetchMock.mockResolvedValue({
      ok: true,
      install_url: "https://github.com/apps/aomi-build/installations/new",
    });
  });

  it("uses OAuth authorize for already-installed checks without a repo", async () => {
    await githubAppInstallUrl({
      platform: "community",
      mode: "authorize",
      app: 2,
    });

    expect(sessionScopedFetchMock).toHaveBeenCalledWith(
      "/api/integrations/github-app/oauth/start?platform=community&mode=authorize&app=2",
    );
  });

  it("uses OAuth authorize when a repo disambiguates the installation", async () => {
    await githubAppInstallUrl({
      platform: "community",
      repo: "alice/bot",
      mode: "authorize",
    });

    expect(sessionScopedFetchMock).toHaveBeenCalledWith(
      "/api/integrations/github-app/oauth/start?platform=community&repo=alice%2Fbot&mode=authorize",
    );
  });
});

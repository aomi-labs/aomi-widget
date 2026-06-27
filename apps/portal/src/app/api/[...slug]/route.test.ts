// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const listApps = vi.fn();

vi.mock("@aomi-labs/account", () => ({
  mintAccountBearer: vi.fn(),
}));

vi.mock("@portal/server/cookies/session", () => ({
  getSessionedCanonicalId: vi.fn(async () => null),
}));

vi.mock("@portal/server/backend-url", () => ({
  configuredBackendUrl: () => "https://api-staging.aomi.dev",
}));

vi.mock("@portal/server/bff/backend", () => ({
  deploymentClient: vi.fn(async () => ({ listApps })),
}));

vi.mock("@portal/server/bff/launch/config", () => ({
  launchConfig: () => ({
    platform: "somm.finance",
    platforms: ["somm.finance", "community"],
  }),
}));

function sessionAppsRequest() {
  return [
    new NextRequest("https://chat-staging.aomi.dev/api/session/apps"),
    { params: Promise.resolve({ slug: ["session", "apps"] }) },
  ] as const;
}

describe("portal API proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    listApps.mockReset();
  });

  it("adds public active loaded platform apps to the session app catalog", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json([{ name: "default" }, { name: "limitless" }]),
      ),
    );
    listApps
      .mockResolvedValueOnce([
        {
          id: 1,
          name: "somm-agent",
          isPublic: true,
          isActive: true,
          loaded: true,
        },
        {
          id: 2,
          name: "private-agent",
          isPublic: false,
          isActive: true,
          loaded: true,
        },
        {
          id: 3,
          name: "not-loaded-agent",
          isPublic: true,
          isActive: true,
          loaded: false,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 4,
          name: "community-agent",
          isPublic: true,
          isActive: true,
          loaded: true,
        },
      ]);

    const res = await GET(...sessionAppsRequest());
    const body = await res.json();

    expect(body).toEqual([
      { name: "default" },
      { name: "limitless" },
      {
        name: "somm-agent",
        applicationId: 1,
        platform: "somm.finance",
        isActive: true,
        isPublic: true,
      },
      {
        name: "community-agent",
        applicationId: 4,
        platform: "community",
        isActive: true,
        isPublic: true,
      },
    ]);
    expect(listApps).toHaveBeenNthCalledWith(1, { platform: "somm.finance" });
    expect(listApps).toHaveBeenNthCalledWith(2, { platform: "community" });
  });

  it("preserves the runtime app catalog when the platform app list fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json([{ name: "default" }])),
    );
    listApps
      .mockRejectedValueOnce(new Error("somm unavailable"))
      .mockRejectedValueOnce(new Error("community unavailable"));

    const res = await GET(...sessionAppsRequest());
    const body = await res.json();

    expect(body).toEqual([{ name: "default" }]);
  });

  it("keeps apps from reachable platforms when one platform fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json([{ name: "default" }])),
    );
    listApps
      .mockRejectedValueOnce(new Error("somm unavailable"))
      .mockResolvedValueOnce([
        {
          id: 4,
          name: "community-agent",
          isPublic: true,
          isActive: true,
          loaded: true,
        },
      ]);

    const res = await GET(...sessionAppsRequest());
    const body = await res.json();

    expect(body).toEqual([
      { name: "default" },
      {
        name: "community-agent",
        applicationId: 4,
        platform: "community",
        isActive: true,
        isPublic: true,
      },
    ]);
  });

  it("adds the primary launch platform to GitHub install redirects", async () => {
    const fetchMock = vi.fn(async (url: URL) =>
      Response.json({
        install_url: `https://github.com/apps/aomi/installations/new?${url.searchParams}`,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(
      new NextRequest(
        "https://chat-staging.aomi.dev/api/integrations/github-app/oauth/start?repo=aomi-labs/example",
      ),
      {
        params: Promise.resolve({
          slug: ["integrations", "github-app", "oauth", "start"],
        }),
      },
    );
    const body = await res.json();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        href: "https://api-staging.aomi.dev/api/integrations/github-app/oauth/start?repo=aomi-labs%2Fexample&platform=somm.finance",
      }),
      expect.any(Object),
    );
    expect(body.install_url).toContain("platform=somm.finance");
  });
});

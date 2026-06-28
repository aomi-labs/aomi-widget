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

  it("forwards the backend session app catalog with the launch platforms", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        { name: "default" },
        { name: "somm-agent", application_id: 1, platform: "somm.finance" },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(...sessionAppsRequest());
    const body = await res.json();

    expect(body).toEqual([
      { name: "default" },
      { name: "somm-agent", application_id: 1, platform: "somm.finance" },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/api/session/apps",
        search: "?platform=somm.finance&platform=community",
      }),
      expect.any(Object),
    );
    expect(listApps).not.toHaveBeenCalled();
  });

  it("preserves an explicit session app platform filter", async () => {
    const fetchMock = vi.fn(async () => Response.json([{ name: "default" }]));
    vi.stubGlobal("fetch", fetchMock);

    await GET(
      new NextRequest(
        "https://chat-staging.aomi.dev/api/session/apps?platform=community",
      ),
      {
        params: Promise.resolve({ slug: ["session", "apps"] }),
      },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/api/session/apps",
        search: "?platform=community",
      }),
      expect.any(Object),
    );
    expect(listApps).not.toHaveBeenCalled();
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

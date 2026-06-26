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
  launchConfig: () => ({ platform: "somm.finance" }),
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
    listApps.mockResolvedValueOnce([
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
    ]);

    const res = await GET(...sessionAppsRequest());
    const body = await res.json();

    expect(body).toEqual([
      { name: "default" },
      { name: "limitless" },
      { name: "somm-agent" },
    ]);
    expect(listApps).toHaveBeenCalledWith({ platform: "somm.finance" });
  });

  it("preserves the runtime app catalog when the platform app list fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json([{ name: "default" }])),
    );
    listApps.mockRejectedValueOnce(new Error("platform unavailable"));

    const res = await GET(...sessionAppsRequest());
    const body = await res.json();

    expect(body).toEqual([{ name: "default" }]);
  });
});

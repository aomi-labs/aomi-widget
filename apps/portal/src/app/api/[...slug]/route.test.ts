// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

const listApps = vi.fn();
const launchConfigMock = vi.hoisted(() => ({
  catalogPlatforms: [] as string[],
}));

// Keep the real `createBackendProxy` / `getSessionedCanonicalId` (the proxy now
// lives in `@aomi-labs/account`); only stub the mint. With no `aomi_session`
// cookie on the test requests, the real `getSessionedCanonicalId` returns null,
// so the proxy forwards anonymous and `mintAccountBearer` is never called.
vi.mock("@aomi-labs/account", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aomi-labs/account")>();
  return {
    ...actual,
    mintAccountBearer: vi.fn(async () => ({
      bearer: "test-bearer",
      expiresAt: 0,
    })),
  };
});

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
    catalogPlatforms: launchConfigMock.catalogPlatforms,
  }),
}));

function sessionAppsRequest() {
  return [
    new NextRequest("https://chat-staging.aomi.dev/api/session/apps"),
    { params: Promise.resolve({ slug: ["session", "apps"] }) },
  ] as const;
}

function proxiedUrl(call: unknown[] | undefined): URL {
  const input = call?.[0];
  if (input instanceof URL) return input;
  if (typeof input === "string") return new URL(input);
  throw new Error(`Unexpected proxied URL: ${String(input)}`);
}

describe("portal API proxy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    launchConfigMock.catalogPlatforms = [];
    listApps.mockReset();
  });

  it("forwards the backend session app catalog without a default platform filter", async () => {
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
    const url = proxiedUrl(fetchMock.mock.calls[0]);
    expect(url.pathname).toBe("/api/session/apps");
    expect(url.search).toBe("");
    expect(listApps).not.toHaveBeenCalled();
  });

  it("adds explicit catalog platform filters to session app catalog calls", async () => {
    launchConfigMock.catalogPlatforms = ["somm.finance", "community"];
    const fetchMock = vi.fn(async () => Response.json([{ name: "default" }]));
    vi.stubGlobal("fetch", fetchMock);

    await GET(...sessionAppsRequest());

    const url = proxiedUrl(fetchMock.mock.calls[0]);
    expect(url.pathname).toBe("/api/session/apps");
    expect(url.search).toBe("?platform=somm.finance&platform=community");
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

    const url = proxiedUrl(fetchMock.mock.calls[0]);
    expect(url.pathname).toBe("/api/session/apps");
    expect(url.search).toBe("?platform=community");
    expect(listApps).not.toHaveBeenCalled();
  });

});

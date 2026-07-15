// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, OPTIONS } from "./route";

const listApps = vi.fn();
const launchConfigMock = vi.hoisted(() => ({
  catalogPlatforms: [] as string[],
}));
const principalMock = vi.hoisted(() =>
  vi.fn(async () => null as string | null),
);

// Keep the real `createBackendProxy`; only stub the mint. Requests in these
// tests are unauthenticated, so the portal resolver returns null and the proxy
// forwards anonymous.
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

vi.mock("@portal/lib/widget-auth/principal", () => ({
  resolvePortalCanonicalUserId: principalMock,
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

function apiRequest(
  path: string,
  init?: ConstructorParameters<typeof NextRequest>[1],
) {
  const url = new URL(`https://chat-staging.aomi.dev${path}`);
  const slug = url.pathname
    .replace(/^\/api\/?/, "")
    .split("/")
    .filter(Boolean);
  return [
    new NextRequest(url, init),
    { params: Promise.resolve({ slug }) },
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
    principalMock.mockResolvedValue(null);
    listApps.mockReset();
  });

  it("forwards the backend thread app catalog without a default platform filter", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        { name: "default" },
        { name: "somm-agent", application_id: 1, platform: "somm.finance" },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(...apiRequest("/api/thread/apps"));
    const body = await res.json();

    expect(body).toEqual([
      { name: "default" },
      { name: "somm-agent", application_id: 1, platform: "somm.finance" },
    ]);
    const url = proxiedUrl(fetchMock.mock.calls[0]);
    expect(url.pathname).toBe("/api/thread/apps");
    expect(url.search).toBe("");
    expect(listApps).not.toHaveBeenCalled();
  });

  it("rewrites legacy session app catalog calls", async () => {
    const fetchMock = vi.fn(async () => Response.json([{ name: "default" }]));
    vi.stubGlobal("fetch", fetchMock);

    await GET(...apiRequest("/api/session/apps"));

    const url = proxiedUrl(fetchMock.mock.calls[0]);
    expect(url.pathname).toBe("/api/thread/apps");
    expect(listApps).not.toHaveBeenCalled();
  });

  it("adds explicit catalog platform filters to thread app catalog calls", async () => {
    launchConfigMock.catalogPlatforms = ["somm.finance", "community"];
    const fetchMock = vi.fn(async () => Response.json([{ name: "default" }]));
    vi.stubGlobal("fetch", fetchMock);

    await GET(...apiRequest("/api/thread/apps"));

    const url = proxiedUrl(fetchMock.mock.calls[0]);
    expect(url.pathname).toBe("/api/thread/apps");
    expect(url.search).toBe("?platform=somm.finance&platform=community");
    expect(listApps).not.toHaveBeenCalled();
  });

  it("preserves an explicit thread app platform filter", async () => {
    const fetchMock = vi.fn(async () => Response.json([{ name: "default" }]));
    vi.stubGlobal("fetch", fetchMock);

    await GET(...apiRequest("/api/thread/apps?platform=community"));

    const url = proxiedUrl(fetchMock.mock.calls[0]);
    expect(url.pathname).toBe("/api/thread/apps");
    expect(url.search).toBe("?platform=community");
    expect(listApps).not.toHaveBeenCalled();
  });

  it("forwards GitHub App OAuth start anonymously with its app query", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        install_url: "https://github.com/apps/aomi/installations/new",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(
      ...apiRequest("/api/integrations/github-app/oauth/start?app=2"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      install_url: "https://github.com/apps/aomi/installations/new",
    });
    const url = proxiedUrl(fetchMock.mock.calls[0]);
    expect(url.pathname).toBe("/api/integrations/github-app/oauth/start");
    expect(url.search).toBe("?app=2");
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.has("authorization")).toBe(false);
  });

  it("rejects stale settings account proxy calls", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(...apiRequest("/api/settings/account"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "Unsupported API route" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("binds cross-origin proxy responses to the observed widget origin", async () => {
    principalMock.mockResolvedValue("user-1");
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      ...apiRequest("/api/account", {
        headers: {
          Origin: "https://customer.example",
          Authorization: "Bearer aomi_wst_test",
        },
      }),
    );

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://customer.example",
    );
    expect(response.headers.get("Access-Control-Allow-Credentials")).toBeNull();
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get("Authorization")).toMatch(/^Bearer ey/);
    expect(headers.get("Authorization")).not.toContain("aomi_wst_test");
  });

  it("preflights only methods exposed by the Portal proxy allowlist", async () => {
    const [request, context] = apiRequest("/api/account", {
      method: "OPTIONS",
      headers: {
        Origin: "https://customer.example",
        "Access-Control-Request-Method": "PATCH",
      },
    });

    const response = await OPTIONS(request, context);

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://customer.example",
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain(
      "PATCH",
    );
  });
});

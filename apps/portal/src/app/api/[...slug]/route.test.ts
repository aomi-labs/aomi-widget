// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

const listApps = vi.fn();
const launchConfigMock = vi.hoisted(() => ({
  catalogPlatforms: [] as string[],
}));
const telemetry = vi.hoisted(() => ({
  capture: vi.fn(),
  log: vi.fn(),
}));

vi.mock("@portal/server/bff/failures", async () => {
  const { classifyFailure, identifyFailure } =
    await import("@aomi-labs/bff-observability");
  return {
    portalFailures: {
      handle: (input: Parameters<typeof identifyFailure>[0]) => {
        const decision = classifyFailure(identifyFailure(input));
        const eventContext = {
          service: "portal-bff",
          ...decision.context,
          status: decision.responseStatus,
          ...(decision.upstream ? { upstream: decision.upstream } : {}),
          ...(decision.upstreamStatus !== undefined
            ? { upstreamStatus: decision.upstreamStatus }
            : {}),
          handled: decision.handled,
        };
        if (decision.action === "issue") {
          telemetry.capture(decision.error, eventContext);
        } else if (decision.action === "log") {
          telemetry.log(eventContext);
        }
        return {
          ...decision,
          response: Response.json(
            { error: decision.responseError },
            { status: decision.responseStatus },
          ),
        };
      },
    },
  };
});

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

function apiRequest(path: string, method = "GET") {
  const url = new URL(`https://chat-staging.aomi.dev${path}`);
  const slug = url.pathname
    .replace(/^\/api\/?/, "")
    .split("/")
    .filter(Boolean);
  return [
    new NextRequest(url, { method }),
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
    listApps.mockReset();
    telemetry.capture.mockReset();
    telemetry.log.mockReset();
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

  it("sanitizes and logs a downstream Rust 5xx without creating an Issue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ error: "private backend detail" }, { status: 503 }),
      ),
    );

    const res = await GET(...apiRequest("/api/thread/apps"));

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: "upstream_unavailable",
    });
    expect(telemetry.capture).not.toHaveBeenCalled();
    expect(telemetry.log).toHaveBeenCalledWith({
      service: "portal-bff",
      routeFamily: "/api/thread/apps",
      operation: "proxy.upstream_response",
      method: "GET",
      status: 503,
      upstream: "rust",
      upstreamStatus: 503,
      handled: true,
    });
  });

  it("captures the original proxy network error exactly once", async () => {
    const failure = new Error("private socket detail");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(failure)),
    );

    const res = await GET(...apiRequest("/api/thread/apps"));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({
      error: "upstream_unavailable",
    });
    expect(telemetry.log).not.toHaveBeenCalled();
    expect(telemetry.capture).toHaveBeenCalledTimes(1);
    expect(telemetry.capture).toHaveBeenCalledWith(failure, {
      service: "portal-bff",
      routeFamily: "/api/thread/apps",
      operation: "proxy.upstream_request",
      method: "GET",
      status: 502,
      upstream: "rust",
      handled: true,
    });
  });

  it.each(["archive", "unarchive"])(
    "forwards thread %s requests",
    async (action) => {
      const fetchMock = vi.fn(async () => Response.json({ ok: true }));
      vi.stubGlobal("fetch", fetchMock);

      const res = await POST(
        ...apiRequest(`/api/threads/thread-123/${action}`, "POST"),
      );

      expect(res.status).toBe(200);
      const url = proxiedUrl(fetchMock.mock.calls[0]);
      expect(url.pathname).toBe(`/api/threads/thread-123/${action}`);
      expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
    },
  );
});

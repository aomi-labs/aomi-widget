// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { operateObservabilityRoute, operateUsageRoute } from "./routes";

const getGitHubSession = vi.fn();
vi.mock("@build/server/cookies/github", () => ({
  getGitHubSession: () => getGitHubSession(),
}));

// Each test uses a fresh githubUserId so the routes' 15s per-user source
// cache never serves a previous test's sources.
let nextUserId = 70_001;
function signIn(): string {
  const githubUserId = String(nextUserId++);
  getGitHubSession.mockResolvedValue({ githubUserId, githubLogin: "alice" });
  return githubUserId;
}

/** One owned source, shaped like the manager's listUserSources response. */
function sourcesResponse(id = 900) {
  return Response.json({
    sources: [{ id, installation_id: 555, apps: [{ name: "my-bot" }] }],
  });
}

/**
 * URL-routed backend stub — the usage route fires `/usage` and `/statement`
 * concurrently, so match on the path, not call order.
 */
function stubBackend(handlers: {
  sources?: () => Response;
  usage?: () => Response;
  statement?: () => Response;
  observability?: () => Response;
}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/user/sources?")) return (handlers.sources ?? sourcesResponse)();
    if (url.includes("/statement")) return handlers.statement!();
    if (url.includes("/usage")) return handlers.usage!();
    if (url.includes("/observability")) return handlers.observability!();
    throw new Error(`unexpected backend fetch: ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function usageRequest() {
  return new Request("http://localhost:3000/api/bff/operate/usage");
}
function observabilityRequest() {
  return new Request("http://localhost:3000/api/bff/operate/observability");
}

const emptyUsage = () =>
  Response.json({
    range: { from_date: "2026-07-01", to_date: "2026-07-15", max_days: 31 },
    daily: [],
    breakdown: [],
  });

afterEach(() => {
  vi.unstubAllGlobals();
  getGitHubSession.mockReset();
});

describe("operateUsageRoute statement fallback", () => {
  it("serves the example statement (example: true) when the manager has none", async () => {
    signIn();
    stubBackend({
      usage: emptyUsage,
      statement: () => new Response("not found", { status: 404 }),
    });

    const res = await operateUsageRoute(usageRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.example).toBe(true);
    // The folded example summary — the same numbers the harness renders.
    expect(body.statement.summary.grossRevenue).toBeCloseTo(183.25, 2);
    expect(body.statement.summary.net).toBeCloseTo(113.02, 2);
    expect(body.statement.entries.length).toBeGreaterThan(0);
  });

  it("uses the real statement (no example flag) when the manager returns one", async () => {
    signIn();
    stubBackend({
      usage: emptyUsage,
      statement: () =>
        Response.json({
          source: { id: 900, installation_id: 555 },
          platform: "community",
          range: { from_date: "2026-07-01", to_date: "2026-07-15" },
          available: true,
          summary: {
            gross_revenue: 9,
            platform_fees: 0.9,
            service_charges: 2,
            net: 6.1,
          },
          revenue: [
            {
              subject: "tool_invocation",
              application: "real-bot",
              application_id: 1,
              events: 3,
              gross: 9,
              platform_fee: 0.9,
              net: 8.1,
            },
          ],
          charges: [],
          entries: [],
        }),
    });

    const res = await operateUsageRoute(usageRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.example).toBeUndefined();
    expect(body.statement.summary.net).toBeCloseTo(6.1, 2);
    expect(body.statement.revenue[0].application).toBe("real-bot");
  });
});

describe("operateObservabilityRoute trend fallback", () => {
  it("grafts example 24h trends onto a live card; real metrics win", async () => {
    signIn();
    stubBackend({
      observability: () =>
        Response.json({
          source: { id: 900, installation_id: 555 },
          platform: "community",
          scope: "owned_applications",
          monitoring: { provider: "grafana_prometheus", status: "ok", window_seconds: 900 },
          apps: [
            {
              application_id: 1,
              application: "real-bot",
              active: true,
              loaded: true,
              status: "healthy",
              // Live window metrics, but NO 24h trend fields.
              metrics: {
                provider: "grafana_prometheus",
                window_seconds: 900,
                available: true,
                error_rate: 0.5,
                p95_latency_ms: 1234,
              },
            },
          ],
          dashboard_links: [],
          platform_metrics: [],
        }),
    });

    const res = await operateObservabilityRoute(observabilityRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.example).toBe(true);
    const card = body.apps.find((a: any) => a.application === "real-bot");
    expect(card.metrics.errorRate).toBe(0.5); // real value preserved
    expect(card.metrics.p95LatencyMs).toBe(1234); // real value preserved
    expect(card.metrics.chats24h).toBeGreaterThan(0); // example filled
    expect(card.metrics.chatsHourly.length).toBe(24); // example filled
  });

  it("serves full example cards when the account has no live apps", async () => {
    signIn();
    stubBackend({
      observability: () =>
        Response.json({
          source: { id: 900, installation_id: 555 },
          platform: "community",
          scope: "owned_applications",
          monitoring: null,
          apps: [],
          dashboard_links: [],
          platform_metrics: [],
        }),
    });

    const res = await operateObservabilityRoute(observabilityRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.example).toBe(true);
    expect(body.apps.length).toBeGreaterThanOrEqual(3);
    expect(body.monitoring.status).toBe("example");
  });
});

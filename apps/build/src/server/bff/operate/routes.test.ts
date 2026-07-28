// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearSourcesCacheForTesting,
  operateAppDetailRoute,
  operateBotsRoute,
  operateBotsCreateRoute,
  operateBotsDeleteRoute,
  operateObservabilityRoute,
  operateUsageRoute,
} from "./routes";

const client = {
  listUserSources: vi.fn(),
  listUserSourceBots: vi.fn(),
  createUserSourceBot: vi.fn(),
  deleteUserSourceBot: vi.fn(),
  getUserSourceUsage: vi.fn(),
  getUserSourceStatement: vi.fn(),
  getUserSourceObservability: vi.fn(),
  getUserSourceAppDetail: vi.fn(),
  listUserSourceTransactions: vi.fn(),
  listUserSourceLogs: vi.fn(),
  listUserSourceDeployments: vi.fn(),
};

vi.mock("@build/server/bff/backend", () => ({
  deploymentClient: async () => client,
}));

const getGitHubSession = vi.fn();
vi.mock("@build/server/cookies/github", () => ({
  getGitHubSession: () => getGitHubSession(),
}));

function getReq(qs = "") {
  return new Request(`http://localhost:3000/api/bff/operate/bots${qs}`);
}

function postJson(body: unknown) {
  return new Request("http://localhost:3000/api/bff/operate/bots", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

function deleteReq(qs: string) {
  return new Request(`http://localhost:3000/api/bff/operate/bots${qs}`, {
    method: "DELETE",
  });
}

function setSession(overrides: { githubUserId: string }) {
  getGitHubSession.mockResolvedValue({
    githubUserId: overrides.githubUserId,
    githubLogin: "alice",
  });
}

function clearSession() {
  getGitHubSession.mockResolvedValue(null);
}

beforeEach(() => {
  clearSourcesCacheForTesting();
  client.listUserSources.mockReset();
  client.listUserSourceBots.mockReset();
  client.createUserSourceBot.mockReset();
  client.deleteUserSourceBot.mockReset();
  client.getUserSourceUsage.mockReset();
  client.getUserSourceStatement.mockReset();
  client.getUserSourceObservability.mockReset();
  client.getUserSourceAppDetail.mockReset();
  client.listUserSourceTransactions.mockReset();
  client.listUserSourceLogs.mockReset();
  client.listUserSourceDeployments.mockReset();
  getGitHubSession.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("operateBotsRoute", () => {
  it("401s the bots list when not signed in with GitHub", async () => {
    clearSession();
    const res = await operateBotsRoute(getReq());
    expect(res.status).toBe(401);
    expect(client.listUserSources).not.toHaveBeenCalled();
  });

  it("lists bots across owned sources", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([
      { id: 42, repositoryLink: "o/r", apps: [] },
    ]);
    client.listUserSourceBots.mockResolvedValue([
      { id: "b1", platformUsername: "mybot" },
    ]);
    const res = await operateBotsRoute(getReq());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      bots: [{ id: "b1", platformUsername: "mybot", source: { id: 42 } }],
    });
    expect(client.listUserSourceBots).toHaveBeenCalledWith(
      expect.objectContaining({
        githubUserId: "gh-1",
        appSourceId: 42,
      }),
    );
  });

  it("fans out over every owned source", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([
      { id: 1, apps: [] },
      { id: 2, apps: [] },
    ]);
    client.listUserSourceBots
      .mockResolvedValueOnce([{ id: "b1", platformUsername: "one" }])
      .mockResolvedValueOnce([{ id: "b2", platformUsername: "two" }]);
    const res = await operateBotsRoute(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bots).toHaveLength(2);
    expect(client.listUserSourceBots).toHaveBeenCalledTimes(2);
  });
});

describe("operateBotsCreateRoute", () => {
  it("401s create when not signed in with GitHub", async () => {
    clearSession();
    const res = await operateBotsCreateRoute(
      postJson({ appSourceId: 42, applicationId: 1, credential: "t" }),
    );
    expect(res.status).toBe(401);
    expect(client.createUserSourceBot).not.toHaveBeenCalled();
  });

  it("404s a create for a source the user does not own", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    const res = await operateBotsCreateRoute(
      postJson({ appSourceId: 99, applicationId: 1, credential: "t" }),
    );
    expect(res.status).toBe(404);
    expect(client.createUserSourceBot).not.toHaveBeenCalled();
  });

  it("400s an invalid body before calling the backend", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    let res = await operateBotsCreateRoute(
      postJson({ appSourceId: "nope", applicationId: 1, credential: "t" }),
    );
    expect(res.status).toBe(400);

    res = await operateBotsCreateRoute(
      postJson({ appSourceId: 42, applicationId: 1, credential: "   " }),
    );
    expect(res.status).toBe(400);
    expect(client.createUserSourceBot).not.toHaveBeenCalled();
  });

  it("creates a bot for an owned source, hardcoding the telegram bot platform", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    client.createUserSourceBot.mockResolvedValue({
      id: "b1",
      platform: "telegram",
    });
    const res = await operateBotsCreateRoute(
      postJson({
        appSourceId: 42,
        applicationId: 7,
        credential: "secret-token",
        label: "My Bot",
      }),
    );
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      bot: { id: "b1", platform: "telegram", source: { id: 42 } },
    });
    expect(client.createUserSourceBot).toHaveBeenCalledWith(
      expect.objectContaining({
        githubUserId: "gh-1",
        appSourceId: 42,
        applicationId: 7,
        botPlatform: "telegram",
        credential: "secret-token",
        label: "My Bot",
      }),
    );
  });

  it("never logs or echoes the credential value on failure paths", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    client.createUserSourceBot.mockRejectedValue(new Error("backend down"));
    const res = await operateBotsCreateRoute(
      postJson({ appSourceId: 42, applicationId: 7, credential: "top-secret" }),
    );
    const text = await res.text();
    expect(text).not.toContain("top-secret");
  });
});

describe("operateBotsDeleteRoute", () => {
  it("401s delete when not signed in with GitHub", async () => {
    clearSession();
    const res = await operateBotsDeleteRoute(
      deleteReq("?appSourceId=42&botId=b1"),
    );
    expect(res.status).toBe(401);
    expect(client.deleteUserSourceBot).not.toHaveBeenCalled();
  });

  it("404s a delete for a source the user does not own", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    const res = await operateBotsDeleteRoute(
      deleteReq("?appSourceId=99&botId=b1"),
    );
    expect(res.status).toBe(404);
    expect(client.deleteUserSourceBot).not.toHaveBeenCalled();
  });

  it("400s a delete missing appSourceId or botId", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    let res = await operateBotsDeleteRoute(deleteReq("?botId=b1"));
    expect(res.status).toBe(400);
    res = await operateBotsDeleteRoute(deleteReq("?appSourceId=42"));
    expect(res.status).toBe(400);
    expect(client.deleteUserSourceBot).not.toHaveBeenCalled();
  });

  it("deletes a bot for an owned source", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    client.deleteUserSourceBot.mockResolvedValue(undefined);
    const res = await operateBotsDeleteRoute(
      deleteReq("?appSourceId=42&botId=b1"),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(client.deleteUserSourceBot).toHaveBeenCalledWith(
      expect.objectContaining({
        githubUserId: "gh-1",
        appSourceId: 42,
        botId: "b1",
      }),
    );
  });
});

function usageReq() {
  return new Request("http://localhost:3000/api/bff/operate/usage");
}
function observabilityReq() {
  return new Request("http://localhost:3000/api/bff/operate/observability");
}
function appDetailReq(qs = "?appSourceId=900&applicationId=77") {
  return new Request(
    `http://localhost:3000/api/bff/operate/observability/detail${qs}`,
  );
}

const oneSource = () =>
  client.listUserSources.mockResolvedValue([
    { id: 900, repositoryLink: "o/r", apps: [] },
  ]);

// The route consumes the deploy client's already-camelCased results.
const emptyUsage = {
  source: { id: 900 },
  platform: "community",
  range: { fromDate: "2026-07-01", toDate: "2026-07-15", maxDays: 31 },
  daily: [],
  breakdown: [],
};

describe("operateUsageRoute statement fallback", () => {
  it("serves the example statement (example: true) when the manager has none", async () => {
    setSession({ githubUserId: "gh-1" });
    oneSource();
    client.getUserSourceUsage.mockResolvedValue(emptyUsage);
    // No statement endpoint yet → the client throws → source drops out.
    client.getUserSourceStatement.mockRejectedValue(new Error("404"));

    const res = await operateUsageRoute(usageReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.example).toBe(true);
    // The folded example summary — the same numbers the harness renders.
    expect(body.statement.summary.grossRevenue).toBeCloseTo(183.25, 2);
    expect(body.statement.summary.net).toBeCloseTo(113.02, 2);
    expect(body.statement.entries.length).toBeGreaterThan(0);
  });

  it("drops a statement the backend reports as unavailable", async () => {
    setSession({ githubUserId: "gh-1" });
    oneSource();
    client.getUserSourceUsage.mockResolvedValue(emptyUsage);
    client.getUserSourceStatement.mockResolvedValue({
      source: { id: 900 },
      platform: "community",
      range: { fromDate: "2026-07-01", toDate: "2026-07-15" },
      available: false,
      summary: { grossRevenue: 0, platformFees: 0, serviceCharges: 0, net: 0 },
      revenue: [],
      charges: [],
      entries: [],
    });

    const res = await operateUsageRoute(usageReq());
    const body = await res.json();
    expect(body.example).toBe(true); // fell back to example
  });

  it("uses the real statement (no example flag) when the manager returns one", async () => {
    setSession({ githubUserId: "gh-1" });
    oneSource();
    client.getUserSourceUsage.mockResolvedValue(emptyUsage);
    client.getUserSourceStatement.mockResolvedValue({
      source: { id: 900 },
      platform: "community",
      range: { fromDate: "2026-07-01", toDate: "2026-07-15" },
      available: true,
      summary: {
        grossRevenue: 9,
        platformFees: 0.9,
        serviceCharges: 2,
        net: 6.1,
      },
      revenue: [
        {
          subject: "tool_invocation",
          application: "real-bot",
          applicationId: 1,
          events: 3,
          gross: 9,
          platformFee: 0.9,
          net: 8.1,
        },
      ],
      charges: [],
      entries: [],
    });

    const res = await operateUsageRoute(usageReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.example).toBeUndefined();
    expect(body.statement.summary.net).toBeCloseTo(6.1, 2);
    expect(body.statement.revenue[0].application).toBe("real-bot");
  });
});

describe("operateObservabilityRoute live data", () => {
  it("reuses a recent account-scoped manager read", async () => {
    setSession({ githubUserId: "gh-1" });
    oneSource();
    client.getUserSourceObservability.mockResolvedValue({
      source: { id: 900 },
      platform: "community",
      scope: "owned_applications",
      monitoring: null,
      apps: [],
      dashboardLinks: [],
      platformMetrics: [],
    });

    const first = await operateObservabilityRoute(observabilityReq());
    const second = await operateObservabilityRoute(observabilityReq());

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(client.getUserSourceObservability).toHaveBeenCalledTimes(1);
  });

  it("keeps a partial live card partial instead of grafting example trends", async () => {
    setSession({ githubUserId: "gh-1" });
    oneSource();
    client.getUserSourceObservability.mockResolvedValue({
      source: { id: 900 },
      platform: "community",
      scope: "owned_applications",
      monitoring: {
        provider: "grafana_prometheus",
        status: "ok",
        windowSeconds: 900,
      },
      apps: [
        {
          applicationId: 1,
          application: "real-bot",
          active: true,
          loaded: true,
          status: "healthy",
          // Live window metrics, but no 24h trend fields yet.
          metrics: {
            provider: "grafana_prometheus",
            windowSeconds: 900,
            available: true,
            errorRate: 0.5,
            p95LatencyMs: 1234,
          },
        },
      ],
      dashboardLinks: [],
      platformMetrics: [],
    });

    const res = await operateObservabilityRoute(observabilityReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.example).toBeUndefined();
    const card = body.apps.find(
      (a: { application: string }) => a.application === "real-bot",
    );
    expect(card.metrics.errorRate).toBe(0.5); // real value preserved
    expect(card.metrics.p95LatencyMs).toBe(1234); // real value preserved
    expect(card.metrics.chats24h).toBeUndefined();
    expect(card.metrics.chatsHourly).toBeUndefined();
  });

  it("returns an empty app list when the account has no live apps", async () => {
    setSession({ githubUserId: "gh-1" });
    oneSource();
    client.getUserSourceObservability.mockResolvedValue({
      source: { id: 900 },
      platform: "community",
      scope: "owned_applications",
      monitoring: null,
      apps: [],
      dashboardLinks: [],
      platformMetrics: [],
    });

    const res = await operateObservabilityRoute(observabilityReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.example).toBeUndefined();
    expect(body.apps).toEqual([]);
    expect(body.monitoring.status).toBe("unconfigured");
  });
});

describe("operateAppDetailRoute", () => {
  it("requires a valid application id", async () => {
    const res = await operateAppDetailRoute(
      appDetailReq("?appSourceId=900&applicationId=nope"),
    );
    expect(res.status).toBe(400);
    expect(client.listUserSources).not.toHaveBeenCalled();
  });

  it("returns the real aggregate plus app-filtered supporting rows", async () => {
    setSession({ githubUserId: "gh-1" });
    oneSource();
    client.getUserSourceAppDetail.mockResolvedValue({
      source: { id: 900 },
      platform: "community",
      app: { applicationId: 77, name: "demo" },
    });
    client.getUserSourceObservability.mockResolvedValue({
      apps: [{ applicationId: 77, application: "demo", status: "healthy" }],
    });
    client.listUserSourceTransactions.mockResolvedValue({
      source: { id: 900 },
      platform: "community",
      transactions: [
        { id: "tx-match", applicationId: 77 },
        { id: "tx-other", applicationId: 88 },
      ],
      nextCursor: null,
    });
    client.listUserSourceLogs.mockResolvedValue({
      source: { id: 900 },
      platform: "community",
      logs: [
        { id: "log-match", applicationId: 77 },
        { id: "log-other", applicationId: 88 },
      ],
      nextCursor: null,
    });
    client.listUserSourceDeployments.mockResolvedValue([
      { deploymentId: "dep-1", apps: [] },
    ]);

    const res = await operateAppDetailRoute(appDetailReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.detail.app).toEqual({ applicationId: 77, name: "demo" });
    expect(body.health).toEqual({
      applicationId: 77,
      application: "demo",
      status: "healthy",
    });
    expect(body.transactions).toEqual([{ id: "tx-match", applicationId: 77 }]);
    expect(body.logs).toEqual([{ id: "log-match", applicationId: 77 }]);
    expect(body.deployments).toEqual([{ deploymentId: "dep-1", apps: [] }]);
    expect(client.getUserSourceAppDetail).toHaveBeenCalledWith({
      githubUserId: "gh-1",
      platform: expect.any(String),
      appSourceId: 900,
      applicationId: 77,
    });
  });
});

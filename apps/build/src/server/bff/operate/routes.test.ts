// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BackendError } from "@aomi-labs/deploy";

import {
  clearOperateCachesForTesting,
  operateAppDetailRoute,
  operateBotsRoute,
  operateBotsCreateRoute,
  operateBotsDeleteRoute,
  operateLogsRoute,
  operateObservabilityRoute,
  operateTransactionsRoute,
  operateUsageRoute,
} from "./routes";

const telemetry = vi.hoisted(() => ({
  capture: vi.fn(),
  log: vi.fn(),
}));

vi.mock("@build/server/bff/failures", async () => {
  const { classifyFailure, identifyFailure } =
    await import("@aomi-labs/bff-observability");
  return {
    buildFailures: {
      handle: (input: Parameters<typeof identifyFailure>[0]) => {
        const decision = classifyFailure(identifyFailure(input));
        const eventContext = {
          ...decision.context,
          status: decision.responseStatus,
          ...(decision.upstream ? { upstream: decision.upstream } : {}),
          ...(decision.upstreamStatus !== undefined
            ? { upstreamStatus: decision.upstreamStatus }
            : {}),
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

const client = {
  listUserSources: vi.fn(),
  listUserSourceBots: vi.fn(),
  createUserSourceBot: vi.fn(),
  deleteUserSourceBot: vi.fn(),
  listUserBots: vi.fn(),
  createUserBot: vi.fn(),
  updateUserBot: vi.fn(),
  deleteUserBot: vi.fn(),
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
  clearOperateCachesForTesting();
  client.listUserSources.mockReset();
  client.listUserSourceBots.mockReset();
  client.createUserSourceBot.mockReset();
  client.deleteUserSourceBot.mockReset();
  client.listUserBots.mockReset();
  client.createUserBot.mockReset();
  client.updateUserBot.mockReset();
  client.deleteUserBot.mockReset();
  client.getUserSourceUsage.mockReset();
  client.getUserSourceStatement.mockReset();
  client.getUserSourceObservability.mockReset();
  client.getUserSourceAppDetail.mockReset();
  client.listUserSourceTransactions.mockReset();
  client.listUserSourceLogs.mockReset();
  client.listUserSourceDeployments.mockReset();
  getGitHubSession.mockReset();
  telemetry.capture.mockReset();
  telemetry.log.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("operateBotsRoute", () => {
  it("401s the bots list when not signed in with GitHub", async () => {
    clearSession();
    const res = await operateBotsRoute(getReq());
    expect(res.status).toBe(401);
    expect(client.listUserSources).not.toHaveBeenCalled();
  });

  it("lists builder-wide bots once", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([
      { id: 42, repositoryLink: "o/r", apps: [] },
    ]);
    client.listUserBots.mockResolvedValue([
      { id: "b1", platformUsername: "mybot" },
    ]);
    const res = await operateBotsRoute(getReq());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      bots: [{ id: "b1", platformUsername: "mybot" }],
    });
    expect(client.listUserBots).toHaveBeenCalledWith(
      expect.objectContaining({
        githubUserId: "gh-1",
      }),
    );
  });

  it("does not fan out over every owned source", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([
      { id: 1, apps: [] },
      { id: 2, apps: [] },
    ]);
    client.listUserBots.mockResolvedValue([
      { id: "b1", platformUsername: "one" },
    ]);
    const res = await operateBotsRoute(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bots).toHaveLength(1);
    expect(client.listUserBots).toHaveBeenCalledTimes(1);
  });

  it("logs an owned-source Rust 5xx without creating a BFF Issue", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockRejectedValue(
      new BackendError(
        "list_user_sources",
        503,
        "failed",
        "private backend body",
      ),
    );

    const res = await operateBotsRoute(getReq());

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({
      error: "failed",
    });
    expect(telemetry.capture).not.toHaveBeenCalled();
    expect(telemetry.log).toHaveBeenCalledOnce();
    expect(telemetry.log).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "operate.owned_sources",
        upstream: "rust",
        upstreamStatus: 503,
      }),
    );
  });
});

describe("operateBotsCreateRoute", () => {
  it("401s create when not signed in with GitHub", async () => {
    clearSession();
    const res = await operateBotsCreateRoute(
      postJson({
        applicationIds: [1],
        primaryApplicationId: 1,
        credential: "t",
      }),
    );
    expect(res.status).toBe(401);
    expect(client.createUserBot).not.toHaveBeenCalled();
  });

  it("rejects a create for apps the user does not own", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    const res = await operateBotsCreateRoute(
      postJson({
        applicationIds: [1],
        primaryApplicationId: 1,
        credential: "t",
      }),
    );
    expect(res.status).toBe(403);
    expect(client.createUserBot).not.toHaveBeenCalled();
  });

  it("400s an invalid body before calling the backend", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    let res = await operateBotsCreateRoute(
      postJson({
        applicationIds: "nope",
        primaryApplicationId: 1,
        credential: "t",
      }),
    );
    expect(res.status).toBe(400);

    res = await operateBotsCreateRoute(
      postJson({
        applicationIds: [1],
        primaryApplicationId: 1,
        credential: "   ",
      }),
    );
    expect(res.status).toBe(400);
    expect(client.createUserBot).not.toHaveBeenCalled();
  });

  it("creates a bot with owned cross-source app mappings", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [{ id: 7 }] }]);
    client.createUserBot.mockResolvedValue({
      id: "b1",
      platform: "telegram",
    });
    const res = await operateBotsCreateRoute(
      postJson({
        applicationIds: [7],
        primaryApplicationId: 7,
        credential: "secret-token",
        label: "My Bot",
      }),
    );
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      bot: { id: "b1", platform: "telegram" },
    });
    expect(client.createUserBot).toHaveBeenCalledWith(
      expect.objectContaining({
        githubUserId: "gh-1",
        applicationIds: [7],
        primaryApplicationId: 7,
        botPlatform: "telegram",
        credential: "secret-token",
        label: "My Bot",
      }),
    );
  });

  it("never logs or echoes the credential value on failure paths", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [{ id: 7 }] }]);
    client.createUserBot.mockRejectedValue(new Error("backend down"));
    const res = await operateBotsCreateRoute(
      postJson({
        applicationIds: [7],
        primaryApplicationId: 7,
        credential: "top-secret",
      }),
    );
    const text = await res.text();
    expect(text).not.toContain("top-secret");
  });
});

describe("operateBotsDeleteRoute", () => {
  it("401s delete when not signed in with GitHub", async () => {
    clearSession();
    const res = await operateBotsDeleteRoute(deleteReq("?botId=b1"));
    expect(res.status).toBe(401);
    expect(client.deleteUserBot).not.toHaveBeenCalled();
  });

  it("400s a delete missing botId", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    const res = await operateBotsDeleteRoute(deleteReq(""));
    expect(res.status).toBe(400);
    expect(client.deleteUserBot).not.toHaveBeenCalled();
  });

  it("deletes a bot for an owned source", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([{ id: 42, apps: [] }]);
    client.deleteUserBot.mockResolvedValue(undefined);
    const res = await operateBotsDeleteRoute(deleteReq("?botId=b1"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(client.deleteUserBot).toHaveBeenCalledWith(
      expect.objectContaining({
        githubUserId: "gh-1",
        botId: "b1",
      }),
    );
  });
});

function usageReq(qs = "") {
  return new Request(`http://localhost:3000/api/bff/operate/usage${qs}`);
}
function observabilityReq() {
  return new Request("http://localhost:3000/api/bff/operate/observability");
}
function transactionsReq(qs = "") {
  return new Request(`http://localhost:3000/api/bff/operate/transactions${qs}`);
}
function logsReq(qs = "") {
  return new Request(`http://localhost:3000/api/bff/operate/logs${qs}`);
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

function emptyPayments() {
  return {
    available: true,
    scope: "recipient_bucket",
    summary: {
      accruedCredits: 0,
      accruedUsd: 0,
      settledCredits: 0,
      settledUsd: 0,
      outstandingCredits: 0,
      outstandingUsd: 0,
      pricedCalls: 0,
      settlements: 0,
    },
    resources: [],
    buckets: [],
    events: [],
  };
}

function sharedSettlementPayments(applicationId: number | null = null) {
  return {
    ...emptyPayments(),
    summary: {
      ...emptyPayments().summary,
      settledCredits: 100,
      settledUsd: 1,
      settlements: 1,
    },
    buckets: [
      {
        id: "shared-bucket",
        recipient: "0xbeneficiary",
        outstandingCredits: 0,
        outstandingUsd: 0,
      },
    ],
    events: [
      {
        id: "settle:shared",
        kind: "settlement_confirmed",
        occurredAt: 1_700_000_000,
        application: applicationId == null ? null : `app-${applicationId}`,
        applicationId,
        tools: [],
        credits: 100,
        usd: 1,
        asset: "USDC",
        assetAmount: 1,
        recipient: "0xbeneficiary",
        paymentMethod: "coinbase",
        receiptId: "0xreceipt",
        chain: "eip155:84532",
        explorerUrl: "https://sepolia.basescan.org/tx/0xreceipt",
      },
    ],
  };
}

describe("operateUsageRoute statement fallback", () => {
  it("uses an allowed partner platform for ownership and usage reads", async () => {
    vi.stubEnv("APP_DEPLOY_PLATFORMS", "community,somm.finance");
    setSession({ githubUserId: "gh-1" });
    oneSource();
    client.getUserSourceUsage.mockResolvedValue({
      ...emptyUsage,
      platform: "somm.finance",
    });
    client.getUserSourceStatement.mockRejectedValue(new Error("404"));

    const res = await operateUsageRoute(
      usageReq("?appSourceId=900&platform=somm.finance"),
    );

    expect(res.status).toBe(200);
    expect(client.listUserSources).toHaveBeenCalledWith({
      githubUserId: "gh-1",
      platform: "somm.finance",
    });
    expect(client.getUserSourceUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        appSourceId: 900,
        githubUserId: "gh-1",
        platform: "somm.finance",
      }),
    );
    expect(client.getUserSourceStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        appSourceId: 900,
        githubUserId: "gh-1",
        platform: "somm.finance",
      }),
    );
  });

  it("rejects a platform outside the configured allowlist", async () => {
    vi.stubEnv("APP_DEPLOY_PLATFORMS", "community,somm.finance");
    setSession({ githubUserId: "gh-1" });

    const res = await operateUsageRoute(
      usageReq("?appSourceId=900&platform=attacker.example"),
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "missing or invalid `platform`",
    });
    expect(client.listUserSources).not.toHaveBeenCalled();
  });

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
      payments: emptyPayments(),
    });

    const res = await operateUsageRoute(usageReq());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.example).toBeUndefined();
    expect(body.statement.summary.net).toBeCloseTo(6.1, 2);
    expect(body.statement.revenue[0].application).toBe("real-bot");
  });

  it("deduplicates a recipient-bucket settlement shared by two sources", async () => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([
      { id: 900, repositoryLink: "o/one", apps: [] },
      { id: 901, repositoryLink: "o/two", apps: [] },
    ]);
    client.getUserSourceUsage.mockImplementation(({ appSourceId }) =>
      Promise.resolve({
        ...emptyUsage,
        source: { id: appSourceId },
      }),
    );
    const payment = sharedSettlementPayments();
    payment.buckets[0].outstandingCredits = 25;
    client.getUserSourceStatement.mockImplementation(({ appSourceId }) =>
      Promise.resolve({
        source: { id: appSourceId },
        platform: "community",
        range: { fromDate: "2026-07-01", toDate: "2026-07-15" },
        available: true,
        summary: {
          grossRevenue: 0,
          platformFees: 0,
          serviceCharges: 0,
          net: 0,
        },
        revenue: [],
        charges: [],
        entries: [],
        payments: payment,
      }),
    );

    const res = await operateUsageRoute(usageReq());
    const body = await res.json();

    expect(body.statement.payments.summary.settledCredits).toBe(100);
    expect(body.statement.payments.summary.settlements).toBe(1);
    expect(body.statement.payments.summary.outstandingCredits).toBe(25);
    expect(body.statement.payments.summary.outstandingUsd).toBe(0.25);
    expect(body.statement.payments.events).toHaveLength(1);
    expect(body.statement.payments.buckets).toHaveLength(1);
  });
});

describe("partner settlement aggregation", () => {
  beforeEach(() => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([
      { id: 900, repositoryLink: "o/one", apps: [] },
      { id: 901, repositoryLink: "o/two", apps: [] },
    ]);
  });

  it("renders one recipient-bucket payout across affected projects", async () => {
    client.listUserSourceTransactions.mockImplementation(({ appSourceId }) =>
      Promise.resolve({
        source: { id: appSourceId },
        platform: "community",
        transactions: [],
        nextCursor: null,
      }),
    );
    client.getUserSourceStatement.mockImplementation(({ appSourceId }) =>
      Promise.resolve({
        source: { id: appSourceId },
        platform: "community",
        range: { fromDate: "2026-07-01", toDate: "2026-07-15" },
        available: true,
        summary: {
          grossRevenue: 0,
          platformFees: 0,
          serviceCharges: 0,
          net: 0,
        },
        revenue: [],
        charges: [],
        entries: [],
        payments: sharedSettlementPayments(appSourceId),
      }),
    );

    const body = await (
      await operateTransactionsRoute(transactionsReq())
    ).json();

    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0]).toMatchObject({
      id: "partner-payout:settle:shared",
      application: "Partner payout",
      description: "Partner settlement via Coinbase",
      fromLabel: null,
      method: "Coinbase x402",
      transfers: [],
    });
  });

  it("pages app transactions independently of the payout overlay", async () => {
    oneSource();
    const transactions = [
      { id: "tx:1", application: "demo", createdAt: 1_700_000_008 },
      { id: "tx:2", application: "demo", createdAt: 1_700_000_007 },
      { id: "tx:3", application: "demo", createdAt: 1_700_000_006 },
    ];
    client.listUserSourceTransactions.mockImplementation(({ cursor }) =>
      Promise.resolve({
        source: { id: 900 },
        platform: "community",
        transactions: cursor ? transactions.slice(2) : transactions.slice(0, 2),
        nextCursor: cursor ? null : { createdAt: 1_700_000_007, id: "tx:2" },
      }),
    );
    const payments = sharedSettlementPayments(42);
    payments.events = [1, 2].map((id) => ({
      ...payments.events[0],
      id: `settle:${id}`,
      occurredAt: 1_700_000_011 - id,
    }));
    client.getUserSourceStatement.mockResolvedValue({
      source: { id: 900 },
      platform: "community",
      payments,
    });

    const first = await (
      await operateTransactionsRoute(transactionsReq("?limit=2"))
    ).json();
    const second = await (
      await operateTransactionsRoute(
        transactionsReq(
          `?limit=2&cursor=${encodeURIComponent(JSON.stringify(first.nextCursor))}`,
        ),
      )
    ).json();

    expect(
      first.transactions.map((transaction: { id: string }) => transaction.id),
    ).toEqual([
      "partner-payout:settle:1",
      "partner-payout:settle:2",
      "tx:1",
      "tx:2",
    ]);
    expect(first.nextCursor).toEqual({
      perSource: { "900": { createdAt: 1_700_000_007, id: "tx:2" } },
    });
    expect(
      second.transactions.map((transaction: { id: string }) => transaction.id),
    ).toEqual(["tx:3"]);
    expect(second.nextCursor).toBeNull();
    expect(client.listUserSourceTransactions).toHaveBeenLastCalledWith(
      expect.objectContaining({
        cursor: { createdAt: 1_700_000_007, id: "tx:2" },
      }),
    );
    expect(client.getUserSourceStatement).toHaveBeenCalledTimes(1);
  });

  it("deduplicates settlement logs and advances every source cursor", async () => {
    client.listUserSourceLogs.mockImplementation(({ appSourceId }) =>
      Promise.resolve({
        source: { id: appSourceId },
        platform: "community",
        logs: [
          {
            occurredAt: 1_700_000_000,
            eventType: "usage",
            id: "settle:shared",
            application: "partner-settlement",
            applicationId: null,
            summary: "Partner settlement confirmed · 100 credits",
            details: { source: "partner_settlement" },
            kind: "event",
            status: "info",
            tool: null,
            durationMs: null,
            retries: null,
            threadId: null,
            args: null,
            result: null,
          },
        ],
        nextCursor: {
          occurredAt: 1_699_999_999,
          eventType: "usage",
          id: "old",
        },
      }),
    );

    const body = await (await operateLogsRoute(logsReq("?limit=1"))).json();

    expect(body.logs).toHaveLength(1);
    expect(body.nextCursor.perSource).toEqual({
      "900": {
        occurredAt: 1_700_000_000,
        eventType: "usage",
        id: "settle:shared",
      },
      "901": {
        occurredAt: 1_700_000_000,
        eventType: "usage",
        id: "settle:shared",
      },
    });
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
      payments: emptyPayments(),
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
      payments: emptyPayments(),
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
      payments: emptyPayments(),
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

describe("per-source fan-out is bounded", () => {
  const SOURCE_COUNT = 40;

  beforeEach(() => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue(
      Array.from({ length: SOURCE_COUNT }, (_, index) => ({
        id: 900 + index,
        repositoryLink: `o/r${index}`,
        apps: [],
      })),
    );
  });

  // A 111-source account fired 222 reads at once and saturated the manager's
  // connection pool, so the page hung on "Loading" for minutes.
  it("caps concurrent reads instead of firing one per source at once", async () => {
    let inFlight = 0;
    let peak = 0;
    const track = <T>(value: T) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      return new Promise<T>((resolve) =>
        setTimeout(() => {
          inFlight -= 1;
          resolve(value);
        }, 1),
      );
    };
    client.listUserSourceTransactions.mockImplementation(({ appSourceId }) =>
      track({
        source: { id: appSourceId },
        platform: "community",
        transactions: [],
        nextCursor: null,
      }),
    );
    client.getUserSourceStatement.mockImplementation(({ appSourceId }) =>
      track({
        source: { id: appSourceId },
        platform: "community",
        payments: emptyPayments(),
      }),
    );

    const res = await operateTransactionsRoute(transactionsReq());

    expect(res.status).toBe(200);
    expect(client.listUserSourceTransactions).toHaveBeenCalledTimes(
      SOURCE_COUNT,
    );
    // Two independent fan-outs (transactions + statement) run concurrently, so
    // the ceiling is two slots' worth — not 2 × SOURCE_COUNT.
    expect(peak).toBeLessThanOrEqual(12);
  });

  it("drops a wedged source instead of stalling the whole page", async () => {
    vi.useFakeTimers();
    try {
      client.listUserSourceTransactions.mockImplementation(({ appSourceId }) =>
        appSourceId === 901
          ? new Promise(() => {})
          : Promise.resolve({
              source: { id: appSourceId },
              platform: "community",
              transactions: [
                { id: `tx:${appSourceId}`, createdAt: 1_700_000_000 },
              ],
              nextCursor: null,
            }),
      );
      client.getUserSourceStatement.mockImplementation(({ appSourceId }) =>
        Promise.resolve({
          source: { id: appSourceId },
          platform: "community",
          payments: emptyPayments(),
        }),
      );

      const pending = operateTransactionsRoute(transactionsReq());
      await vi.advanceTimersByTimeAsync(30_000);
      const body = await (await pending).json();

      expect(body.transactions).toHaveLength(SOURCE_COUNT - 1);
      expect(
        body.transactions.some(
          (transaction: { id: string }) => transaction.id === "tx:901",
        ),
      ).toBe(false);
      expect(telemetry.capture).toHaveBeenCalledOnce();
      expect(telemetry.capture.mock.calls[0]?.[1]).toEqual({
        routeFamily: "/api/bff/operate",
        operation: "operate.transactions_source",
        method: "GET",
        status: 502,
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("degraded reporting", () => {
  beforeEach(() => {
    setSession({ githubUserId: "gh-1" });
    client.listUserSources.mockResolvedValue([
      { id: 900, repositoryLink: "o/one", apps: [] },
      { id: 901, repositoryLink: "o/two", apps: [] },
      { id: 902, repositoryLink: "o/three", apps: [] },
    ]);
  });

  const okTransactions = ({ appSourceId }: { appSourceId: number }) =>
    Promise.resolve({
      source: { id: appSourceId },
      platform: "community",
      transactions: [],
      nextCursor: null,
    });
  const okStatement = ({ appSourceId }: { appSourceId: number }) =>
    Promise.resolve({
      source: { id: appSourceId },
      platform: "community",
      payments: emptyPayments(),
    });

  it("omits the key entirely when every source was read", async () => {
    client.listUserSourceTransactions.mockImplementation(okTransactions);
    client.getUserSourceStatement.mockImplementation(okStatement);

    const body = await (
      await operateTransactionsRoute(transactionsReq())
    ).json();

    expect(body).not.toHaveProperty("degraded");
  });

  it("counts a source that failed both fan-outs once", async () => {
    client.listUserSourceTransactions.mockImplementation((args) =>
      args.appSourceId === 901
        ? Promise.reject(new Error("boom"))
        : okTransactions(args),
    );
    client.getUserSourceStatement.mockImplementation((args) =>
      args.appSourceId === 901
        ? Promise.reject(new Error("boom"))
        : okStatement(args),
    );

    const body = await (
      await operateTransactionsRoute(transactionsReq())
    ).json();

    expect(body.degraded).toEqual({ dropped: 1, total: 3 });
    expect(telemetry.capture).toHaveBeenCalledTimes(2);
    expect(telemetry.log).not.toHaveBeenCalled();
  });

  it("still lists a dropped source so the user can retry it alone", async () => {
    client.listUserSourceTransactions.mockImplementation((args) =>
      args.appSourceId === 901
        ? Promise.reject(new Error("boom"))
        : okTransactions(args),
    );
    client.getUserSourceStatement.mockImplementation(okStatement);

    const body = await (
      await operateTransactionsRoute(transactionsReq())
    ).json();

    expect(body.sources.map((source: { id: number }) => source.id)).toEqual([
      900, 901, 902,
    ]);
    expect(telemetry.capture).toHaveBeenCalledOnce();
  });

  it("logs a partial Rust 5xx without creating a BFF Issue", async () => {
    client.listUserSourceTransactions.mockImplementation((args) =>
      args.appSourceId === 901
        ? Promise.reject(
            new BackendError(
              "transactions",
              503,
              "failed",
              "private backend body",
            ),
          )
        : okTransactions(args),
    );
    client.getUserSourceStatement.mockImplementation(okStatement);

    const body = await (
      await operateTransactionsRoute(transactionsReq())
    ).json();

    expect(body.degraded).toEqual({ dropped: 1, total: 3 });
    expect(telemetry.capture).not.toHaveBeenCalled();
    expect(telemetry.log).toHaveBeenCalledOnce();
    expect(telemetry.log).toHaveBeenCalledWith({
      routeFamily: "/api/bff/operate",
      operation: "operate.transactions_source",
      method: "GET",
      status: 503,
      upstream: "rust",
      upstreamStatus: 503,
    });
  });
});

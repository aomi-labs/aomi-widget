// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeploymentClient } from "../src/client";
import {
  BackendError,
  BrowserEnvironmentError,
  DeployError,
} from "../src/errors";
import type { AuditEvent } from "../src/types";

function client(onAudit?: (event: AuditEvent) => void) {
  return new DeploymentClient({
    aomi: {
      backendUrl: "https://staging-api.example.com/",
      activationToken: "act-token",
    },
    onAudit,
  });
}

describe("DeploymentClient deploy/preflight", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () =>
      Response.json({
        ok: true,
        deployment: {
          id: "dep_123_abc1234",
          status: "preflight",
          source: {
            installation_id: 123,
            repository_id: 987,
            repository_link: "https://github.com/alice/demo.git",
            owner_repo_name: "alice/demo",
            ref: "abc1234def5678",
            commit_hash: "abc1234def5678",
            aomi_toml_paths: ["aomi.toml"],
          },
          platform: {
            platform: "community",
            repository: "aomi-labs/community-apps",
            deploy_branch: "main",
            source_branch: "alice/demo/123/abc1234def56",
            commit_hash: null,
            pr_number: null,
            pr_url: null,
            ci_status: null,
            ci_url: null,
            apps: [
              {
                name: "demo",
                path: "apps/123/demo",
                aomi_toml_path: "aomi.toml",
                release_tag: "apps-123-demo-abc1234def56",
                target: "x86_64-unknown-linux-gnu",
                files: [
                  {
                    path: "apps/123/demo/aomi.toml",
                    sha256: "00aa",
                    bytes: 512,
                  },
                ],
              },
            ],
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("POSTs a preflight request and maps the deployment.json response to camelCase", async () => {
    const audits: AuditEvent[] = [];
    const result = await client((event) => audits.push(event)).preflight({
      platform: "community",
      appSourceId: 42,
      sourceRef: "ABC1234DEF5678",
      aomiTomlPaths: ["aomi.toml"],
      actor: "alice",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://staging-api.example.com/api/platforms/community/deploy",
    );
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer act-token",
      "Content-Type": "application/json",
    });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      app_source_id: 42,
      source_ref: "abc1234def5678",
      aomi_toml_paths: ["aomi.toml"],
      preflight: true,
    });

    expect(result.deployment.source.installationId).toBe(123);
    expect(result.deployment.source.ref).toBe("abc1234def5678");
    expect(result.deployment.platform.apps[0]).toMatchObject({
      aomiTomlPath: "aomi.toml",
      releaseTag: "apps-123-demo-abc1234def56",
      target: "x86_64-unknown-linux-gnu",
      files: [{ path: "apps/123/demo/aomi.toml", sha256: "00aa", bytes: 512 }],
    });
    expect(audits).toEqual([
      expect.objectContaining({
        action: "preflight",
        platform: "community",
        appSourceId: 42,
        actor: "alice",
      }),
    ]);
  });

  it("POSTs an apply deploy request without the preflight flag", async () => {
    const result = await client().deploy({
      platform: "community",
      appSourceId: 42,
      sourceRef: "abc1234def5678",
    });

    expect(result.deployment.id).toBe("dep_123_abc1234");
    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      app_source_id: 42,
      source_ref: "abc1234def5678",
      aomi_toml_paths: [],
    });
  });

  it("rejects invalid deploy input before calling the backend", async () => {
    await expect(
      client().deploy({
        platform: "community",
        appSourceId: 0,
        sourceRef: "abc1234",
        aomiTomlPaths: ["aomi.toml"],
      }),
    ).rejects.toBeInstanceOf(DeployError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects branch-like source refs before calling the backend", async () => {
    await expect(
      client().deploy({
        platform: "community",
        appSourceId: 42,
        sourceRef: "main",
        aomiTomlPaths: ["aomi.toml"],
      }),
    ).rejects.toThrow(/git commit SHA/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("DeploymentClient.activate", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () =>
      Response.json({
        ok: false,
        activation: {
          status: "partial_failed",
          platform: "community",
          target: {
            kind: "release_tags",
            value: [
              "apps-123-demo-abc1234def56",
              "apps-123-broken-abc1234def56",
            ],
            platform_repo: "aomi-labs/community-apps",
            platform_branch: "publish",
            platform_commit_hash: "ff00aa",
            ci_status: "passed",
            ci_url:
              "https://github.com/aomi-labs/community-apps/actions/runs/1",
            promoted: [],
          },
          apps: [
            {
              name: "demo",
              path: "apps/123/demo",
              release_tag: "apps-123-demo-abc1234def56",
              is_active: true,
              loaded: true,
            },
            {
              name: "broken",
              path: "apps/123/broken",
              release_tag: "apps-123-broken-abc1234def56",
              is_active: false,
              loaded: false,
              error: "release artifact not found",
            },
          ],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("POSTs one release-tags activation request and maps partial failures", async () => {
    const promise = client().activate({
      platform: "community",
      target: {
        kind: "release_tags",
        value: ["apps-123-demo-abc1234def56", "apps-123-broken-abc1234def56"],
      },
      apps: ["demo", "broken"],
      targetTags: ["staging"],
    });

    await expect(promise).rejects.toThrow(DeployError);
    await expect(promise).rejects.toMatchObject({
      code: "ACTIVATION",
      reason: [{ app: "broken", error: "release artifact not found" }],
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://staging-api.example.com/api/platforms/community/apps/activate",
    );
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      target: {
        kind: "release_tags",
        value: ["apps-123-demo-abc1234def56", "apps-123-broken-abc1234def56"],
      },
      apps: ["demo", "broken"],
      target_tags: ["staging"],
    });
  });

  it("rejects empty release tag targets before calling the backend", async () => {
    await expect(
      client().activate({
        platform: "community",
        target: { kind: "release_tags", value: [] },
        apps: ["demo"],
      }),
    ).rejects.toThrow(/target.value/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched app and release tag counts before calling the backend", async () => {
    await expect(
      client().activate({
        platform: "community",
        target: { kind: "release_tags", value: ["apps-123-demo-abc1234def56"] },
        apps: ["demo", "other"],
      }),
    ).rejects.toThrow(/same number/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-release-tag activation targets before calling the backend", async () => {
    await expect(
      client().activate({
        platform: "community",
        target: {
          kind: "unsupported",
          value: "not-a-release-tag-target",
        } as any,
        apps: ["demo"],
      }),
    ).rejects.toThrow(/release_tag/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows release_tags activation without app names and maps promotions", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        ok: true,
        activation: {
          status: "activated",
          platform: "community",
          target: {
            kind: "release_tags",
            value: ["apps-123-demo-abc1234def56"],
            platform_repo: "aomi-labs/community-apps",
            platform_branch: "publish",
            promoted: [
              {
                name: "demo",
                release_tag: "apps-123-demo-abc1234def56",
                source_branch: "alice/demo/123/abc1234def56",
                activated_commit_hash: "ff00aa",
                live_commit_hash: "ff00bb",
                ci_status: "passed",
                ci_url:
                  "https://github.com/aomi-labs/community-apps/actions/runs/1",
                release_assets: [
                  "aomi-plugins-apps-123-demo-abc1234def56-x86_64-unknown-linux-gnu.tar.gz",
                  "manifest.json",
                  "aomi-release.json",
                ],
              },
            ],
          },
          apps: [
            {
              name: "demo",
              path: "apps/123/demo",
              release_tag: "apps-123-demo-abc1234def56",
              is_active: true,
              loaded: true,
              activation_pr: {
                html_url: "https://github.com/aomi-labs/community-apps/pull/10",
              },
              activation_pr_close_error: null,
            },
          ],
        },
      }),
    );

    const result = await client().activate({
      platform: "community",
      target: {
        kind: "release_tags",
        value: ["apps-123-demo-abc1234def56"],
      },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      target: {
        kind: "release_tags",
        value: ["apps-123-demo-abc1234def56"],
      },
    });
    expect(result.activation.target.promoted[0]).toMatchObject({
      name: "demo",
      releaseTag: "apps-123-demo-abc1234def56",
      sourceBranch: "alice/demo/123/abc1234def56",
      platformCommitHash: "ff00aa",
      liveCommitHash: "ff00bb",
      ciStatus: "passed",
      releaseAssets: [
        "aomi-plugins-apps-123-demo-abc1234def56-x86_64-unknown-linux-gnu.tar.gz",
        "manifest.json",
        "aomi-release.json",
      ],
    });
    expect(result.activation.apps[0]).toMatchObject({
      activationPr: {
        html_url: "https://github.com/aomi-labs/community-apps/pull/10",
      },
      activationPrCloseError: null,
    });
  });

  it("throws BackendError on non-2xx responses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("ci not passed", { status: 409 }),
    );
    await expect(
      client().activate({
        platform: "community",
        target: {
          kind: "release_tags",
          value: ["apps-123-demo-abc1234def56"],
        },
        apps: ["demo"],
      }),
    ).rejects.toMatchObject({
      name: "ActivationError",
      status: 409,
      body: "ci not passed",
    });
  });
});

describe("DeploymentClient operate observability", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () =>
      Response.json({
        source: {
          id: 42,
          installation_id: 123,
          repository_id: 987,
          repository_link: "https://github.com/alice/demo.git",
          github_account: "alice",
        },
        platform: "community",
        scope: "owned_applications",
        monitoring: {
          provider: "grafana_prometheus",
          status: "ok",
          window_seconds: 300,
        },
        apps: [
          {
            application_id: 77,
            application: "demo",
            active: true,
            loaded: true,
            release_tag: "apps-123-demo-abc1234def56",
            sdk_version: "3.0.2",
            status: "healthy",
            metrics: {
              provider: "grafana_prometheus",
              window_seconds: 300,
              available: true,
              requests_per_minute: 42,
              error_rate: 0.025,
              p95_latency_ms: 1234,
              inflight_requests: 3,
            },
          },
        ],
        dashboard_links: [
          {
            label: "Operate dashboard",
            url: "https://grafana.example.com/d/app",
            scope: "owned_applications",
          },
        ],
        platform_metrics: [
          {
            label: "DB pool waiting",
            value: 0,
            unit: "connections",
            scope: "platform",
            description: "Shared DB pressure.",
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("maps snake_case Grafana metrics into app observability fields", async () => {
    const result = await client().getUserSourceObservability({
      githubUserId: "4738254",
      platform: "community",
      appSourceId: 42,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://staging-api.example.com/api/integrations/github-app/user/sources/42/observability?github_user_id=4738254&platform=community",
    );
    expect(result.monitoring).toEqual({
      provider: "grafana_prometheus",
      status: "ok",
      windowSeconds: 300,
    });
    expect(result.apps[0].metrics).toEqual({
      provider: "grafana_prometheus",
      windowSeconds: 300,
      available: true,
      requestsPerMinute: 42,
      errorRate: 0.025,
      p95LatencyMs: 1234,
      inflightRequests: 3,
      // Legacy payload: the 24h trend contract stays null.
      trendWindowSeconds: null,
      chats24h: null,
      toolCalls24h: null,
      transactions24h: null,
      chatsHourly: null,
      toolCallsHourly: null,
      transactionsHourly: null,
      toolErrorRate: null,
      txErrorRate: null,
      coldStartMs: null,
      dylibBytes: null,
    });
    expect(result.platformMetrics[0]).toEqual({
      label: "DB pool waiting",
      value: 0,
      unit: "connections",
      scope: "platform",
      description: "Shared DB pressure.",
    });
  });

  it("maps the 24h trend contract when the manager emits it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          monitoring: {
            provider: "grafana_prometheus",
            status: "ok",
            window_seconds: 900,
          },
          apps: [
            {
              application_id: 77,
              application: "demo",
              active: true,
              loaded: true,
              status: "healthy",
              metrics: {
                provider: "grafana_prometheus",
                window_seconds: 900,
                available: true,
                trend_window_seconds: 86400,
                chats_24h: 47,
                tool_calls_24h: 130,
                transactions_24h: 12,
                chats_hourly: [0, 3, "5"],
                tool_calls_hourly: [1, 2],
                transactions_hourly: [],
                tool_error_rate: 0.12,
                tx_error_rate: 0,
                cold_start_ms: 1250,
                dylib_bytes: 4718592,
              },
            },
          ],
        }),
      ),
    );

    const result = await client().getUserSourceObservability({
      githubUserId: "4738254",
      platform: "community",
      appSourceId: 42,
    });
    expect(result.apps[0].metrics).toMatchObject({
      trendWindowSeconds: 86400,
      chats24h: 47,
      toolCalls24h: 130,
      transactions24h: 12,
      chatsHourly: [0, 3, 5],
      toolCallsHourly: [1, 2],
      transactionsHourly: [],
      toolErrorRate: 0.12,
      txErrorRate: 0,
      coldStartMs: 1250,
      dylibBytes: 4718592,
    });
  });
});

describe("DeploymentClient operate app detail", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads and normalizes the owned app detail aggregate", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        source: { id: 42, repository_link: "https://github.com/alice/demo" },
        platform: "community",
        window_seconds: 86400,
        app: {
          application_id: 77,
          name: "demo",
          release_tag: "apps-42-demo-abc1234",
          sdk_version: "3.0.3",
          active: true,
          loaded: true,
          status: "healthy",
        },
        funnel: {
          chats_24h: 12,
          tool_calls_24h: 30,
          tx_proposed_24h: 4,
          tx_submitted_24h: 3,
          tx_confirmed_24h: 2,
          tx_reverted_24h: 1,
        },
        active_users_24h: 5,
        credits: {
          credits_24h: 8.5,
          credits_per_turn_24h: 0.71,
          credits_daily: [{ day: "2026-07-19", credits: 8.5 }],
        },
        tools: [
          {
            tool: "get_price",
            calls: 20,
            errors: 1,
            error_rate: 0.05,
            p95_ms: 310,
            last_error: {
              message: "upstream timeout",
              occurred_at: 1784500000,
            },
          },
        ],
        lifecycle: {
          cold_start_ms: 1250,
          dylib_bytes: 4718592,
          loads_24h: 2,
          evictions_24h: 1,
        },
        hourly: {
          chats: [0, 2, 3],
          tool_calls: [1, 4, 5],
          p95_latency_ms: [800, 1200, 950],
          transactions: [0, 1, 1],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await client().getUserSourceAppDetail({
      githubUserId: "4738254",
      platform: "community",
      appSourceId: 42,
      applicationId: 77,
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://staging-api.example.com/api/integrations/github-app/user/sources/42/apps/77/detail?github_user_id=4738254&platform=community",
    );
    expect(result).toMatchObject({
      windowSeconds: 86400,
      app: { applicationId: 77, name: "demo", status: "healthy" },
      funnel: { chats24h: 12, txConfirmed24h: 2 },
      activeUsers24h: 5,
      credits: { credits24h: 8.5, creditsPerTurn24h: 0.71 },
      lifecycle: { coldStartMs: 1250, loads24h: 2 },
      hourly: {
        chats: [0, 2, 3],
        toolCalls: [1, 4, 5],
        p95LatencyMs: [800, 1200, 950],
      },
    });
    expect(result.tools[0]).toEqual({
      tool: "get_price",
      calls: 20,
      errors: 1,
      errorRate: 0.05,
      p95Ms: 310,
      lastError: {
        message: "upstream timeout",
        occurredAt: 1784500000,
      },
    });
  });
});

describe("DeploymentClient source SDK upgrade", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs the owned source request and normalizes the upgrade PR", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        status: "pull_request",
        required_sdk_version: "3.0.3",
        source_ref: "abc1234",
        branch: "aomi/sdk-3.0.3",
        files: ["Cargo.toml"],
        pull_request: {
          number: 7,
          url: "https://github.com/alice/demo/pull/7",
          created: true,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await client().upgradeUserSourceSdk({
      githubUserId: "4738254",
      platform: "community",
      appSourceId: 42,
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://staging-api.example.com/api/integrations/github-app/user/sources/42/sdk-upgrade?github_user_id=4738254&platform=community",
    );
    expect(result).toEqual({
      status: "pull_request",
      requiredSdkVersion: "3.0.3",
      sourceRef: "abc1234",
      branch: "aomi/sdk-3.0.3",
      files: ["Cargo.toml"],
      pullRequest: {
        number: 7,
        url: "https://github.com/alice/demo/pull/7",
        created: true,
      },
    });
  });

  it("GETs the cheap upgrade-status poll and normalizes a merged PR", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        status: "merged",
        required_sdk_version: "3.0.3",
        branch: "aomi/sdk-3.0.3",
        pull_request: {
          number: 7,
          url: "https://github.com/alice/demo/pull/7",
          state: "closed",
          merged: true,
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await client().sdkUpgradeStatus({
      githubUserId: "4738254",
      platform: "community",
      appSourceId: 42,
    });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://staging-api.example.com/api/integrations/github-app/user/sources/42/sdk-upgrade-status?github_user_id=4738254&platform=community",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "GET" });
    expect(result).toEqual({
      status: "merged",
      requiredSdkVersion: "3.0.3",
      branch: "aomi/sdk-3.0.3",
      pullRequest: {
        number: 7,
        url: "https://github.com/alice/demo/pull/7",
        state: "closed",
        merged: true,
      },
    });
  });

  it("normalizes a null pull_request to status none", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({
        status: "none",
        required_sdk_version: "3.0.3",
        branch: "aomi/sdk-3.0.3",
        pull_request: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await client().sdkUpgradeStatus({
      githubUserId: "4738254",
      platform: "community",
      appSourceId: 42,
    });

    expect(result).toEqual({
      status: "none",
      requiredSdkVersion: "3.0.3",
      branch: "aomi/sdk-3.0.3",
      pullRequest: null,
    });
  });
});

describe("DeploymentClient operate statement", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () =>
      Response.json({
        source: {
          id: 42,
          installation_id: 123,
          repository_id: 987,
          repository_link: "https://github.com/alice/demo.git",
          github_account: "alice",
        },
        platform: "community",
        range: { from_date: "2026-07-01", to_date: "2026-07-15" },
        available: true,
        summary: {
          gross_revenue: 20.0,
          platform_fees: 4.0,
          service_charges: 13.3,
          net: 2.7,
        },
        revenue: [
          {
            subject: "tool_invocation",
            application: "alpha",
            application_id: 7,
            events: 4,
            gross: 8.0,
            platform_fee: 0.8,
            net: 7.2,
          },
        ],
        charges: [
          {
            item: "hosting",
            application: "beta",
            application_id: 9,
            events: 1,
            amount: 10.0,
          },
        ],
        entries: [
          {
            day: "2026-07-02",
            application: "alpha",
            subject: "model",
            events: 3,
            gross: 3.3,
            platform_fee: 0.3,
            net: -3.3,
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("maps the statement wire (subjects, entries, USD floats) to camelCase", async () => {
    const result = await client().getUserSourceStatement({
      githubUserId: "4738254",
      platform: "community",
      appSourceId: 42,
      fromDate: "2026-07-01",
      toDate: "2026-07-15",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://staging-api.example.com/api/integrations/github-app/user/sources/42/statement?github_user_id=4738254&platform=community&from_date=2026-07-01&to_date=2026-07-15",
    );
    expect(result.range).toEqual({
      fromDate: "2026-07-01",
      toDate: "2026-07-15",
    });
    expect(result.available).toBe(true);
    expect(result.summary).toEqual({
      grossRevenue: 20.0,
      platformFees: 4.0,
      serviceCharges: 13.3,
      net: 2.7,
    });
    expect(result.revenue).toEqual([
      {
        subject: "tool_invocation",
        application: "alpha",
        applicationId: 7,
        events: 4,
        gross: 8.0,
        platformFee: 0.8,
        net: 7.2,
      },
    ]);
    expect(result.charges).toEqual([
      {
        item: "hosting",
        application: "beta",
        applicationId: 9,
        events: 1,
        amount: 10.0,
      },
    ]);
    expect(result.entries).toEqual([
      {
        day: "2026-07-02",
        application: "alpha",
        subject: "model",
        events: 3,
        gross: 3.3,
        platformFee: 0.3,
        net: -3.3,
      },
    ]);
  });

  it("degrades to an unavailable zeroed statement when the table is missing", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        source: {
          id: 42,
          installation_id: 123,
          repository_id: 987,
          repository_link: "x",
        },
        platform: "community",
        range: { from_date: "2026-07-01", to_date: "2026-07-15" },
        available: false,
        summary: {
          gross_revenue: 0.0,
          platform_fees: 0.0,
          service_charges: 0.0,
          net: 0.0,
        },
        revenue: [],
        charges: [],
        entries: [],
      }),
    );

    const result = await client().getUserSourceStatement({
      githubUserId: "4738254",
      platform: "community",
      appSourceId: 42,
    });
    expect(result.available).toBe(false);
    expect(result.summary.net).toBe(0);
    expect(result.revenue).toEqual([]);
  });
});

describe("server-only guard", () => {
  it("throws in a browser-like environment", () => {
    const g = globalThis as Record<string, unknown>;
    g.window = {};
    g.document = {};
    try {
      expect(() => client()).toThrow(BrowserEnvironmentError);
    } finally {
      delete g.window;
      delete g.document;
    }
  });
});

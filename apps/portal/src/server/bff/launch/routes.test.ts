// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  deploymentDeactivateRoute,
  deploymentRecordsRoute,
  deploymentPromoteRoute,
  activateLaunchRoute,
  launchAppRoute,
  launchDeployRoute,
  launchSdkStatusRoute,
  launchStatusRoute,
  redeployLaunchRoute,
} from "./routes";

vi.mock("@aomi-labs/account", () => ({
  portalService: () => ({
    mint: vi.fn(async () => ({
      accessToken: "service-token",
      expiresAt: Date.now() + 300_000,
    })),
  }),
}));

const getGitHubSession = vi.fn();
vi.mock("@portal/server/cookies/github", () => ({
  getGitHubSession: () => getGitHubSession(),
}));

function writeReq(body: unknown) {
  return new Request("http://localhost:3000/api/bff/launch/redeploy", {
    method: "POST",
    headers: {
      origin: "http://localhost:3000",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

/** The listUserSources response granting the signed-in user these source ids. */
function ownedSources(...ids: number[]) {
  return Response.json({
    sources: ids.map((id) => ({
      id,
      installation_id: 555,
      apps: [{ name: "my-bot" }],
    })),
  });
}

function sourceWithApps(id: number, apps: Array<Record<string, unknown>>) {
  return Response.json({
    sources: [
      {
        id,
        installation_id: 555,
        apps,
      },
    ],
  });
}

/** The DB promotion-records response for one app (the promote authz source). */
function appRecords(...deploymentIds: string[]) {
  return Response.json({
    app: "my-bot",
    current_release_tag: null,
    records: deploymentIds.map((deployment_id) => ({
      deployment_id,
      release_tag: `${deployment_id}-tag`,
      actor: null,
      created_at: 0,
      sdk_version: "3.0.1",
      current: false,
    })),
  });
}

/** Same shape as `appRecords`, but with an explicit release tag — used to
 *  derive the promote secret-gate's (app, releaseTag) pairs from the DB
 *  promotion records (the `sourceDeploymentPairs` call). */
function appRecordsWithTag(deploymentId: string, releaseTag: string) {
  return Response.json({
    app: "my-bot",
    current_release_tag: null,
    records: [
      {
        deployment_id: deploymentId,
        release_tag: releaseTag,
        actor: null,
        created_at: 0,
        sdk_version: "3.0.1",
        current: false,
      },
    ],
  });
}

function activationSource(id = 99) {
  return Response.json({
    sources: [
      {
        id,
        installation_id: 555,
        apps: [
          {
            name: "my-bot",
            app_release_tag: "apps-555-r1-my-bot-abc",
          },
        ],
      },
    ],
  });
}

function sourceDeployments() {
  return Response.json({
    deployments: [
      {
        deployment_id: "dep_1",
        release_tags: ["apps-555-r1-my-bot-abc"],
        apps: [{ name: "my-bot", release_tag: "apps-555-r1-my-bot-abc" }],
      },
    ],
  });
}

/** Like `activationSource`, but shaped like the real `listUserSources`
 *  response: `latest_deployment` is always null there (the backend is lazy
 *  for the list). Pair with `latestDeploymentResponse(platformRepo)` to stub
 *  the per-source detail endpoint the required-secrets check now reads. */
function activationSourceWithRepo(_platformRepo: string, id = 99) {
  return Response.json({
    sources: [
      {
        id,
        installation_id: 555,
        apps: [
          {
            name: "my-bot",
            app_release_tag: "apps-555-r1-my-bot-abc",
          },
        ],
        latest_deployment: null,
      },
    ],
  });
}

/** The `getUserSourceLatestDeployment` detail-endpoint response —
 *  the real source of `platformRepo` in production. */
function latestDeploymentResponse(platformRepo: string) {
  return Response.json({
    latest_deployment: {
      platform_repo: platformRepo,
      apps: [{ name: "my-bot", release_tag: "apps-555-r1-my-bot-abc" }],
    },
  });
}

describe("launchDeployRoute", () => {
  beforeEach(() => {
    getGitHubSession.mockResolvedValue({
      githubUserId: "42",
      githubLogin: "alice",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("rejects deploy without a GitHub session before any backend call", async () => {
    getGitHubSession.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const res = await POST(
      new Request("http://localhost:3000/api/bff/launch/deploy", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appSourceId: 123,
          sourceRef: "abc1234def5678",
        }),
      }),
    );

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects deploy of an app source the user does not own", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ownedSources(1, 2));
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const res = await POST(
      new Request("http://localhost:3000/api/bff/launch/deploy", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          appSourceId: 123,
          sourceRef: "abc1234def5678",
        }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain("app source not found");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/integrations/github-app/user/sources?github_user_id=42",
    );
  });

  it("propagates BackendError status codes (400-599)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ownedSources(123))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "deploy rejected" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/bff/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appSourceId: 123,
        sourceRef: "abc1234def5678",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "deploy rejected" });
  });

  it("preflight mints the source row by repo, then previews by app source id", async () => {
    getGitHubSession.mockResolvedValueOnce({
      githubUserId: "42",
      githubLogin: "alice",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          source: {
            id: 123,
            installation_id: 555,
            repository_link: "alice/bot",
            source_ref: "abc1234def5678",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          deployment: {
            id: "dep_555_rabc1234_deadbeef",
            source: { repository_link: "alice/bot" },
            platform: { apps: [] },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(true);
    const req = new Request("http://localhost:3000/api/bff/launch/preflight", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ installationId: "555", repo: "alice/bot" }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.repo).toBe("alice/bot");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:8080/api/platforms/community/sources/sync-installed",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          repo: "alice/bot",
          github_user_id: "42",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:8080/api/platforms/community/deploy",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"source_ref":"abc1234def5678"'),
      }),
    );
  });

  it("real deploy rejects a repo-only request without an app source id", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/bff/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ installationId: "555", repo: "alice/bot" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deploys directly by appSourceId when the source identity is already known", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ownedSources(777))
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          deployment: {
            id: "dep_999_rabc1234_deadbeef",
            source: {
              installation_id: 999,
              repository_link: "alice/bot",
            },
            platform: { apps: [] },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/bff/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appSourceId: 777,
        sourceRef: "abc1234def5678",
        installationId: "555",
        repo: "alice/bot",
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body).toMatchObject({
      repo: "alice/bot",
      appSourceId: 777,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:8080/api/platforms/community/deploy",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"source_ref":"abc1234def5678"'),
      }),
    );
  });

  it("rejects deploy requests when no source commit is supplied or resolved", async () => {
    vi.unstubAllEnvs();
    // The ownership lookup runs before commit resolution (authorize before
    // acting on the caller's behalf), so exactly one backend read happens.
    const fetchMock = vi.fn().mockResolvedValueOnce(ownedSources(777));
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/bff/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appSourceId: 777 }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("missing source commit");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/integrations/github-app/user/sources",
    );
  });

  it("rejects a request without appSourceId or repo before calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/bff/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ installationId: "555" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid repo before calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/bff/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ installationId: "555", repo: "not/a/repo" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 for non-BackendError exceptions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ownedSources(123))
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/bff/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appSourceId: 123,
        sourceRef: "abc1234def5678",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
  });
});

describe("launchSdkStatusRoute", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("prints the configured backend URL in the local SDK repair command", async () => {
    vi.stubEnv("BACKEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://api.example.test/");
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json({ server_tags: ["staging"], sdk_version: "3.0.2" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await launchSdkStatusRoute(
      new Request("https://build.example.test/api/bff/launch/sdk-status"),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sdkStatus.fixCommand).toBe(
      "aomi-build sdk fix --backend https://api.example.test",
    );
    expect(body.sdkStatus.fixCommand).not.toContain("build.example.test");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://api.example.test/api/platforms/server-tags",
    );
  });
});

describe("deploymentPromoteRoute", () => {
  const DEPLOYMENT = "dep_555_r0123abcdef_a5a81b6b8be1";

  function promoteReq(body: unknown) {
    return new Request("http://localhost:3000/api/bff/deployments/promote", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    getGitHubSession.mockResolvedValue({
      githubUserId: "42",
      githubLogin: "alice",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("rejects promote without a GitHub session before any backend call", async () => {
    getGitHubSession.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await deploymentPromoteRoute(
      promoteReq({ deploymentId: DEPLOYMENT, appSourceId: 99 }),
    );

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires appSourceId so the promote target can be authorized", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await deploymentPromoteRoute(
      promoteReq({ deploymentId: DEPLOYMENT }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("appSourceId");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects promote of an app source the user does not own", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ownedSources(1, 2));
    vi.stubGlobal("fetch", fetchMock);

    const res = await deploymentPromoteRoute(
      promoteReq({ deploymentId: DEPLOYMENT, appSourceId: 99 }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain("app source not found");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a deployment absent from the source's DB records", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ownedSources(99))
      .mockResolvedValueOnce(appRecords("dep_555_r0123abcdef_other001"));
    vi.stubGlobal("fetch", fetchMock);

    const res = await deploymentPromoteRoute(
      promoteReq({ deploymentId: DEPLOYMENT, appSourceId: 99 }),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toContain("deployment does not belong");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    // The records lookup is DB, not the GitHub history fanout.
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/apps/my-bot/records",
    );
  });

  it("promotes an owned deployment and attributes the GitHub login", async () => {
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ownedSources(99))
      .mockResolvedValueOnce(appRecords(DEPLOYMENT))
      // sourceDeploymentPairs re-reads the same DB records to derive the
      // secret-gate pairs.
      .mockResolvedValueOnce(appRecords(DEPLOYMENT))
      .mockResolvedValueOnce(latestDeploymentResponse("aomi-labs/community"))
      .mockResolvedValueOnce(Response.json({ by_app: {} }))
      .mockResolvedValueOnce(Response.json({ assets: [] }))
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          activation: {
            status: "activating",
            apps: [{ name: "my-bot", release_tag: "apps-555-tag" }],
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await deploymentPromoteRoute(
      promoteReq({ deploymentId: DEPLOYMENT, appSourceId: 99 }),
    );
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body.ok).toBe(true);
    expect(body.promote.deploymentId).toBe(DEPLOYMENT);
    const [promoteUrl, promoteInit] = fetchMock.mock.calls[6];
    expect(String(promoteUrl)).toContain(`/deployments/${DEPLOYMENT}/promote`);
    expect(String(promoteInit?.body)).toContain('"actor":"alice"');
  });

  it("409s a promote when a required secret is unfilled", async () => {
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        activationSourceWithRepo("aomi-labs/my-bot-app", 99),
      )
      .mockResolvedValueOnce(appRecords(DEPLOYMENT))
      .mockResolvedValueOnce(
        appRecordsWithTag(DEPLOYMENT, "apps-555-r1-my-bot-abc"),
      )
      // missingSecretsForActivation resolves platformRepo via the per-source
      // detail endpoint since latestDeployment is null on the list response.
      .mockResolvedValueOnce(latestDeploymentResponse("aomi-labs/my-bot-app"))
      .mockResolvedValueOnce(
        Response.json({
          by_app: { "my-bot": ["$SECRET:APP:my-bot::MY_BOT_API_KEY"] },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          assets: [
            { name: "manifest.json", url: "https://api.github.com/asset/1" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          plugins: {
            "my-bot": {
              file: "libmybot.dylib",
              sha256: "x",
              secrets: [
                { name: "MY_BOT_API_KEY", description: "d", required: true },
                {
                  name: "MY_BOT_SECRET_KEY",
                  description: "d",
                  required: true,
                },
              ],
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await deploymentPromoteRoute(
      promoteReq({ deploymentId: DEPLOYMENT, appSourceId: 99 }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "missing required secrets",
      missing: { "my-bot": ["MY_BOT_SECRET_KEY"] },
    });
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it("promotes when required secrets are filled", async () => {
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        activationSourceWithRepo("aomi-labs/my-bot-app", 99),
      )
      .mockResolvedValueOnce(appRecords(DEPLOYMENT))
      .mockResolvedValueOnce(
        appRecordsWithTag(DEPLOYMENT, "apps-555-r1-my-bot-abc"),
      )
      .mockResolvedValueOnce(latestDeploymentResponse("aomi-labs/my-bot-app"))
      .mockResolvedValueOnce(
        Response.json({
          by_app: {
            "my-bot": [
              "$SECRET:APP:my-bot::MY_BOT_API_KEY",
              "$SECRET:APP:my-bot::MY_BOT_SECRET_KEY",
            ],
          },
        }),
      )
      .mockResolvedValueOnce(Response.json({ assets: [] }))
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          activation: { status: "activating", apps: [] },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await deploymentPromoteRoute(
      promoteReq({ deploymentId: DEPLOYMENT, appSourceId: 99 }),
    );
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });

  it("gates promote by the authorized DB records, not a size-limited deployments listing (regression)", async () => {
    // Regression for the bypass where the secret gate derived its pairs from
    // listUserSourceDeployments (limit: 100) — a different, size-limited
    // source than the ownership check (listDeploymentRecords, no limit). A
    // deployment authorized via the records but absent from that limited
    // listing yielded empty pairs and silently skipped the 409. This
    // deployment IS authorized (present in the records used for ownership,
    // same as `known`), so it must now fail closed on its unfilled required
    // secret — and promote must never be called. Note there is no
    // listUserSourceDeployments stub anywhere here: the fixed route never
    // calls it for promote.
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        activationSourceWithRepo("aomi-labs/my-bot-app", 99),
      )
      .mockResolvedValueOnce(
        appRecordsWithTag(DEPLOYMENT, "apps-555-r1-my-bot-abc"),
      )
      .mockResolvedValueOnce(
        appRecordsWithTag(DEPLOYMENT, "apps-555-r1-my-bot-abc"),
      )
      .mockResolvedValueOnce(latestDeploymentResponse("aomi-labs/my-bot-app"))
      .mockResolvedValueOnce(Response.json({ by_app: {} }))
      .mockResolvedValueOnce(
        Response.json({
          assets: [
            { name: "manifest.json", url: "https://api.github.com/asset/1" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          plugins: {
            "my-bot": {
              file: "libmybot.dylib",
              sha256: "x",
              secrets: [
                { name: "MY_BOT_API_KEY", description: "d", required: true },
              ],
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await deploymentPromoteRoute(
      promoteReq({ deploymentId: DEPLOYMENT, appSourceId: 99 }),
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "missing required secrets",
      missing: { "my-bot": ["MY_BOT_API_KEY"] },
    });
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes("/promote")),
    ).toBe(false);
  });
});

describe("redeployLaunchRoute", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("reruns the latest deployment through the backend rerun endpoint", async () => {
    getGitHubSession.mockResolvedValueOnce({
      githubUserId: "42",
      githubLogin: "alice",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          latest_deployment: {
            deployment_id: "dep_1",
            platform_repo: "aomi-labs/community-apps",
            ci_run_id: "123456",
            ci_url:
              "https://github.com/aomi-labs/community-apps/actions/runs/123456",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ok: true,
          deployment_id: "dep_1",
          commit_hash: "8819f32c4399ae75514b1f0605fef8cca75303bf",
          run_id: 123456,
          ci_url:
            "https://github.com/aomi-labs/community-apps/actions/runs/123456",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await redeployLaunchRoute(writeReq({ appSourceId: 99 }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      appSourceId: 99,
      platformRepo: "aomi-labs/community-apps",
      ciRunId: "123456",
    });
    // The rerun call goes to the Aomi backend, never to api.github.com.
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/api/platforms/community/deployments/dep_1/rerun?github_user_id=42",
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST" });
  });

  it("refuses redeploy when the source has no backend-owned deployment yet", async () => {
    getGitHubSession.mockResolvedValueOnce({
      githubUserId: "42",
      githubLogin: "alice",
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json({
        latest_deployment: null,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await redeployLaunchRoute(writeReq({ appSourceId: 99 }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("No backend-owned deployment");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("propagates a backend rerun rejection instead of masking it", async () => {
    getGitHubSession.mockResolvedValueOnce({
      githubUserId: "42",
      githubLogin: "alice",
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          latest_deployment: {
            deployment_id: "dep_1",
            platform_repo: "aomi-labs/community-apps",
            ci_run_id: "123456",
            ci_url:
              "https://github.com/aomi-labs/community-apps/actions/runs/123456",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            error:
              "deployment `dep_1` has no rerunnable GitHub Actions run for commit `8819f32c` yet",
          },
          { status: 409 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await redeployLaunchRoute(writeReq({ appSourceId: 99 }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("no rerunnable GitHub Actions run");
  });
});

describe("deploymentDeactivateRoute", () => {
  function deactReq(body: unknown) {
    return new Request("http://localhost:3000/api/bff/deployments/deactivate", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    getGitHubSession.mockResolvedValue({
      githubUserId: "42",
      githubLogin: "alice",
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("rejects without a session", async () => {
    getGitHubSession.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await deploymentDeactivateRoute(
      deactReq({ appSourceId: 99, apps: ["my-bot"] }),
    );
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires appSourceId and apps", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(
      (await deploymentDeactivateRoute(deactReq({ apps: ["x"] }))).status,
    ).toBe(400);
    expect(
      (await deploymentDeactivateRoute(deactReq({ appSourceId: 99 }))).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a foreign app source", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ sources: [{ id: 1, installation_id: 5 }] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const res = await deploymentDeactivateRoute(
      deactReq({ appSourceId: 99, apps: ["my-bot"] }),
    );
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("deactivates each owned app", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ sources: [{ id: 99, installation_id: 5 }] }),
      )
      .mockResolvedValueOnce(Response.json(true))
      .mockResolvedValueOnce(Response.json(true));
    vi.stubGlobal("fetch", fetchMock);
    const res = await deploymentDeactivateRoute(
      deactReq({ appSourceId: 99, apps: ["api", "web"] }),
    );
    const body = await res.json();
    expect(res.status).toBe(202);
    expect(body).toMatchObject({ ok: true, apps: ["api", "web"] });
    expect(String(fetchMock.mock.calls[1][0])).toContain(
      "/apps/api/deactivate",
    );
    expect(String(fetchMock.mock.calls[2][0])).toContain(
      "/apps/web/deactivate",
    );
  });
});

describe("activateLaunchRoute", () => {
  function activateReq(body: unknown) {
    return new Request("http://localhost:3000/api/bff/launch/activate", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    getGitHubSession.mockResolvedValue({
      githubUserId: "42",
      githubLogin: "alice",
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("rejects without a session", async () => {
    getGitHubSession.mockResolvedValue(null);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await activateLaunchRoute(
      activateReq({
        appSourceId: 99,
        apps: ["my-bot"],
        releaseTags: ["apps-555-r1-my-bot-abc"],
      }),
    );
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("409s when a required secret is unfilled", async () => {
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(activationSourceWithRepo("aomi-labs/my-bot-app"))
      .mockResolvedValueOnce(sourceDeployments())
      .mockResolvedValueOnce(latestDeploymentResponse("aomi-labs/my-bot-app"))
      .mockResolvedValueOnce(
        Response.json({
          by_app: { "my-bot": ["$SECRET:APP:my-bot::MY_BOT_API_KEY"] },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          assets: [
            { name: "manifest.json", url: "https://api.github.com/asset/1" },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          plugins: {
            "my-bot": {
              file: "libmybot.dylib",
              sha256: "x",
              secrets: [
                { name: "MY_BOT_API_KEY", description: "d", required: true },
                {
                  name: "MY_BOT_SECRET_KEY",
                  description: "d",
                  required: true,
                },
              ],
            },
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await activateLaunchRoute(
      activateReq({
        appSourceId: 99,
        apps: ["my-bot"],
        releaseTags: ["apps-555-r1-my-bot-abc"],
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toEqual({
      error: "missing required secrets",
      missing: { "my-bot": ["MY_BOT_SECRET_KEY"] },
    });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("activates when the release manifest declares no secrets for the app", async () => {
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(activationSourceWithRepo("aomi-labs/my-bot-app"))
      .mockResolvedValueOnce(sourceDeployments())
      .mockResolvedValueOnce(latestDeploymentResponse("aomi-labs/my-bot-app"))
      .mockResolvedValueOnce(Response.json({ by_app: {} }))
      .mockResolvedValueOnce(Response.json({ assets: [] }))
      .mockResolvedValueOnce(
        Response.json({ ok: true, activation: { apps: [] } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await activateLaunchRoute(
      activateReq({
        appSourceId: 99,
        apps: ["my-bot"],
        releaseTags: ["apps-555-r1-my-bot-abc"],
      }),
    );

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("requires appSourceId and app/tag pairs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(
      (
        await activateLaunchRoute(
          activateReq({
            apps: ["my-bot"],
            releaseTags: ["apps-555-r1-my-bot-abc"],
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await activateLaunchRoute(
          activateReq({
            appSourceId: 99,
            releaseTags: ["apps-555-r1-my-bot-abc"],
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await activateLaunchRoute(
          activateReq({
            appSourceId: 99,
            apps: ["my-bot", "web"],
            releaseTags: ["apps-555-r1-my-bot-abc"],
          }),
        )
      ).status,
    ).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a foreign app source or unmatched app/tag pair", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(ownedSources(1)));
    expect(
      (
        await activateLaunchRoute(
          activateReq({
            appSourceId: 99,
            apps: ["my-bot"],
            releaseTags: ["apps-555-r1-my-bot-abc"],
          }),
        )
      ).status,
    ).toBe(404);

    vi.restoreAllMocks();
    getGitHubSession.mockResolvedValue({
      githubUserId: "42",
      githubLogin: "alice",
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(activationSource())
        .mockResolvedValueOnce(sourceDeployments()),
    );
    expect(
      (
        await activateLaunchRoute(
          activateReq({
            appSourceId: 99,
            apps: ["my-bot"],
            releaseTags: ["apps-555-r1-my-bot-wrong"],
          }),
        )
      ).status,
    ).toBe(404);
  });

  it("activates only an owned app/tag pair", async () => {
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(activationSource())
      .mockResolvedValueOnce(sourceDeployments())
      .mockResolvedValueOnce(latestDeploymentResponse("aomi-labs/community"))
      .mockResolvedValueOnce(Response.json({ by_app: {} }))
      .mockResolvedValueOnce(Response.json({ assets: [] }))
      .mockResolvedValueOnce(
        Response.json({ ok: true, activation: { apps: [] } }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await activateLaunchRoute(
      activateReq({
        appSourceId: 99,
        apps: ["my-bot"],
        releaseTags: ["apps-555-r1-my-bot-abc"],
      }),
    );
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls[5][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({
        target: {
          kind: "release_tags",
          value: ["apps-555-r1-my-bot-abc"],
        },
        apps: ["my-bot"],
      }),
    });
  });
});

describe("launchAppRoute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("401s without a session and 404s for an unowned app", async () => {
    getGitHubSession.mockResolvedValue(null);
    let fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    let res = await launchAppRoute(
      new Request("http://localhost:3000/api/bff/launch/app?name=my-bot"),
    );
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.restoreAllMocks();
    getGitHubSession.mockResolvedValue({
      githubUserId: "42",
      githubLogin: "alice",
    });
    fetchMock = vi
      .fn()
      .mockResolvedValueOnce(sourceWithApps(1, [{ name: "other-bot" }]));
    vi.stubGlobal("fetch", fetchMock);
    res = await launchAppRoute(
      new Request("http://localhost:3000/api/bff/launch/app?name=my-bot"),
    );
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("deploymentRecordsRoute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("requires appSourceId ownership before listing records", async () => {
    getGitHubSession.mockResolvedValue({
      githubUserId: "42",
      githubLogin: "alice",
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(ownedSources(1));
    vi.stubGlobal("fetch", fetchMock);
    const res = await deploymentRecordsRoute(
      new Request(
        "http://localhost:3000/api/bff/deployments/records?app=my-bot&appSourceId=99",
      ),
    );
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("launchStatusRoute", () => {
  beforeEach(() => {
    getGitHubSession.mockResolvedValue({
      githubUserId: "42",
      githubLogin: "alice",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("propagates backend 404 instead of masking deployment status as pending", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "deployment not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await launchStatusRoute(
      new Request(
        "http://localhost:3000/api/bff/launch/status?deploymentId=dep_141780080_r2849901c35_af4f107b0331",
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: "deployment not found" });
  });

  it("returns the backend status payload untouched — no GitHub call", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json({
        state: "building",
        deployment: {
          id: "dep_141780080_r2849901c35_af4f107b0331",
          platform: {
            repository: "aomi-labs/community-apps",
            commit_hash: "af4f107b0331d2ee04f7c8ffbddd823a75f35e0b",
            ci_status: "running",
            ci_url:
              "https://github.com/aomi-labs/community-apps/actions/runs/28048200284",
            apps: [
              {
                name: "playground-example",
                release_tag:
                  "apps-141780080-r2849901c35-playground-example-af4f107b0331",
              },
            ],
          },
        },
        ci: {
          status: "running",
          url: "https://github.com/aomi-labs/community-apps/actions/runs/28048200284",
          commit_hash: "af4f107b0331d2ee04f7c8ffbddd823a75f35e0b",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await launchStatusRoute(
      new Request(
        "http://localhost:3000/api/bff/launch/status?deploymentId=dep_141780080_r2849901c35_af4f107b0331",
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.state).toBe("building");
    expect(body.ci.status).toBe("running");
    // The backend deep-links the actual run URL; the BFF adds nothing.
    expect(body.ci.url).toContain("/actions/runs/28048200284");
    expect(body.releaseTags).toEqual([
      "apps-141780080-r2849901c35-playground-example-af4f107b0331",
    ]);
    // Exactly one backend call — the BFF never talks to api.github.com.
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("api.github.com");
  });
});

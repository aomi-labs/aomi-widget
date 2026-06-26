// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  launchDeployRoute,
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

describe("launchDeployRoute", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("propagates BackendError status codes (400-599)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
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

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "deploy rejected" });
  });

  it("preflight mints the source row by repo, then previews by app source id", async () => {
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
        body: expect.stringContaining('"repo":"alice/bot"'),
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
    const fetchMock = vi.fn().mockResolvedValueOnce(
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
      1,
      "http://127.0.0.1:8080/api/platforms/community/deploy",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"source_ref":"abc1234def5678"'),
      }),
    );
  });

  it("rejects deploy requests when no source commit is supplied or resolved", async () => {
    vi.unstubAllEnvs();
    const fetchMock = vi.fn();
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
    expect(fetchMock).not.toHaveBeenCalled();
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
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network down"));
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

describe("redeployLaunchRoute", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    getGitHubSession.mockReset();
  });

  it("reruns the backend-owned latest GitHub Actions run for the signed-in user's source", async () => {
    getGitHubSession.mockResolvedValueOnce({
      githubUserId: "42",
      githubLogin: "alice",
    });
    vi.stubEnv("GITHUB_TOKEN", "gh-token");
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
      .mockResolvedValueOnce(new Response(null, { status: 201 }));
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
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://api.github.com/repos/aomi-labs/community-apps/actions/runs/123456/rerun",
      expect.objectContaining({ method: "POST" }),
    );
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/integrations/github-app/user/sources/99/latest-deployment?github_user_id=42&platform=community",
    );
  });

  it("refuses redeploy when backend source state has no CI run to rerun", async () => {
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
    expect(body.error).toContain("No backend-owned CI run");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("503s redeploy when the GitHub rerun token is missing", async () => {
    getGitHubSession.mockResolvedValueOnce({
      githubUserId: "42",
      githubLogin: "alice",
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json({
        latest_deployment: {
          deployment_id: "dep_1",
          platform_repo: "aomi-labs/community-apps",
          ci_run_id: "123456",
          ci_url:
            "https://github.com/aomi-labs/community-apps/actions/runs/123456",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await redeployLaunchRoute(writeReq({ appSourceId: 99 }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error).toContain("GitHub rerun token is not configured");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("launchStatusRoute", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
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

  it("reports a skipped GitHub Actions run when backend CI status is still pending", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          state: "building",
          deployment: {
            id: "dep_141780080_r2849901c35_af4f107b0331",
            platform: {
              repository: "aomi-labs/community-apps",
              ci_status: "pending",
              ci_url:
                "https://github.com/aomi-labs/community-apps/actions?query=branch%3Aphoebe-aomi/my-playground-7/141780080/af4f107b0331",
              apps: [
                {
                  name: "playground-example",
                  release_tag:
                    "apps-141780080-r2849901c35-playground-example-af4f107b0331",
                },
              ],
            },
          },
          release_tags: [
            "apps-141780080-r2849901c35-playground-example-af4f107b0331",
          ],
          ci: {
            status: "pending",
            url: "https://github.com/aomi-labs/community-apps/actions?query=branch%3Aphoebe-aomi/my-playground-7/141780080/af4f107b0331",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          workflow_runs: [
            {
              head_branch: "phoebe-aomi/my-playground-7/141780080/af4f107b0331",
              status: "completed",
              conclusion: "skipped",
              display_title:
                "Deploy playground-example from af4f107b0331d2ee04f7c8ffbddd823a75f35e0b",
              html_url:
                "https://github.com/aomi-labs/community-apps/actions/runs/28048200284",
              head_sha: "5b7e709020a52d64b6c42c53213147c94c0f606b",
            },
          ],
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
    expect(body.state).toBe("failed");
    expect(body.ci.status).toBe("skipped");
    expect(body.ci.url).toContain("/actions/runs/28048200284");
    expect(body.message).toContain('conclusion "skipped"');
  });

  it("does not treat a successful stale GitHub Actions run as deploy-ready", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          state: "building",
          deployment: {
            id: "dep_141780080_r0fd515d1d4_8819f32c4399",
            platform: {
              repository: "aomi-labs/community-apps",
              commit_hash: "c5e0b27ee297c3d8153f05da934d3375e3b1a530",
              ci_status: "pending",
              ci_url:
                "https://github.com/aomi-labs/community-apps/actions?query=branch%3Aphoebe-aomi/playground-example-1/141780080/8819f32c4399",
              apps: [
                {
                  name: "playground-example",
                  release_tag:
                    "apps-141780080-r0fd515d1d4-playground-example-8819f32c4399",
                },
              ],
            },
          },
          release_tags: [
            "apps-141780080-r0fd515d1d4-playground-example-8819f32c4399",
          ],
          ci: {
            status: "pending",
            url: "https://github.com/aomi-labs/community-apps/actions?query=branch%3Aphoebe-aomi/playground-example-1/141780080/8819f32c4399",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          workflow_runs: [
            {
              head_branch:
                "phoebe-aomi/playground-example-1/141780080/8819f32c4399",
              status: "completed",
              conclusion: "success",
              display_title:
                "Deploy playground-example from 8819f32c4399ae75514b1f0605fef8cca75303bf",
              html_url:
                "https://github.com/aomi-labs/community-apps/actions/runs/28068858354",
              head_sha: "e8f3bf7fc22c5bf953bcdac3f20a1d0827a44657",
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const res = await launchStatusRoute(
      new Request(
        "http://localhost:3000/api/bff/launch/status?deploymentId=dep_141780080_r0fd515d1d4_8819f32c4399",
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.state).toBe("failed");
    expect(body.ci.status).toBe("stale");
    expect(body.message).toContain("stale commit e8f3bf7fc22c");
    expect(body.message).toContain("deployment commit c5e0b27ee297");
  });
});

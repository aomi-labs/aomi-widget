// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

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
vi.mock("@portal/lib/aomi-account/github-session", () => ({
  getGitHubSession: () => getGitHubSession(),
}));

function writeReq(body: unknown) {
  return new Request("http://localhost:3000/api/launch/redeploy", {
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
    vi.restoreAllMocks();
  });

  it("propagates BackendError status codes (400-599)", async () => {
    // Deploy is a single backend call now — by appSourceId, no resolve step.
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "deploy rejected" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appSourceId: 123 }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(res.status).toBe(409);
    expect(body).toEqual({ error: "deploy rejected" });
  });

  it("rejects a missing appSourceId before calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ installationId: "123456789" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 502 for non-BackendError exceptions", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const POST = launchDeployRoute(false);
    const req = new Request("http://localhost:3000/api/launch/deploy", {
      method: "POST",
      headers: {
        origin: "http://localhost:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ appSourceId: 123 }),
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
          sources: [
            {
              id: 99,
              installation_id: 555,
              repository_link: "alice/bot",
              github_user_id: "42",
              apps: [],
              latest_deployment: {
                deployment_id: "dep_1",
                platform_repo: "aomi-labs/community-apps",
                ci_run_id: "123456",
                ci_url:
                  "https://github.com/aomi-labs/community-apps/actions/runs/123456",
              },
            },
          ],
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
  });

  it("refuses redeploy when backend source state has no CI run to rerun", async () => {
    getGitHubSession.mockResolvedValueOnce({
      githubUserId: "42",
      githubLogin: "alice",
    });
    const fetchMock = vi.fn().mockResolvedValueOnce(
      Response.json({
        sources: [
          {
            id: 99,
            installation_id: 555,
            repository_link: "alice/bot",
            github_user_id: "42",
            apps: [],
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const res = await redeployLaunchRoute(writeReq({ appSourceId: 99 }));
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toContain("No backend-owned CI run");
    expect(fetchMock).toHaveBeenCalledOnce();
  });
});

describe("launchStatusRoute", () => {
  afterEach(() => {
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
        "http://localhost:3000/api/launch/status?deploymentId=dep_141780080_r2849901c35_af4f107b0331",
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
        "http://localhost:3000/api/launch/status?deploymentId=dep_141780080_r2849901c35_af4f107b0331",
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
        "http://localhost:3000/api/launch/status?deploymentId=dep_141780080_r0fd515d1d4_8819f32c4399",
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

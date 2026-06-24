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

describe("DeploymentClient.deploy", () => {
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
            ref: { kind: "branch", value: "main" },
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
              },
            ],
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("POSTs the repo-scoped deploy request and maps the response to camelCase", async () => {
    const audits: AuditEvent[] = [];
    const result = await client((event) => audits.push(event)).deploy({
      platform: "community",
      appSourceId: 42,
      sourceRef: { kind: "branch", value: "main" },
      aomiTomlPaths: ["aomi.toml"],
      preflight: true,
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
      source_ref: { kind: "branch", value: "main" },
      aomi_toml_paths: ["aomi.toml"],
      preflight: true,
    });

    expect(result.deployment.source.installationId).toBe(123);
    expect(result.deployment.platform.apps[0]).toMatchObject({
      aomiTomlPath: "aomi.toml",
      releaseTag: "apps-123-demo-abc1234def56",
      target: "x86_64-unknown-linux-gnu",
    });
    expect(audits).toEqual([
      expect.objectContaining({
        action: "deploy",
        platform: "community",
        appSourceId: 42,
        actor: "alice",
      }),
    ]);
  });

  it("rejects invalid deploy input before calling the backend", async () => {
    await expect(
      client().deploy({
        platform: "community",
        appSourceId: 0,
        sourceRef: { kind: "commit", value: "abc1234" },
        aomiTomlPaths: ["aomi.toml"],
      }),
    ).rejects.toBeInstanceOf(DeployError);
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
                platform_commit_hash: "ff00aa",
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

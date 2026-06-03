// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeploymentClient } from "../src/client";
import { BrowserEnvironmentError, TagWideningError } from "../src/errors";
import type { GitHubRestClient } from "../src/github";

// ----- in-memory fake of the GitHub Git Data API ----------------------------

function makeFakeGitHub() {
  const calls = {
    blobs: [] as Array<{ content: string; encoding: string }>,
    trees: [] as Array<{ base_tree?: string; tree: Array<{ path: string }> }>,
    commits: [] as Array<{ message: string; tree: string; parents: string[] }>,
    refUpdates: [] as Array<{ ref: string; sha: string }>,
  };
  let blobN = 0;
  const api: GitHubRestClient = {
    git: {
      async getRef() {
        return { data: { object: { sha: "basecommitsha" } } };
      },
      async getCommit() {
        return { data: { tree: { sha: "basetreesha" } } };
      },
      async createBlob(p) {
        calls.blobs.push({ content: p.content, encoding: p.encoding });
        return { data: { sha: `blob${blobN++}` } };
      },
      async createTree(p) {
        calls.trees.push({ base_tree: p.base_tree, tree: p.tree });
        return { data: { sha: "newtreesha" } };
      },
      async createCommit(p) {
        calls.commits.push({ message: p.message, tree: p.tree, parents: p.parents });
        return { data: { sha: "newcommitsha" } };
      },
      async updateRef(p) {
        calls.refUpdates.push({ ref: p.ref, sha: p.sha });
        return {};
      },
    },
    repos: {
      async listReleases() {
        return { data: [] };
      },
    },
    actions: {
      async listWorkflowRunsForRepo() {
        return { data: { workflow_runs: [] } };
      },
    },
  };
  return { api, calls };
}

function makeClient(octokit: GitHubRestClient, onAudit?: (e: unknown) => void) {
  return new DeploymentClient({
    github: { repo: "aomi-labs/krexa-hosted-apps", branch: "publish", botPat: "bot-pat" },
    aomi: { backendUrl: "https://staging-api.example.com", platform: "krexa", activationToken: "act-token" },
    onAudit: onAudit as never,
    octokit,
  });
}

describe("DeploymentClient.deploy", () => {
  it("commits source + manifest under apps/<slug>/ and returns the release tag", async () => {
    const { api, calls } = makeFakeGitHub();
    const audits: unknown[] = [];
    const client = makeClient(api, (e) => audits.push(e));

    const result = await client.deploy({
      slug: "krexa-finance",
      displayName: "Krexa Finance",
      files: { "index.html": "<html>", "aomi.toml": "name='krexa-finance'" },
      serverTags: ["staging"],
      sourceCommit: "0123456789abcdef0123456789abcdef01234567",
    });

    // 2 source files + 1 manifest = 3 blobs
    expect(calls.blobs.length).toBe(3);

    // tree entries are all scoped under apps/krexa-finance/
    const paths = calls.trees[0].tree.map((t) => t.path);
    expect(paths).toContain("apps/krexa-finance/index.html");
    expect(paths).toContain("apps/krexa-finance/aomi.toml");
    expect(paths).toContain("apps/krexa-finance/.aomi/deployment.json");
    expect(paths.every((p) => p.startsWith("apps/krexa-finance/"))).toBe(true);

    expect(calls.commits[0].parents).toEqual(["basecommitsha"]);
    expect(calls.refUpdates[0]).toEqual({ ref: "heads/publish", sha: "newcommitsha" });

    expect(result.releaseTag).toBe("apps-krexa-finance-0123456789ab");
    expect(result.publishCommitSha).toBe("newcommitsha");
    expect(result.appPath).toBe("apps/krexa-finance");
    expect(result.serverTags).toEqual(["staging"]);

    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "deploy", slug: "krexa-finance", releaseTag: result.releaseTag });
  });

  it("derives a source commit when none is supplied", async () => {
    const { api } = makeFakeGitHub();
    const client = makeClient(api);
    const result = await client.deploy({ slug: "app", files: { "a.txt": "x" } });
    expect(result.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(result.releaseTag).toBe(`apps-app-${result.sourceCommit.slice(0, 12)}`);
  });

  it("rejects an invalid slug", async () => {
    const { api } = makeFakeGitHub();
    const client = makeClient(api);
    await expect(client.deploy({ slug: "Bad Slug", files: { "a.txt": "x" } })).rejects.toThrow(/invalid app slug/);
  });
});

describe("DeploymentClient.activate", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response(JSON.stringify({ activated: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs a backend-shaped body with Bearer token + transient read PAT", async () => {
    const { api } = makeFakeGitHub();
    const client = makeClient(api);

    const res = await client.activate({
      slug: "krexa-finance",
      targetEnv: "staging",
      releaseTag: "apps-krexa-finance-0123456789ab",
      sourceCommit: "0123456789abcdef0123456789abcdef01234567",
      buildServerTags: ["staging"],
    });

    expect(res.activated).toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://staging-api.example.com/api/admin/apps/activate");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer act-token" });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      app_slug: "krexa-finance",
      platform: "krexa",
      source_repo: "aomi-labs/krexa-hosted-apps",
      app_release_tag: "apps-krexa-finance-0123456789ab",
      source_commit: "0123456789abcdef0123456789abcdef01234567",
      is_public: false,
      target_tags: ["staging"],
      github_token: "bot-pat",
    });
  });

  it("enforces narrow-only: prod is rejected against a staging-only build", async () => {
    const { api } = makeFakeGitHub();
    const client = makeClient(api);
    await expect(
      client.activate({
        slug: "app",
        targetEnv: "prod",
        releaseTag: "apps-app-0123456789ab",
        sourceCommit: "0123456789abcdef0123456789abcdef01234567",
        buildServerTags: ["staging"],
      }),
    ).rejects.toBeInstanceOf(TagWideningError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws ActivationError on a non-2xx backend response", async () => {
    fetchMock.mockResolvedValueOnce(new Response("upstream fetch failed", { status: 502 }));
    const { api } = makeFakeGitHub();
    const client = makeClient(api);
    await expect(
      client.activate({
        slug: "app",
        targetTags: ["staging"],
        releaseTag: "apps-app-0123456789ab",
        sourceCommit: "0123456789abcdef0123456789abcdef01234567",
      }),
    ).rejects.toMatchObject({ name: "ActivationError", status: 502 });
  });
});

describe("DeploymentClient.requestAccess", () => {
  it("fills platform + repo from config and audits without posting when no webhook set", async () => {
    const { api } = makeFakeGitHub();
    const audits: AuditEvent[] = [];
    const client = makeClient(api, (e) => audits.push(e as AuditEvent));

    const { payload, posted } = await client.requestAccess({
      email: "alice@gmail.com",
      githubAccount: "alice-git-acc",
      app: "krexa-finance",
      requestedAt: "2026-06-03T08:01:38Z",
      actor: "user-1",
    });

    expect(posted).toBe(false);
    expect(payload).toMatchObject({
      kind: "access_request",
      email: "alice@gmail.com",
      github_account: "alice-git-acc",
      app: "krexa-finance",
      platform: "krexa", // from aomi config
      repo: "aomi-labs/krexa-hosted-apps", // from descriptor (default from github.repo)
    });
    expect(audits).toEqual([
      expect.objectContaining({ action: "request", slug: "krexa-finance", actor: "user-1" }),
    ]);
  });

  it("POSTs the embed when a discord webhook is configured", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const { api } = makeFakeGitHub();
      const client = new DeploymentClient({
        github: { repo: "aomi-labs/community-apps", branch: "publish", botPat: "bot" },
        aomi: { backendUrl: "https://api", platform: "community", activationToken: "t" },
        discord: { webhookUrl: "https://discord.com/api/webhooks/x/y", opsMention: "<@&123>" },
        octokit: api,
      });

      const { posted } = await client.requestAccess({
        email: "alice@gmail.com",
        githubAccount: "alice-git-acc",
        app: "cecilia-test-2",
      });

      expect(posted).toBe(true);
      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://discord.com/api/webhooks/x/y");
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.content).toBe("<@&123>");
      expect(body.embeds[0].title).toBe("Access request");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("server-only guard", () => {
  it("throws in a browser-like environment", () => {
    const g = globalThis as Record<string, unknown>;
    g.window = {};
    g.document = {};
    try {
      expect(() => makeClient(makeFakeGitHub().api)).toThrow(BrowserEnvironmentError);
    } finally {
      delete g.window;
      delete g.document;
    }
  });
});

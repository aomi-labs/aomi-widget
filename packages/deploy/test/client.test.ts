// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeploymentClient } from "../src/client";
import { ActivationError, BrowserEnvironmentError, TagWideningError } from "../src/errors";
import type { GitHubRestClient } from "../src/github";

// ----- in-memory fake of the GitHub Git Data API ----------------------------

// The client now only *reads* GitHub (status); the write (commit) moved to the
// backend. The fake just satisfies the read interface used by the status reader.
function makeFakeGitHub() {
  const api: GitHubRestClient = {
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
  return { api };
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
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            commit_sha: "newcommitsha",
            branch: "publish",
            release_tag: "apps-krexa-finance-0123456789ab",
            app_path: "apps/krexa-finance",
          }),
          { status: 201 },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs the bundle to the backend publish endpoint with the activation bearer", async () => {
    const { api } = makeFakeGitHub();
    const audits: unknown[] = [];
    const client = makeClient(api, (e) => audits.push(e));

    const result = await client.deploy({
      slug: "krexa-finance",
      displayName: "Krexa Finance",
      files: { "index.html": "<html>", "aomi.toml": "name='krexa-finance'" },
      serverTags: ["staging"],
      sourceCommit: "0123456789abcdef0123456789abcdef01234567",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://staging-api.example.com/api/admin/platforms/krexa/apps/krexa-finance/publish",
    );
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer act-token" });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      source_commit: "0123456789abcdef0123456789abcdef01234567",
      is_public: false,
      server_tags: ["staging"],
      label: "Krexa Finance",
    });
    // Files carried as base64 with app-relative paths (no apps/<slug>/ prefix —
    // the backend prefixes it).
    expect(body.files).toEqual(
      expect.arrayContaining([
        { path: "index.html", content_base64: Buffer.from("<html>").toString("base64") },
        { path: "aomi.toml", content_base64: Buffer.from("name='krexa-finance'").toString("base64") },
      ]),
    );

    // Result echoes the backend response.
    expect(result.releaseTag).toBe("apps-krexa-finance-0123456789ab");
    expect(result.publishCommitSha).toBe("newcommitsha");
    expect(result.appPath).toBe("apps/krexa-finance");
    expect(result.serverTags).toEqual(["staging"]);

    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({ action: "deploy", slug: "krexa-finance", releaseTag: result.releaseTag });
  });

  it("derives a source commit when none is supplied and sends it to the backend", async () => {
    const { api } = makeFakeGitHub();
    const client = makeClient(api);
    const result = await client.deploy({ slug: "app", files: { "a.txt": "x" } });
    expect(result.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.source_commit).toBe(result.sourceCommit);
  });

  it("rejects an invalid slug before any request", async () => {
    const { api } = makeFakeGitHub();
    const client = makeClient(api);
    await expect(client.deploy({ slug: "Bad Slug", files: { "a.txt": "x" } })).rejects.toThrow(
      /invalid app slug/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("surfaces the backend's classified { error } message into ActivationError.message", async () => {
    // The activate endpoint returns a JSON `{ error }` body with actionable
    // 409/422/502 text (e.g. a plugin-name collision). The thrown error's
    // message must carry it so the portal route — which renders `err.message` —
    // shows the detail instead of a bare "activation failed (409)".
    const detail =
      "release `apps-app-0123456789ab` collides with an already-installed plugin: rename + redeploy";
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: detail }), { status: 409 }),
    );
    const { api } = makeFakeGitHub();
    const client = makeClient(api);
    const err = await client
      .activate({
        slug: "app",
        targetTags: ["staging"],
        releaseTag: "apps-app-0123456789ab",
        sourceCommit: "0123456789abcdef0123456789abcdef01234567",
      })
      .then(
        () => {
          throw new Error("expected activate to reject");
        },
        (e) => e as ActivationError,
      );
    expect(err.name).toBe("ActivationError");
    expect(err.status).toBe(409);
    expect(err.message).toContain(detail);
  });
});

describe("DeploymentClient.requestActivation", () => {
  it("fills platform + repo from config and audits without posting when no webhook set", async () => {
    const { api } = makeFakeGitHub();
    const audits: AuditEvent[] = [];
    const client = makeClient(api, (e) => audits.push(e as AuditEvent));

    const { payload, posted } = await client.requestActivation({
      email: "alice@gmail.com",
      githubAccount: "alice-git-acc",
      app: "krexa-finance",
      requestedAt: "2026-06-03T08:01:38Z",
      actor: "user-1",
    });

    expect(posted).toBe(false);
    expect(payload).toMatchObject({
      kind: "activation_request",
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

      const { posted } = await client.requestActivation({
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
      expect(body.embeds[0].title).toBe("Activation request");
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

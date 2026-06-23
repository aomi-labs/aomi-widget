// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DeploymentClient } from "../src/client";
import { DeployError } from "../src/errors";
import type { AuditEvent } from "../src/types";

function client(opts?: {
  activationToken?: string;
  adminBearer?: string;
  onAudit?: (event: AuditEvent) => void;
}) {
  return new DeploymentClient({
    aomi: {
      backendUrl: "https://staging-api.example.com/",
      activationToken: opts?.activationToken,
      adminBearer: opts?.adminBearer,
    },
    onAudit: opts?.onAudit,
  });
}

function jsonOnce(fetchMock: ReturnType<typeof vi.fn>, body: unknown) {
  fetchMock.mockResolvedValueOnce(Response.json(body));
}

describe("DeploymentClient bootstrap — tokens", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("mints a platform token with the admin bearer", async () => {
    jsonOnce(fetchMock, { id: 12, token: "plaintext-once", scope: "platform" });
    const audits: AuditEvent[] = [];
    const result = await client({
      adminBearer: "admin-jwt",
      onAudit: (e) => audits.push(e),
    }).mintToken({ platform: "playground", scope: "platform", actor: "ops" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://staging-api.example.com/api/platforms/playground/tokens",
    );
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer admin-jwt",
    });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      scope: "platform",
    });
    expect(result).toEqual({ id: 12, token: "plaintext-once", scope: "platform" });
    expect(audits).toEqual([
      expect.objectContaining({
        action: "mint_token",
        platform: "playground",
        scope: "platform",
        actor: "ops",
      }),
    ]);
  });

  it("mints an app token (app_id in body, activation token allowed)", async () => {
    jsonOnce(fetchMock, { id: 13, token: "app-tok", scope: "app" });
    await client({ activationToken: "plat-tok" }).mintToken({
      platform: "playground",
      scope: "app",
      appId: 42,
    });
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer plat-tok",
    });
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      scope: "app",
      app_id: 42,
    });
  });

  it("per-call bearer override wins over configured tokens", async () => {
    jsonOnce(fetchMock, { id: 1, token: "t", scope: "platform" });
    await client({ adminBearer: "configured" }).mintToken({
      platform: "playground",
      scope: "platform",
      bearer: "override-jwt",
    });
    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer override-jwt",
    });
  });

  it("rejects scope app without appId before calling the backend", async () => {
    await expect(
      client({ adminBearer: "a" }).mintToken({
        platform: "playground",
        scope: "app",
      }),
    ).rejects.toBeInstanceOf(DeployError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects minting when no privileged bearer is configured", async () => {
    await expect(
      client().mintToken({ platform: "playground", scope: "platform" }),
    ).rejects.toBeInstanceOf(DeployError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists and revokes tokens", async () => {
    jsonOnce(fetchMock, [
      {
        id: 7,
        scope: "platform",
        app_id: null,
        token_hash_prefix: "deadbeef",
        created_at: "2026-06-23T00:00:00Z",
        last_used_at: null,
        revoked_at: null,
        apps_usage: null,
        platform_usage: "playground",
      },
    ]);
    const list = await client({ activationToken: "plat-tok" }).listTokens({
      platform: "playground",
    });
    expect(list[0]).toMatchObject({
      id: 7,
      scope: "platform",
      tokenHashPrefix: "deadbeef",
      platformUsage: "playground",
    });

    jsonOnce(fetchMock, true);
    const ok = await client({ adminBearer: "admin-jwt" }).revokeToken({
      platform: "playground",
      id: 7,
    });
    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe(
      "https://staging-api.example.com/api/platforms/playground/tokens/7",
    );
    expect((init as RequestInit).method).toBe("DELETE");
  });
});

describe("DeploymentClient bootstrap — sources", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const sourceBody = {
    ok: true,
    source: {
      id: 99,
      installation_id: 555,
      repository_id: 111,
      repository_link: "https://github.com/alice/alice-bot",
      github_account: "alice",
      github_user_id: 222,
      bound_platform_id: 3,
    },
  };

  it("syncs an installed source and maps to camelCase", async () => {
    jsonOnce(fetchMock, sourceBody);
    const src = await client({ activationToken: "plat-tok" }).syncSource({
      platform: "playground",
      repo: "alice/alice-bot",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://staging-api.example.com/api/platforms/playground/sources/sync-installed",
    );
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      repo: "alice/alice-bot",
    });
    expect(src).toEqual({
      id: 99,
      installationId: 555,
      repositoryId: 111,
      repositoryLink: "https://github.com/alice/alice-bot",
      githubAccount: "alice",
      githubUserId: 222,
      boundPlatformId: 3,
    });
  });

  it("resolves a source via query params", async () => {
    jsonOnce(fetchMock, sourceBody);
    await client({ activationToken: "plat-tok" }).resolveSource({
      platform: "playground",
      installationId: 555,
      repo: "alice/alice-bot",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).method).toBe("GET");
    expect(url).toBe(
      "https://staging-api.example.com/api/platforms/playground/sources/resolve?installation_id=555&repo=alice%2Falice-bot",
    );
  });

  it("scaffolds from the default template and maps the source", async () => {
    jsonOnce(fetchMock, sourceBody);
    const src = await client({ activationToken: "plat-tok" }).scaffold({
      platform: "playground",
      installationId: 555,
      repoName: "my-bot",
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://staging-api.example.com/api/integrations/github-app/platforms/playground/sources/create-from-template",
    );
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      installation_id: 555,
      template_repo: "aomi-labs/playground-example",
      repo_name: "my-bot",
      private: false,
    });
    expect(src.id).toBe(99);
  });
});

describe("DeploymentClient bootstrap — apps", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("lists apps and maps to camelCase", async () => {
    jsonOnce(fetchMock, {
      apps: [
        {
          id: 5,
          name: "my-bot",
          label: "My Bot",
          is_active: true,
          is_public: true,
          app_source_id: 99,
          app_release_tag: "apps-555-r1-my-bot-abc1234",
          target_tags: ["staging"],
          loaded: true,
        },
      ],
    });
    const apps = await client({ activationToken: "plat-tok" }).listApps({
      platform: "playground",
    });
    expect(apps[0]).toEqual({
      id: 5,
      name: "my-bot",
      label: "My Bot",
      isActive: true,
      isPublic: true,
      appSourceId: 99,
      appReleaseTag: "apps-555-r1-my-bot-abc1234",
      targetTags: ["staging"],
      loaded: true,
    });
  });

  it("gets a single app", async () => {
    jsonOnce(fetchMock, {
      app: { id: 5, name: "my-bot", is_active: true, loaded: true },
    });
    const app = await client({ activationToken: "plat-tok" }).getApp({
      platform: "playground",
      app: "my-bot",
    });
    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://staging-api.example.com/api/platforms/playground/apps/my-bot",
    );
    expect(app).toMatchObject({ id: 5, name: "my-bot", loaded: true });
  });
});

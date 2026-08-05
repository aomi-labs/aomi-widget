import { BackendError, DeployError } from "../errors";
import type {
  ActivateInput,
  ActivateResult,
  CreateProjectInput,
  DeactivateAppInput,
  DeployInput,
  DeployResult,
  DeploymentProgressEvent,
  DeploymentStatus,
  GetAppInput,
  IngestSecretsInput,
  IngestSecretsResult,
  ListAppSecretsInput,
  ListAppsInput,
  ListDeploymentRecordsInput,
  ListDeploymentRecordsResult,
  ListSecretsInput,
  ListSecretsResult,
  ListTokensInput,
  MintTokenInput,
  MintedToken,
  PlatformApp,
  PreflightInput,
  Project,
  PromoteInput,
  PromoteResult,
  RemoveAppSecretInput,
  RerunDeploymentInput,
  RerunDeploymentResult,
  RevokeTokenInput,
  ScaffoldInput,
  ServerTagsResult,
  StatusInput,
  TokenRecord,
  WatchDeploymentOptions,
} from "../types";
import { watchDeploymentLoop } from "../launch/watch";
import {
  activateRequest,
  camelActivateResult,
  camelDeployResult,
  camelPlatformApp,
  camelProject,
  camelStatusResult,
  camelTokenRecord,
  deployRequest,
  required,
  timestampSeconds,
} from "../wire";
import { BackendClientCore } from "./core";

/**
 * Platform/admin tier of the deploy client: the `/api/platforms/*` surface
 * (deploy lifecycle, activation, tokens, project bootstrap, apps, records)
 * plus the secrets vault. See core.ts for the tier layout.
 */
export class BackendPlatformClient extends BackendClientCore {
  async preflight(input: PreflightInput): Promise<DeployResult> {
    return this.runDeploy(input, "preflight");
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    return this.runDeploy(input, "deploy");
  }

  /** Shared deploy POST — preflight (advisory) and deploy (apply) differ only
   *  in the request flag and the audited action. */
  private async runDeploy(
    input: PreflightInput | DeployInput,
    action: "preflight" | "deploy",
  ): Promise<DeployResult> {
    const platform = required(input.platform, "platform");
    const body = deployRequest(input, action === "preflight");
    const result = await this.post<DeployResult>(
      `/api/platforms/${encodeURIComponent(platform)}/deploy`,
      body,
      action,
      this.resolveBearer(),
    );
    const cameled = camelDeployResult(result);
    if (!cameled.ok) {
      throw new DeployError(
        "BACKEND",
        `${action} rejected by backend (deployment ${cameled.deployment.id})`,
      );
    }
    await this.audit(action, input.actor, {
      platform,
      projectId: input.projectId,
    });
    return cameled;
  }

  async activate(input: ActivateInput): Promise<ActivateResult> {
    const platform = required(input.platform, "platform");
    const body = activateRequest(input);
    const result = await this.post<ActivateResult>(
      `/api/platforms/${encodeURIComponent(platform)}/apps/activate`,
      body,
      "activation",
      this.resolveBearer(),
    );
    const cameled = camelActivateResult(result);
    if (!cameled.ok) {
      const partialErrors = cameled.activation.apps
        .filter((a) => a.error)
        .map((a) => ({ app: a.name, error: a.error }));
      throw new DeployError(
        "ACTIVATION",
        `activate rejected by backend (status ${cameled.activation.status})`,
        partialErrors.length ? partialErrors : undefined,
      );
    }
    await this.audit("activate", input.actor, {
      platform,
      apps: input.apps ?? [],
      targetTags: input.targetTags,
    });
    return cameled;
  }

  /** Deactivate one app: clears its live pointer and unloads the binary. The
   *  deployment's git record and activation history are untouched. */
  async deactivateApp(input: DeactivateAppInput): Promise<void> {
    const platform = required(input.platform, "platform");
    const app = required(input.app, "app");
    const query =
      input.projectId != null
        ? `?project_id=${encodeURIComponent(String(input.projectId))}`
        : "";
    await this.post<unknown>(
      `/api/platforms/${encodeURIComponent(platform)}/apps/${encodeURIComponent(app)}/deactivate${query}`,
      {},
      "deactivate",
      this.resolveBearer(input.bearer),
    );
    await this.audit("deactivate", input.actor, { platform, apps: [app] });
  }

  async promote(input: PromoteInput): Promise<PromoteResult> {
    const platform = required(input.platform, "platform");
    const deploymentId = required(input.deploymentId, "deploymentId");
    const result = await this.post<ActivateResult>(
      `/api/platforms/${encodeURIComponent(platform)}/deployments/${encodeURIComponent(deploymentId)}/promote`,
      {
        deployment_id: deploymentId,
        apps: input.apps,
        target_tags: input.targetTags,
        actor: input.actor,
      },
      "promote",
      this.resolveBearer(),
    );
    await this.audit("promote", input.actor, {
      platform,
      apps: input.apps ?? [],
      targetTags: input.targetTags,
    });
    const cameled = camelActivateResult(result);
    const releaseTags = cameled.activation.apps
      .map((app) => app.releaseTag)
      .filter((tag): tag is string => Boolean(tag));
    return {
      ok: cameled.ok,
      promote: {
        deploymentId,
        releaseTags,
        status: cameled.ok ? "promoted" : "blocked",
        activation: cameled.activation,
      },
    };
  }

  /**
   * POST `/api/platforms/:platform/deployments/:id/rerun` — re-run the GitHub
   * Actions run behind a deployment's recorded commit. The backend's App
   * installation token makes the GitHub call; clients hold no GitHub token.
   */
  async rerunDeployment(
    input: RerunDeploymentInput,
  ): Promise<RerunDeploymentResult> {
    const platform = required(input.platform, "platform");
    const deploymentId = required(input.deploymentId, "deploymentId");
    const params = new URLSearchParams();
    if (input.githubUserId?.trim()) {
      params.set("github_user_id", input.githubUserId.trim());
    }
    const query = params.toString();
    const result = await this.post<Record<string, unknown>>(
      `/api/platforms/${encodeURIComponent(platform)}/deployments/${encodeURIComponent(deploymentId)}/rerun${query ? `?${query}` : ""}`,
      {},
      "rerun",
      this.resolveBearer(),
    );
    await this.audit("rerun", input.actor, { platform });
    return {
      ok: result.ok === true,
      deploymentId,
      commitHash:
        typeof result.commit_hash === "string" ? result.commit_hash : null,
      runId: typeof result.run_id === "number" ? result.run_id : null,
      ciUrl: typeof result.ci_url === "string" ? result.ci_url : null,
    };
  }

  async status(input: StatusInput): Promise<DeploymentStatus> {
    const platform = required(input.platform, "platform");
    const statusParams = new URLSearchParams();
    if (input.githubUserId?.trim()) {
      statusParams.set("github_user_id", input.githubUserId.trim());
    }
    const statusQuery = statusParams.toString();
    const path = input.deploymentId
      ? `/api/platforms/${encodeURIComponent(platform)}/deployments/${encodeURIComponent(input.deploymentId)}/status${statusQuery ? `?${statusQuery}` : ""}`
      : (input.path ?? `/api/platforms/${encodeURIComponent(platform)}/status`);
    const result = await this.get<Record<string, unknown>>(
      path,
      "status",
      this.resolveBearer(),
    );
    await this.audit("status", input.actor, { platform });
    return camelStatusResult(result);
  }

  async serverTags(): Promise<ServerTagsResult> {
    const result = await this.get<Record<string, unknown>>(
      "/api/platforms/server-tags",
      "server tags",
      this.resolveBearer(),
    );
    return {
      serverTags: (result.server_tags ?? result.serverTags ?? []) as string[],
      sdkVersion: String(result.sdk_version ?? result.sdkVersion ?? ""),
    };
  }

  /**
   * Poll GET /api/platforms/:platform/deployments/:id/status until a terminal
   * state is reached or retries are exhausted. Calls onEvent for every tick.
   */
  async watchDeployment(
    deploymentId: string,
    platform: string,
    onEvent: (event: DeploymentProgressEvent) => void,
    options?: WatchDeploymentOptions,
  ): Promise<void> {
    return watchDeploymentLoop(
      () => this.status({ platform, deploymentId }),
      onEvent,
      {
        ...options,
        // A 4xx is the backend telling us this will never succeed.
        isFatal: (err) =>
          err instanceof BackendError && err.status >= 400 && err.status < 500,
      },
    );
  }

  // ───────────────────────── Bootstrap: tokens ──────────────────────────────

  /**
   * Mint a platform or app activation token.
   * `POST /api/platforms/:platform/tokens`.
   *
   * The plaintext token is returned ONCE — store it now; the backend keeps only
   * its hash. Minting the first platform token needs the privileged admin
   * bearer (`aomi.adminBearer` or `input.bearer`); a platform token may then
   * mint app-scoped tokens.
   */
  async mintToken(input: MintTokenInput): Promise<MintedToken> {
    const platform = required(input.platform, "platform");
    if (input.scope !== "platform" && input.scope !== "app") {
      throw new DeployError(
        "INVALID_REQUEST",
        `scope must be "platform" or "app" (got ${JSON.stringify(input.scope)})`,
      );
    }
    const body: Record<string, unknown> = { scope: input.scope };
    if (input.scope === "app") {
      const appId = Number(input.appId);
      if (!Number.isSafeInteger(appId) || appId <= 0) {
        throw new DeployError(
          "INVALID_REQUEST",
          'scope "app" requires a positive appId',
        );
      }
      body.app_id = appId;
    }
    const bearer = this.resolveBearer(input.bearer, { privileged: true });
    const raw = await this.post<Record<string, unknown>>(
      `/api/platforms/${encodeURIComponent(platform)}/tokens`,
      body,
      "mint_token",
      bearer,
    );
    await this.audit("mint_token", input.actor, {
      platform,
      scope: input.scope,
    });
    return {
      id: Number(raw.id),
      token: String(raw.token),
      scope: (raw.scope as string) ?? input.scope,
    };
  }

  /** List a platform's activation tokens. `GET /api/platforms/:platform/tokens`. */
  async listTokens(input: ListTokensInput): Promise<TokenRecord[]> {
    const platform = required(input.platform, "platform");
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.get<unknown>(
      `/api/platforms/${encodeURIComponent(platform)}/tokens`,
      "list_tokens",
      bearer,
    );
    await this.audit("list_tokens", input.actor, { platform });
    return (Array.isArray(raw) ? raw : []).map(camelTokenRecord);
  }

  /** Revoke a token by id. `DELETE /api/platforms/:platform/tokens/:id`. */
  async revokeToken(input: RevokeTokenInput): Promise<boolean> {
    const platform = required(input.platform, "platform");
    const id = Number(input.id);
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new DeployError(
        "INVALID_REQUEST",
        "revokeToken requires a positive id",
      );
    }
    const bearer = this.resolveBearer(input.bearer, { privileged: true });
    const raw = await this.del<unknown>(
      `/api/platforms/${encodeURIComponent(platform)}/tokens/${id}`,
      "revoke_token",
      bearer,
    );
    await this.audit("revoke_token", input.actor, { platform, tokenId: id });
    return raw === true;
  }

  // ─────────────────────────── Bootstrap: projects ──────────────────────────

  /**
   * Create the platform-bound project for an installed GitHub repository.
   * The backend validates `.aomi/config.json` before persisting it.
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const platform = required(input.platform, "platform");
    const repo = required(input.repo, "repo");
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.post<{ ok?: boolean; project?: unknown }>(
      `/api/platforms/${encodeURIComponent(platform)}/projects`,
      {
        repo,
        github_user_id: required(input.githubUserId, "githubUserId"),
      },
      "create_project",
      bearer,
    );
    await this.audit("create_project", input.actor, { platform, repo });
    return camelProject(raw.project);
  }

  /**
   * One-shot: create a new repo from a template and persist its project.
   * `POST /api/integrations/github-app/platforms/:platform/projects/create-from-template`.
   */
  async scaffold(input: ScaffoldInput): Promise<Project> {
    const platform = required(input.platform, "platform");
    const installationId = Number(input.installationId);
    if (!Number.isSafeInteger(installationId) || installationId <= 0) {
      throw new DeployError(
        "INVALID_REQUEST",
        "scaffold requires a positive installationId",
      );
    }
    const repoName = required(input.repoName, "repoName");
    const templateRepo = required(input.templateRepo, "templateRepo");
    const githubUserId = required(input.githubUserId, "githubUserId");
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.post<{ ok?: boolean; project?: unknown }>(
      `/api/integrations/github-app/platforms/${encodeURIComponent(platform)}/projects/create-from-template`,
      {
        installation_id: installationId,
        template_repo: templateRepo,
        repo_name: repoName,
        github_user_id: githubUserId,
        private: Boolean(input.private),
      },
      "scaffold",
      bearer,
    );
    await this.audit("scaffold", input.actor, { platform, repo: repoName });
    return camelProject(raw.project);
  }

  // ──────────────────────── Bootstrap: platform apps ────────────────────────

  /** List loaded apps on a platform. `GET /api/platforms/:platform/apps`. */
  async listApps(input: ListAppsInput): Promise<PlatformApp[]> {
    const platform = required(input.platform, "platform");
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.get<{ apps?: unknown[] }>(
      `/api/platforms/${encodeURIComponent(platform)}/apps`,
      "list_apps",
      bearer,
    );
    await this.audit("list_apps", input.actor, { platform });
    return (raw.apps ?? []).map(camelPlatformApp);
  }

  /** Get one app on a platform. `GET /api/platforms/:platform/apps/:app`. */
  async getApp(input: GetAppInput): Promise<PlatformApp> {
    const platform = required(input.platform, "platform");
    const app = required(input.app, "app");
    const bearer = this.resolveBearer(input.bearer);
    const releaseTag = input.releaseTag?.trim();
    const query = releaseTag
      ? `?${new URLSearchParams({ release_tag: releaseTag })}`
      : "";
    const raw = await this.get<{ app?: unknown }>(
      `/api/platforms/${encodeURIComponent(platform)}/apps/${encodeURIComponent(app)}${query}`,
      "get_app",
      bearer,
    );
    await this.audit("get_app", input.actor, { platform });
    return camelPlatformApp(raw.app);
  }

  async listDeploymentRecords(
    input: ListDeploymentRecordsInput,
  ): Promise<ListDeploymentRecordsResult> {
    const platform = required(input.platform, "platform");
    const app = required(input.app, "app");
    const query =
      input.projectId != null
        ? `?project_id=${encodeURIComponent(String(input.projectId))}`
        : "";
    const raw = await this.get<{
      app?: string;
      current_release_tag?: string | null;
      records?: Array<Record<string, unknown>>;
    }>(
      `/api/platforms/${encodeURIComponent(platform)}/apps/${encodeURIComponent(app)}/records${query}`,
      "list_deployment_records",
      this.resolveBearer(input.bearer),
    );
    return {
      app: raw.app ?? app,
      currentReleaseTag: (raw.current_release_tag as string | null) ?? null,
      records: (raw.records ?? []).map((row) => ({
        deploymentId: String(row.deployment_id ?? ""),
        releaseTag: String(row.release_tag ?? ""),
        actor: (row.actor as string | null) ?? null,
        createdAt: timestampSeconds(row.created_at),
        sdkVersion: (row.sdk_version as string | null) ?? null,
        current: Boolean(row.current),
      })),
    };
  }

  async listSecrets(input: ListSecretsInput = {}): Promise<ListSecretsResult> {
    const params = new URLSearchParams();
    const clientId = input.clientId ?? input.githubUserId;
    if (clientId) params.set("client_id", clientId);
    const query = params.toString();
    const raw = await this.get<{ by_app?: Record<string, string[]> }>(
      `/api/secrets${query ? `?${query}` : ""}`,
      "list_secrets",
      this.resolveBearer(input.bearer, { privileged: true }),
    );
    return { byApp: raw.by_app ?? {} };
  }

  /** Ingest app-scoped env vars into the secret vault under the GitHub user id.
   *  The backend field is still named `user_id`, but GitHub is the only owner
   *  scope this client accepts for app secrets. Service op. */
  async ingestSecrets(input: IngestSecretsInput): Promise<IngestSecretsResult> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const app = required(input.app, "app");
    const projectId = input.projectId?.trim();
    const raw = await this.post<{ handles?: Record<string, string> }>(
      `/api/_internal/secrets`,
      {
        user_id: githubUserId,
        app,
        ...(projectId ? { source_id: projectId } : {}),
        secrets: input.secrets,
      },
      "ingest_secrets",
      this.resolveBearer(input.bearer, { privileged: true }),
    );
    return { handles: raw.handles ?? {} };
  }

  /** List vault handle names (never values) for the GitHub user id, keyed by
   *  app. Service read, so it works with the portal's service bearer (unlike
   *  the session-scoped `listSecrets`). */
  async listAppSecrets(input: ListAppSecretsInput): Promise<ListSecretsResult> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const params = new URLSearchParams({ user_id: githubUserId });
    if (input.app?.trim()) params.set("app", input.app.trim());
    if (input.projectId?.trim()) {
      params.set("source_id", input.projectId.trim());
    }
    const raw = await this.get<{ by_app?: Record<string, string[]> }>(
      `/api/_internal/secrets?${params.toString()}`,
      "list_secrets",
      this.resolveBearer(input.bearer, { privileged: true }),
    );
    return { byApp: raw.by_app ?? {} };
  }

  /** Remove one app-scoped secret. Service op. Returns whether it existed. */
  async removeAppSecret(input: RemoveAppSecretInput): Promise<boolean> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const app = required(input.app, "app");
    const name = required(input.name, "name");
    const projectId = input.projectId?.trim();
    const raw = await this.del<{ removed?: boolean }>(
      `/api/_internal/secrets`,
      "ingest_secrets",
      this.resolveBearer(input.bearer, { privileged: true }),
      {
        user_id: githubUserId,
        app,
        ...(projectId ? { source_id: projectId } : {}),
        name,
      },
    );
    return Boolean(raw.removed);
  }
}

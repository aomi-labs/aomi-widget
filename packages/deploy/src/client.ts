import { BackendError, BrowserEnvironmentError, DeployError } from "./errors";
import type {
  IngestSecretsInput,
  IngestSecretsResult,
  ListAppSecretsInput,
  RemoveAppSecretInput,
  ListSecretsInput,
  ListSecretsResult,
  ActivateInput,
  ActivateResult,
  AppSource,
  AuditEvent,
  DeployInput,
  DeployResult,
  DeploymentClientOptions,
  DeploymentProgressEvent,
  DeploymentStatus,
  DeploymentAppStatus,
  ExchangeGitHubCodeInput,
  GetAppInput,
  GetUserSourceAppDetailInput,
  GetUserSourceLatestDeploymentInput,
  GitHubIdentity,
  ListAppsInput,
  DeactivateAppInput,
  GetUserSourceUsageInput,
  ListDeploymentRecordsInput,
  ListDeploymentRecordsResult,
  ListUserSourceLogsInput,
  ListUserSourceTransactionsInput,
  ListUserDeploymentsInput,
  ListUserSourceDeploymentsInput,
  ListUserSourcesInput,
  BotRegistration,
  CreateUserBotInput,
  DeleteUserBotInput,
  CreateUserSourceBotInput,
  BuilderModelKey,
  BuilderModelKeyUsage,
  BuilderModelKeysInput,
  DeleteBuilderModelKeyInput,
  DeleteUserSourceBotInput,
  OwnedOperateInput,
  OperateLogCursor,
  OperateAppDetailResult,
  OperateStatementResult,
  OperateLogsResult,
  OperateObservabilityResult,
  OperateTransactionCursor,
  OperateTransactionsResult,
  OperateUsageResult,
  UpdateUserBotInput,
  OwnedOperateSourceInput,
  SaveBuilderModelKeyInput,
  SetModelKeyGrantsInput,
  UserSource,
  UserDeployment,
  UserDeploymentsPage,
  UserSourceLatestDeployment,
  ListTokensInput,
  MintTokenInput,
  MintedToken,
  PlatformApp,
  PreflightInput,
  ProgressModel,
  PromoteInput,
  PromoteResult,
  RerunDeploymentInput,
  RerunDeploymentResult,
  ServerTagsResult,
  RevokeTokenInput,
  ScaffoldInput,
  StatusInput,
  SourceSdkUpgradeResult,
  SourceSdkUpgradeStatusResult,
  SyncSourceInput,
  TokenRecord,
  WatchDeploymentOptions,
} from "./types";

/**
 * Server-side client to the Aomi platform deploy backend. It is a typed HTTP
 * wrapper only: source reads, platform writes, CI checks, and activation all
 * happen in the backend.
 */
export class DeploymentClient {
  private readonly opts: DeploymentClientOptions;
  private readonly baseUrl: string;
  /** Activation token for deploy/activate/status and bootstrap reads. */
  private readonly activationToken?: string;
  /** Privileged admin/service bearer for bootstrap writes (token minting). */
  private readonly adminBearer?: string;

  constructor(opts: DeploymentClientOptions) {
    assertServerOnly();
    this.opts = opts;
    this.baseUrl = required(opts.aomi.backendUrl, "aomi.backendUrl").replace(
      /\/+$/,
      "",
    );
    this.activationToken = opts.aomi.activationToken?.trim() || undefined;
    this.adminBearer = opts.aomi.adminBearer?.trim() || undefined;
  }

  /**
   * Pick the bearer for a call: an explicit per-call override wins; otherwise
   * privileged writes prefer the admin bearer, everything else the activation
   * token. Throws a typed error (no network call) when neither is configured.
   */
  private resolveBearer(
    override?: string,
    opts?: { privileged?: boolean },
  ): string {
    const order = opts?.privileged
      ? [override, this.adminBearer, this.activationToken]
      : [override, this.activationToken, this.adminBearer];
    const found = order.map((t) => t?.trim()).find(Boolean);
    if (!found) {
      throw new DeployError(
        "INVALID_REQUEST",
        opts?.privileged
          ? "this operation needs a privileged admin/service bearer (aomi.adminBearer) or an activation token"
          : "this operation needs an activation token (aomi.activationToken)",
      );
    }
    return found;
  }

  async preflight(input: PreflightInput): Promise<DeployResult> {
    const platform = cleanPlatform(input.platform);
    const body = deployRequest(input, true);
    const result = await this.post<DeployResult>(
      `/api/platforms/${encodeURIComponent(platform)}/deploy`,
      body,
      "preflight",
      this.resolveBearer(),
    );
    const cameled = camelDeployResult(result);
    if (!cameled.ok) {
      throw new DeployError(
        "BACKEND",
        `preflight rejected by backend (deployment ${cameled.deployment.id})`,
      );
    }
    await this.audit({
      action: "preflight",
      platform,
      appSourceId: input.appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return cameled;
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    const platform = cleanPlatform(input.platform);
    const body = deployRequest(input, false);
    const result = await this.post<DeployResult>(
      `/api/platforms/${encodeURIComponent(platform)}/deploy`,
      body,
      "deploy",
      this.resolveBearer(),
    );
    const cameled = camelDeployResult(result);
    if (!cameled.ok) {
      throw new DeployError(
        "BACKEND",
        `deploy rejected by backend (deployment ${cameled.deployment.id})`,
      );
    }
    await this.audit({
      action: "deploy",
      platform,
      appSourceId: input.appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return cameled;
  }

  async activate(input: ActivateInput): Promise<ActivateResult> {
    const platform = cleanPlatform(input.platform);
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
    await this.audit({
      action: "activate",
      platform,
      apps: input.apps ?? [],
      targetTags: input.targetTags,
      actor: input.actor,
      ts: Date.now(),
    });
    return cameled;
  }

  /** Deactivate one app: clears its live pointer and unloads the binary. The
   *  deployment's git record and activation history are untouched. */
  async deactivateApp(input: DeactivateAppInput): Promise<void> {
    const platform = cleanPlatform(input.platform);
    const app = required(input.app, "app");
    const query =
      input.appSourceId != null
        ? `?app_source_id=${encodeURIComponent(String(input.appSourceId))}`
        : "";
    await this.post<unknown>(
      `/api/platforms/${encodeURIComponent(platform)}/apps/${encodeURIComponent(app)}/deactivate${query}`,
      {},
      "deactivate",
      this.resolveBearer(input.bearer),
    );
    await this.audit({
      action: "deactivate",
      platform,
      apps: [app],
      actor: input.actor,
      ts: Date.now(),
    });
  }

  async promote(input: PromoteInput): Promise<PromoteResult> {
    const platform = cleanPlatform(input.platform);
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
    await this.audit({
      action: "promote",
      platform,
      apps: input.apps ?? [],
      targetTags: input.targetTags,
      actor: input.actor,
      ts: Date.now(),
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
    const platform = cleanPlatform(input.platform);
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
    await this.audit({
      action: "rerun",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
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
    const platform = cleanPlatform(input.platform);
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
    await this.audit({
      action: "status",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
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
    const baseDelayMs = options?.baseDelayMs ?? 3000;
    const maxDelayMs = options?.maxDelayMs ?? 30000;
    const maxRetries = options?.maxRetries ?? 8;
    const signal = options?.signal;

    let failures = 0;
    let lastCompleted = 0;
    let lastProgress: ProgressModel = {
      completed: 0,
      total: 8,
      label: "Waiting for build",
    };

    while (!signal?.aborted && failures < maxRetries) {
      try {
        const status = await this.status({ platform, deploymentId });
        const mapped = this.buildProgressModel(status, lastCompleted);
        const completed = Math.max(mapped.completed, lastCompleted);
        const progress: ProgressModel = { ...mapped, completed };
        lastCompleted = completed;
        lastProgress = progress;

        const isTerminal =
          status.state === "ready" ||
          status.state === "failed" ||
          status.state === "no_ci";
        onEvent({
          kind: isTerminal ? "terminal" : "progress",
          status,
          progress,
        });

        if (isTerminal) return;

        failures = 0;
        await sleep(this.backoffDelay(0, baseDelayMs, maxDelayMs));
      } catch (err) {
        // Non-retryable HTTP error — bail immediately
        if (
          err instanceof BackendError &&
          err.status >= 400 &&
          err.status < 500
        ) {
          onEvent({
            kind: "error",
            status: {
              state: "failed",
              releaseTags: [],
              message: err.message,
            },
            progress: lastProgress,
            error: err,
          });
          return;
        }
        failures++;
        onEvent({
          kind: "warning",
          status: {
            state: "failed",
            releaseTags: [],
            message: `Polling attempt failed (${failures}/${maxRetries}): ${err instanceof Error ? err.message : String(err)}`,
          },
          progress: lastProgress,
          error: err instanceof Error ? err : new Error(String(err)),
        });
        await sleep(this.backoffDelay(failures, baseDelayMs, maxDelayMs));
      }
    }

    // Loop exited without a terminal state — emit error event
    const errorMsg = signal?.aborted
      ? "Watch cancelled"
      : `Polling stopped after ${maxRetries} consecutive failures`;
    onEvent({
      kind: "error",
      status: {
        state: "failed",
        releaseTags: [],
        message: errorMsg,
      },
      progress: lastProgress,
      error: new Error(errorMsg),
    });
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
    const platform = cleanPlatform(input.platform);
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
    await this.audit({
      action: "mint_token",
      platform,
      scope: input.scope,
      actor: input.actor,
      ts: Date.now(),
    });
    return {
      id: Number(raw.id),
      token: String(raw.token),
      scope: (raw.scope as string) ?? input.scope,
    };
  }

  /** List a platform's activation tokens. `GET /api/platforms/:platform/tokens`. */
  async listTokens(input: ListTokensInput): Promise<TokenRecord[]> {
    const platform = cleanPlatform(input.platform);
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.get<unknown>(
      `/api/platforms/${encodeURIComponent(platform)}/tokens`,
      "list_tokens",
      bearer,
    );
    await this.audit({
      action: "list_tokens",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return (Array.isArray(raw) ? raw : []).map(camelTokenRecord);
  }

  /** Revoke a token by id. `DELETE /api/platforms/:platform/tokens/:id`. */
  async revokeToken(input: RevokeTokenInput): Promise<boolean> {
    const platform = cleanPlatform(input.platform);
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
    await this.audit({
      action: "revoke_token",
      platform,
      tokenId: id,
      actor: input.actor,
      ts: Date.now(),
    });
    return raw === true;
  }

  // ──────────────────────── Bootstrap: app sources ──────────────────────────

  /**
   * Resolve (sync) the GitHub App source row for a repo already installed on
   * the Aomi GitHub App, returning its `id` — the `appSourceId` deploy needs.
   * `POST /api/platforms/:platform/sources/sync-installed`.
   */
  async syncSource(input: SyncSourceInput): Promise<AppSource> {
    const platform = cleanPlatform(input.platform);
    const repo = required(input.repo, "repo");
    const bearer = this.resolveBearer(input.bearer);
    const body: { repo: string; github_user_id?: string } = { repo };
    if (input.githubUserId !== undefined) {
      body.github_user_id = required(input.githubUserId, "githubUserId");
    }
    const raw = await this.post<{ ok?: boolean; source?: unknown }>(
      `/api/platforms/${encodeURIComponent(platform)}/sources/sync-installed`,
      body,
      "sync_source",
      bearer,
    );
    await this.audit({
      action: "sync_source",
      platform,
      repo,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelAppSource(raw.source);
  }

  /**
   * One-shot: create a new source repo from a template in the installation's
   * account and return its source row. The portal "one-click" path.
   * `POST /api/integrations/github-app/platforms/:platform/sources/create-from-template`.
   */
  async scaffold(input: ScaffoldInput): Promise<AppSource> {
    const platform = cleanPlatform(input.platform);
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
    const raw = await this.post<{ ok?: boolean; source?: unknown }>(
      `/api/integrations/github-app/platforms/${encodeURIComponent(platform)}/sources/create-from-template`,
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
    await this.audit({
      action: "scaffold",
      platform,
      repo: repoName,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelAppSource(raw.source);
  }

  // ──────────────────────── Bootstrap: platform apps ────────────────────────

  /** List loaded apps on a platform. `GET /api/platforms/:platform/apps`. */
  async listApps(input: ListAppsInput): Promise<PlatformApp[]> {
    const platform = cleanPlatform(input.platform);
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.get<{ apps?: unknown[] }>(
      `/api/platforms/${encodeURIComponent(platform)}/apps`,
      "list_apps",
      bearer,
    );
    await this.audit({
      action: "list_apps",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return (raw.apps ?? []).map(camelPlatformApp);
  }

  /** Get one app on a platform. `GET /api/platforms/:platform/apps/:app`. */
  async getApp(input: GetAppInput): Promise<PlatformApp> {
    const platform = cleanPlatform(input.platform);
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
    await this.audit({
      action: "get_app",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelPlatformApp(raw.app);
  }

  // ──────────────────── Sign-in: identity + user sources ────────────────────

  /**
   * Exchange a GitHub OAuth `code` for the user's identity (login flow). The
   * client secret stays backend-side; this is the portal's sign-in seam.
   * `GET /api/integrations/github-app/oauth/exchange`.
   */
  async exchangeGitHubCode(
    input: ExchangeGitHubCodeInput,
  ): Promise<GitHubIdentity> {
    const code = required(input.code, "code");
    const params = new URLSearchParams({ code });
    if (input.app) params.set("app", String(input.app));
    if (input.redirectUri?.trim()) {
      params.set("redirect_uri", input.redirectUri.trim());
    }
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.get<{
      github_user_id?: string;
      github_login?: string;
      installation_id?: number | string | null;
    }>(
      `/api/integrations/github-app/oauth/exchange?${params.toString()}`,
      "exchange_github_code",
      bearer,
    );
    return {
      githubUserId: String(raw.github_user_id ?? ""),
      githubLogin: String(raw.github_login ?? ""),
      installationId:
        raw.installation_id === null || raw.installation_id === undefined
          ? null
          : String(raw.installation_id),
    };
  }

  /**
   * Source repos a GitHub user connected. Passing `platform` asks the backend
   * to return only launch-relevant sources for that platform.
   */
  async listUserSources(input: ListUserSourcesInput): Promise<UserSource[]> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const bearer = this.resolveBearer(input.bearer);
    const params = new URLSearchParams({ github_user_id: githubUserId });
    if (input.platform?.trim()) params.set("platform", input.platform.trim());
    const raw = await this.get<{ sources?: unknown[] }>(
      `/api/integrations/github-app/user/sources?${params.toString()}`,
      "list_user_sources",
      bearer,
    );
    await this.audit({
      action: "list_user_sources",
      platform: input.platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return (raw.sources ?? []).map(camelUserSource);
  }

  async listUserDeployments(
    input: ListUserDeploymentsInput,
  ): Promise<UserDeploymentsPage> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const platform = cleanPlatform(input.platform);
    const bearer = this.resolveBearer(input.bearer);
    const params = new URLSearchParams({
      github_user_id: githubUserId,
      platform,
    });
    if (input.limit && Number.isSafeInteger(input.limit) && input.limit > 0) {
      params.set("limit", String(input.limit));
    }
    if (input.cursor) {
      params.set("cursor_created_at", String(input.cursor.createdAt));
      params.set("cursor_id", String(input.cursor.id));
    }
    const raw = await this.get<{
      deployments?: unknown[];
      next_cursor?: unknown;
    }>(
      `/api/integrations/github-app/user/deployments?${params.toString()}`,
      "list_user_deployments",
      bearer,
    );
    await this.audit({
      action: "list_user_deployments",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return {
      deployments: (raw.deployments ?? [])
        .map(camelUserDeployment)
        .filter((deployment): deployment is UserDeployment =>
          Boolean(deployment),
        ),
      nextCursor: camelUserDeploymentsCursor(raw.next_cursor),
    };
  }

  async getUserSourceLatestDeployment(
    input: GetUserSourceLatestDeploymentInput,
  ): Promise<UserSourceLatestDeployment | null> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const platform = cleanPlatform(input.platform);
    const appSourceId = required(String(input.appSourceId), "appSourceId");
    const bearer = this.resolveBearer(input.bearer);
    const params = new URLSearchParams({
      github_user_id: githubUserId,
      platform,
    });
    const raw = await this.get<{ latest_deployment?: unknown }>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        appSourceId,
      )}/latest-deployment?${params.toString()}`,
      "get_user_source_latest_deployment",
      bearer,
    );
    await this.audit({
      action: "get_user_source_latest_deployment",
      platform,
      appSourceId: input.appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelUserSourceLatestDeployment(raw.latest_deployment) ?? null;
  }

  async listUserSourceDeployments(
    input: ListUserSourceDeploymentsInput,
  ): Promise<UserSourceLatestDeployment[]> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const platform = cleanPlatform(input.platform);
    const appSourceId = required(String(input.appSourceId), "appSourceId");
    const bearer = this.resolveBearer(input.bearer);
    const params = new URLSearchParams({
      github_user_id: githubUserId,
      platform,
    });
    if (input.limit && Number.isSafeInteger(input.limit) && input.limit > 0) {
      params.set("limit", String(input.limit));
    }
    const raw = await this.get<{ deployments?: unknown[] }>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        appSourceId,
      )}/deployments?${params.toString()}`,
      "list_user_source_deployments",
      bearer,
    );
    await this.audit({
      action: "list_user_source_deployments",
      platform,
      appSourceId: input.appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return (raw.deployments ?? [])
      .map(camelUserSourceLatestDeployment)
      .filter((deployment): deployment is UserSourceLatestDeployment =>
        Boolean(deployment),
      );
  }

  async listUserSourceBots(
    input: OwnedOperateSourceInput,
  ): Promise<BotRegistration[]> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    const raw = await this.get<{ bot_registrations?: unknown[] }>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/bots?${params.toString()}`,
      "list_user_source_bots",
      bearer,
    );
    await this.audit({
      action: "list_user_source_bots",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return ((raw.bot_registrations ?? []) as unknown[]).map(
      camelBotRegistration,
    );
  }

  async createUserSourceBot(
    input: CreateUserSourceBotInput,
  ): Promise<BotRegistration> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    const botPlatform = required(input.botPlatform, "botPlatform");
    const applicationId = required(
      String(input.applicationId),
      "applicationId",
    );
    const credential = required(input.credential, "credential");
    const raw = await this.post<{ bot_registration?: unknown }>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/bots?${params.toString()}`,
      {
        platform: botPlatform,
        application_id: Number(applicationId),
        label: input.label,
        credential,
        thread_mode: input.threadMode,
      },
      "create_user_source_bot",
      bearer,
    );
    await this.audit({
      action: "create_user_source_bot",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelBotRegistration(raw.bot_registration);
  }

  async deleteUserSourceBot(input: DeleteUserSourceBotInput): Promise<void> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    const botId = required(input.botId, "botId");
    await this.del<unknown>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/bots/${encodeURIComponent(botId)}?${params.toString()}`,
      "delete_user_source_bot",
      bearer,
    );
    await this.audit({
      action: "delete_user_source_bot",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
  }

  async listUserBots(input: OwnedOperateInput): Promise<BotRegistration[]> {
    const { params, platform, bearer } = this.ownedOperateUserRequest(input);
    const raw = await this.get<{ bot_registrations?: unknown[] }>(
      `/api/integrations/github-app/user/bots?${params.toString()}`,
      "list_user_bots",
      bearer,
    );
    await this.audit({
      action: "list_user_bots",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return ((raw.bot_registrations ?? []) as unknown[]).map(
      camelBotRegistration,
    );
  }

  async createUserBot(input: CreateUserBotInput): Promise<BotRegistration> {
    const { params, platform, bearer } = this.ownedOperateUserRequest(input);
    const credential = required(input.credential, "credential");
    const raw = await this.post<{ bot_registration?: unknown }>(
      `/api/integrations/github-app/user/bots?${params.toString()}`,
      {
        platform: required(input.botPlatform, "botPlatform"),
        application_ids: input.applicationIds,
        primary_application_id: input.primaryApplicationId,
        label: input.label,
        credential,
        thread_mode: input.threadMode,
      },
      "create_user_bot",
      bearer,
    );
    await this.audit({
      action: "create_user_bot",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelBotRegistration(raw.bot_registration);
  }

  async updateUserBot(input: UpdateUserBotInput): Promise<BotRegistration> {
    const { params, platform, bearer } = this.ownedOperateUserRequest(input);
    const raw = await this.patch<{ bot_registration?: unknown }>(
      `/api/integrations/github-app/user/bots/${encodeURIComponent(required(input.botId, "botId"))}?${params.toString()}`,
      {
        application_ids: input.applicationIds,
        primary_application_id: input.primaryApplicationId,
      },
      "update_user_bot",
      bearer,
    );
    await this.audit({
      action: "update_user_bot",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelBotRegistration(raw.bot_registration);
  }

  async deleteUserBot(input: DeleteUserBotInput): Promise<void> {
    const { params, platform, bearer } = this.ownedOperateUserRequest(input);
    await this.del<unknown>(
      `/api/integrations/github-app/user/bots/${encodeURIComponent(required(input.botId, "botId"))}?${params.toString()}`,
      "delete_user_bot",
      bearer,
    );
    await this.audit({
      action: "delete_user_bot",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
  }

  /** All builder-owned model keys with their grants (funder-ladder app
   *  rung). Names/prefixes/grants only — key material is write-only. */
  async listBuilderModelKeys(
    input: BuilderModelKeysInput,
  ): Promise<BuilderModelKey[]> {
    const { params, bearer } = this.builderKeyRequest(input);
    const raw = await this.get<{ keys?: unknown[] }>(
      `/api/integrations/github-app/user/model-keys?${params.toString()}`,
      "list_builder_model_keys",
      bearer,
    );
    await this.audit({
      action: "list_builder_model_keys",
      platform: input.platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return (raw.keys ?? []).map(camelBuilderModelKey);
  }

  /** Create (no `keyId`) or rotate (`keyId` set) a builder model key. */
  async saveBuilderModelKey(
    input: SaveBuilderModelKeyInput,
  ): Promise<BuilderModelKey> {
    const { params, bearer } = this.builderKeyRequest(input);
    const provider = required(input.provider, "provider");
    const key = required(input.key, "key");
    const body = { provider, key, label: input.label };
    const raw =
      input.keyId === undefined
        ? await this.post<{ key?: unknown }>(
            `/api/integrations/github-app/user/model-keys?${params.toString()}`,
            body,
            "save_builder_model_key",
            bearer,
          )
        : await this.put<{ key?: unknown }>(
            `/api/integrations/github-app/user/model-keys/${encodeURIComponent(
              String(input.keyId),
            )}?${params.toString()}`,
            body,
            "save_builder_model_key",
            bearer,
          );
    await this.audit({
      action: "save_builder_model_key",
      platform: input.platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelBuilderModelKey(raw.key);
  }

  async deleteBuilderModelKey(
    input: DeleteBuilderModelKeyInput,
  ): Promise<void> {
    const { params, bearer } = this.builderKeyRequest(input);
    const keyId = required(String(input.keyId), "keyId");
    await this.del<unknown>(
      `/api/integrations/github-app/user/model-keys/${encodeURIComponent(keyId)}?${params.toString()}`,
      "delete_builder_model_key",
      bearer,
    );
    await this.audit({
      action: "delete_builder_model_key",
      platform: input.platform,
      actor: input.actor,
      ts: Date.now(),
    });
  }

  /** Replace a key's grant set ("apply to projects"). */
  async setModelKeyGrants(
    input: SetModelKeyGrantsInput,
  ): Promise<BuilderModelKey> {
    const { params, bearer } = this.builderKeyRequest(input);
    const keyId = required(String(input.keyId), "keyId");
    const raw = await this.put<{ key?: unknown }>(
      `/api/integrations/github-app/user/model-keys/${encodeURIComponent(keyId)}/grants?${params.toString()}`,
      { application_ids: input.applicationIds },
      "set_model_key_grants",
      bearer,
    );
    await this.audit({
      action: "set_model_key_grants",
      platform: input.platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelBuilderModelKey(raw.key);
  }

  private builderKeyRequest(input: BuilderModelKeysInput): {
    params: URLSearchParams;
    bearer: string;
  } {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const platform = required(input.platform, "platform");
    const bearer = this.resolveBearer(input.bearer);
    const params = new URLSearchParams({
      github_user_id: githubUserId,
      platform,
    });
    return { params, bearer };
  }

  async listUserSourceTransactions(
    input: ListUserSourceTransactionsInput,
  ): Promise<OperateTransactionsResult> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    if (input.limit && Number.isSafeInteger(input.limit) && input.limit > 0) {
      params.set("limit", String(input.limit));
    }
    if (input.status?.trim()) params.set("status", input.status.trim());
    const cursor = encodeTransactionCursor(input.cursor);
    if (cursor) params.set("cursor", cursor);
    const raw = await this.get<Record<string, unknown>>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/transactions?${params.toString()}`,
      "list_user_source_transactions",
      bearer,
    );
    await this.audit({
      action: "list_user_source_transactions",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelOperateTransactions(raw, platform);
  }

  async getUserSourceUsage(
    input: GetUserSourceUsageInput,
  ): Promise<OperateUsageResult> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    if (input.fromDate?.trim()) params.set("from_date", input.fromDate.trim());
    if (input.toDate?.trim()) params.set("to_date", input.toDate.trim());
    const raw = await this.get<Record<string, unknown>>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/usage?${params.toString()}`,
      "get_user_source_usage",
      bearer,
    );
    await this.audit({
      action: "get_user_source_usage",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelOperateUsage(raw, platform);
  }

  async getUserSourceStatement(
    input: GetUserSourceUsageInput,
  ): Promise<OperateStatementResult> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    if (input.fromDate?.trim()) params.set("from_date", input.fromDate.trim());
    if (input.toDate?.trim()) params.set("to_date", input.toDate.trim());
    const raw = await this.get<Record<string, unknown>>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/statement?${params.toString()}`,
      "get_user_source_statement",
      bearer,
    );
    await this.audit({
      action: "get_user_source_statement",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelOperateStatement(raw, platform);
  }

  async listUserSourceLogs(
    input: ListUserSourceLogsInput,
  ): Promise<OperateLogsResult> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    if (input.limit && Number.isSafeInteger(input.limit) && input.limit > 0) {
      params.set("limit", String(input.limit));
    }
    if (input.type?.trim()) params.set("type", input.type.trim());
    const cursor = encodeLogCursor(input.cursor);
    if (cursor) params.set("cursor", cursor);
    const raw = await this.get<Record<string, unknown>>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/logs?${params.toString()}`,
      "list_user_source_logs",
      bearer,
    );
    await this.audit({
      action: "list_user_source_logs",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelOperateLogs(raw, platform);
  }

  async getUserSourceObservability(
    input: OwnedOperateSourceInput,
  ): Promise<OperateObservabilityResult> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    const raw = await this.get<Record<string, unknown>>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/observability?${params.toString()}`,
      "get_user_source_observability",
      bearer,
    );
    await this.audit({
      action: "get_user_source_observability",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelOperateObservability(raw, platform);
  }

  async getUserSourceAppDetail(
    input: GetUserSourceAppDetailInput,
  ): Promise<OperateAppDetailResult> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    const applicationId = required(
      String(input.applicationId),
      "applicationId",
    );
    const raw = await this.get<Record<string, unknown>>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/apps/${encodeURIComponent(applicationId)}/detail?${params.toString()}`,
      "get_user_source_app_detail",
      bearer,
    );
    await this.audit({
      action: "get_user_source_app_detail",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelOperateAppDetail(raw, platform);
  }

  async upgradeUserSourceSdk(
    input: OwnedOperateSourceInput,
  ): Promise<SourceSdkUpgradeResult> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    const raw = await this.post<Record<string, unknown>>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/sdk-upgrade?${params.toString()}`,
      {},
      "upgrade_user_source_sdk",
      bearer,
    );
    await this.audit({
      action: "upgrade_user_source_sdk",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    const status = raw.status;
    const requiredSdkVersion = String(raw.required_sdk_version ?? "");
    const sourceRef = String(raw.source_ref ?? "");
    if (status === "current") {
      return { status, requiredSdkVersion, sourceRef };
    }
    if (status === "pull_request") {
      const pullRequest = responseRecord(raw.pull_request, "pull_request");
      return {
        status,
        requiredSdkVersion,
        sourceRef,
        branch: String(raw.branch ?? ""),
        files: Array.isArray(raw.files) ? raw.files.map(String) : [],
        pullRequest: {
          number: Number(pullRequest.number),
          url: String(pullRequest.url ?? ""),
          created: Boolean(pullRequest.created),
        },
      };
    }
    if (status === "manual") {
      return {
        status,
        requiredSdkVersion,
        sourceRef,
        reason: String(raw.reason ?? "SDK upgrade requires a local change."),
        command: String(raw.command ?? ""),
      };
    }
    throw new DeployError(
      "BACKEND",
      "backend returned an unknown source SDK upgrade status",
    );
  }

  /**
   * Read the merge state of the `aomi/sdk-<required>` upgrade PR with one
   * GitHub-backed call — the cheap counterpart to {@link upgradeUserSourceSdk},
   * safe to poll. No repo tarball, no branch mutation.
   */
  async sdkUpgradeStatus(
    input: OwnedOperateSourceInput,
  ): Promise<SourceSdkUpgradeStatusResult> {
    const { appSourceId, params, platform, bearer } =
      this.ownedOperateRequest(input);
    const raw = await this.get<Record<string, unknown>>(
      `/api/integrations/github-app/user/sources/${encodeURIComponent(
        String(appSourceId),
      )}/sdk-upgrade-status?${params.toString()}`,
      "get_source_sdk_upgrade_status",
      bearer,
    );
    await this.audit({
      action: "get_source_sdk_upgrade_status",
      platform,
      appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    const status = raw.status;
    if (
      status !== "merged" &&
      status !== "open" &&
      status !== "closed" &&
      status !== "none"
    ) {
      throw new DeployError(
        "BACKEND",
        "backend returned an unknown source SDK upgrade status",
      );
    }
    const pr =
      raw.pull_request && typeof raw.pull_request === "object"
        ? (raw.pull_request as Record<string, unknown>)
        : null;
    return {
      status,
      requiredSdkVersion: String(raw.required_sdk_version ?? ""),
      branch: String(raw.branch ?? ""),
      pullRequest: pr
        ? {
            number: Number(pr.number),
            url: String(pr.url ?? ""),
            state: String(pr.state ?? ""),
            merged: Boolean(pr.merged),
          }
        : null,
    };
  }

  async listDeploymentRecords(
    input: ListDeploymentRecordsInput,
  ): Promise<ListDeploymentRecordsResult> {
    const platform = cleanPlatform(input.platform);
    const app = required(input.app, "app");
    const query =
      input.appSourceId != null
        ? `?app_source_id=${encodeURIComponent(String(input.appSourceId))}`
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
    const sourceId = input.sourceId?.trim();
    const raw = await this.post<{ handles?: Record<string, string> }>(
      `/api/_internal/secrets`,
      {
        user_id: githubUserId,
        app,
        ...(sourceId ? { source_id: sourceId } : {}),
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
    if (input.sourceId?.trim()) params.set("source_id", input.sourceId.trim());
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
    const sourceId = input.sourceId?.trim();
    const raw = await this.del<{ removed?: boolean }>(
      `/api/_internal/secrets`,
      "ingest_secrets",
      this.resolveBearer(input.bearer, { privileged: true }),
      {
        user_id: githubUserId,
        app,
        ...(sourceId ? { source_id: sourceId } : {}),
        name,
      },
    );
    return Boolean(raw.removed);
  }

  endpoint(path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  private buildProgressModel(
    status: DeploymentStatus,
    lastCompleted: number,
  ): ProgressModel {
    const total = 8;
    switch (status.state) {
      case "pending":
        return { completed: 1, total, label: "Waiting for build" };
      case "building":
        return { completed: 2, total, label: "Building CI" };
      case "releasing":
        return { completed: 5, total, label: "Verifying release assets" };
      case "ready":
        return { completed: 8, total, label: "Build ready" };
      case "no_ci":
        return { completed: lastCompleted, total, label: "No CI" };
      case "failed":
        return { completed: lastCompleted, total, label: "Build failed" };
      default:
        return { completed: lastCompleted, total, label: "Waiting for build" };
    }
  }

  private ownedOperateRequest(input: OwnedOperateSourceInput): {
    appSourceId: number;
    params: URLSearchParams;
    platform: string;
    bearer: string;
  } {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const platform = cleanPlatform(input.platform);
    const appSourceId = Number(input.appSourceId);
    if (!Number.isSafeInteger(appSourceId) || appSourceId <= 0) {
      throw new DeployError(
        "INVALID_REQUEST",
        "operate source reads require a positive appSourceId",
      );
    }
    return {
      appSourceId,
      platform,
      bearer: this.resolveBearer(input.bearer),
      params: new URLSearchParams({
        github_user_id: githubUserId,
        platform,
      }),
    };
  }

  private ownedOperateUserRequest(input: OwnedOperateInput): {
    params: URLSearchParams;
    platform: string;
    bearer: string;
  } {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const platform = cleanPlatform(input.platform);
    return {
      platform,
      bearer: this.resolveBearer(input.bearer),
      params: new URLSearchParams({ github_user_id: githubUserId, platform }),
    };
  }

  private backoffDelay(
    failures: number,
    baseMs: number,
    maxMs: number,
  ): number {
    return Math.min(baseMs * Math.pow(2, failures), maxMs);
  }

  private async get<Resp>(
    path: string,
    operation: string,
    bearer: string,
  ): Promise<Resp> {
    return this.request<Resp>(path, { method: "GET" }, operation, bearer);
  }

  private async post<Resp>(
    path: string,
    body: unknown,
    operation: string,
    bearer: string,
  ): Promise<Resp> {
    return this.request<Resp>(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      operation,
      bearer,
    );
  }

  private async patch<Resp>(
    path: string,
    body: unknown,
    operation: string,
    bearer: string,
  ): Promise<Resp> {
    return this.request<Resp>(
      path,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      operation,
      bearer,
    );
  }

  private async put<Resp>(
    path: string,
    body: unknown,
    operation: string,
    bearer: string,
  ): Promise<Resp> {
    return this.request<Resp>(
      path,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      operation,
      bearer,
    );
  }

  private async del<Resp>(
    path: string,
    operation: string,
    bearer: string,
    body?: unknown,
  ): Promise<Resp> {
    const init: RequestInit =
      body === undefined
        ? { method: "DELETE" }
        : {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          };
    return this.request<Resp>(path, init, operation, bearer);
  }

  private async request<Resp>(
    path: string,
    init: RequestInit,
    operation: string,
    bearer: string,
  ): Promise<Resp> {
    const url = this.endpoint(path);
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${bearer}`,
          ...(init.headers ?? {}),
        },
      });
    } catch (err) {
      throw new BackendError(
        operation,
        0,
        `${operation} request failed`,
        undefined,
        { cause: err },
      );
    }

    const text = await res.text();
    if (!res.ok) {
      throw new BackendError(
        operation,
        res.status,
        `${operation} failed (${res.status})`,
        text,
      );
    }
    if (!text.trim()) return null as Resp;
    try {
      return JSON.parse(text) as Resp;
    } catch (error) {
      throw new BackendError(
        operation,
        res.status,
        `${operation} returned invalid JSON`,
        text,
        { cause: error },
      );
    }
  }

  private async audit(event: AuditEvent): Promise<void> {
    if (this.opts.onAudit) await this.opts.onAudit(event);
  }
}

export function assertServerOnly(): void {
  const g = globalThis as Record<string, unknown>;
  if (g.__AOMI_ALLOW_BROWSER__ === true) return;
  if (
    typeof (g as { window?: unknown }).window !== "undefined" &&
    typeof (g as { document?: unknown }).document !== "undefined"
  ) {
    throw new BrowserEnvironmentError(
      "@aomi-labs/deploy is server-only: it holds the activation token and " +
        "must never run in a browser. Import it from a server route handler.",
    );
  }
}

function deployRequest(
  input: DeployInput | PreflightInput,
  preflight: boolean,
): Record<string, unknown> {
  const appSourceId = Number(input.appSourceId);
  if (!Number.isSafeInteger(appSourceId) || appSourceId <= 0) {
    throw new DeployError(
      "INVALID_REQUEST",
      "deploy requires a positive appSourceId",
    );
  }
  const aomiTomlPaths = cleanStringList(
    input.aomiTomlPaths ?? [],
    "aomiTomlPaths",
    true,
  );
  return {
    app_source_id: appSourceId,
    source_ref: sourceRef(input.sourceRef),
    aomi_toml_paths: aomiTomlPaths,
    ...(preflight ? { preflight: true } : {}),
  };
}

function activateRequest(input: ActivateInput): Record<string, unknown> {
  const apps = cleanStringList(input.apps ?? [], "apps", true);
  const targetTags = cleanStringList(
    input.targetTags ?? [],
    "targetTags",
    true,
  );
  const target = releaseTagsTarget(input.target);
  const releaseTags = target.value as string[];
  if (apps.length > 0 && apps.length !== releaseTags.length) {
    throw new DeployError(
      "INVALID_REQUEST",
      "release_tags activation requires the same number of apps and release tags",
    );
  }
  return {
    target,
    ...(apps.length ? { apps } : {}),
    ...(targetTags.length ? { target_tags: targetTags } : {}),
  };
}

function sourceRef(ref: DeployInput["sourceRef"]): string {
  const clean = required(ref, "sourceRef");
  if (!/^[0-9a-f]{7,40}$/i.test(clean)) {
    throw new DeployError(
      "INVALID_REQUEST",
      "sourceRef must be a git commit SHA (7-40 hex chars)",
    );
  }
  return clean.toLowerCase();
}

function releaseTagsTarget(
  ref: ActivateInput["target"],
): Record<string, unknown> {
  if (ref.kind !== "release_tags") {
    throw new DeployError(
      "INVALID_REQUEST",
      "activation target.kind must be release_tags",
    );
  }
  return {
    kind: "release_tags",
    value: cleanStringList(ref.value, "target.value"),
  };
}

function cleanPlatform(value: string): string {
  return required(value, "platform");
}

function required(value: string | undefined | null, field: string): string {
  const clean = value?.trim();
  if (!clean) throw new DeployError("INVALID_REQUEST", `${field} is required`);
  return clean;
}

function isResponseRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function responseRecord(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (!isResponseRecord(value)) {
    throw new DeployError("BACKEND", `backend response is missing ${field}`);
  }
  return value;
}

function cleanStringList(
  values: string[],
  field: string,
  allowEmpty = false,
): string[] {
  const clean = values.map((value) => value.trim()).filter(Boolean);
  if (!allowEmpty && clean.length === 0) {
    throw new DeployError(
      "INVALID_REQUEST",
      `${field} must contain at least one value`,
    );
  }
  return clean;
}

function camelDeployResult(result: unknown): DeployResult {
  const raw = result as Record<string, any>;
  const deployment = raw.deployment ?? {};
  const source = deployment.source ?? {};
  const platform = deployment.platform ?? {};
  return {
    ok: Boolean(raw.ok),
    deployment: {
      id: deployment.id,
      status: deployment.status,
      sdkVersion: deployment.sdk_version ?? deployment.sdkVersion ?? null,
      source: {
        installationId: source.installation_id,
        repositoryId: source.repository_id,
        repositoryLink: source.repository_link,
        ownerRepoName: source.owner_repo_name,
        ref: source.ref,
        commitHash: source.commit_hash,
        aomiTomlPaths: source.aomi_toml_paths ?? [],
      },
      platform: {
        platform: platform.platform,
        repository: platform.repository,
        deployBranch: platform.deploy_branch,
        sourceBranch: platform.source_branch,
        commitHash: platform.commit_hash ?? null,
        prNumber: platform.pr_number ?? null,
        prUrl: platform.pr_url ?? null,
        ciStatus: platform.ci_status ?? null,
        ciUrl: platform.ci_url ?? null,
        apps: (platform.apps ?? []).map((app: Record<string, any>) => ({
          name: app.name,
          path: app.path,
          aomiTomlPath: app.aomi_toml_path,
          releaseTag: app.release_tag,
          sdkVersion: app.sdk_version ?? app.sdkVersion ?? null,
          target: app.target ?? null,
          files: (app.files ?? []).map((file: Record<string, any>) => ({
            path: file.path,
            sha256: file.sha256,
            bytes: Number(file.bytes ?? 0),
          })),
        })),
      },
    },
  };
}

function camelActivateResult(result: unknown): ActivateResult {
  const raw = result as Record<string, any>;
  const activation = raw.activation ?? {};
  const target = activation.target ?? {};
  return {
    ok: Boolean(raw.ok),
    activation: {
      status: activation.status,
      platform: activation.platform,
      target: {
        kind: target.kind,
        value: target.value,
        platformRepo: target.platform_repo ?? null,
        platformBranch: target.platform_branch ?? null,
        platformCommitHash: target.platform_commit_hash ?? null,
        ciStatus: target.ci_status ?? null,
        ciUrl: target.ci_url ?? null,
        promoted: (target.promoted ?? []).map(
          (promotion: Record<string, any>) => ({
            name: promotion.name,
            releaseTag: promotion.release_tag,
            sourceBranch: promotion.source_branch,
            platformCommitHash:
              promotion.platform_commit_hash ??
              promotion.activated_commit_hash ??
              null,
            liveCommitHash: promotion.live_commit_hash ?? null,
            activationStatus: promotion.activation_status ?? null,
            ciStatus: promotion.ci_status,
            ciUrl: promotion.ci_url ?? null,
            releaseAssets: promotion.release_assets ?? [],
            releaseAssetDigests: promotion.release_asset_digests ?? {},
          }),
        ),
      },
      apps: (activation.apps ?? []).map((app: Record<string, any>) => ({
        applicationId: app.application_id ?? app.applicationId ?? null,
        name: app.name,
        path: app.path ?? null,
        releaseTag: app.release_tag ?? null,
        isActive: Boolean(app.is_active),
        artifactReady: Boolean(app.artifact_ready ?? app.artifactReady),
        loaded: Boolean(app.loaded),
        error: app.error ?? null,
        sourceBranch: app.source_branch ?? null,
        liveCommitHash: app.live_commit_hash ?? null,
        activationStatus: app.activation_status ?? null,
        activationPr: app.activation_pr ?? app.activationPr ?? null,
        activationPrCloseError:
          app.activation_pr_close_error ?? app.activationPrCloseError ?? null,
      })),
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function camelStatusResult(raw: Record<string, unknown>): DeploymentStatus {
  const apps = (raw.apps ?? []) as Record<string, unknown>[];
  return {
    state: raw.state as DeploymentStatus["state"],
    deployment: raw.deployment
      ? camelDeployResult({ deployment: raw.deployment }).deployment
      : undefined,
    releaseTags: (raw.release_tags ?? raw.releaseTags ?? []) as string[],
    apps: apps.length
      ? apps.map((app: Record<string, unknown>) => ({
          name: app.name as string,
          releaseTag: (app.release_tag ?? app.releaseTag) as string,
          releaseReady: Boolean(app.release_ready ?? app.releaseReady),
          releaseAssets: (app.release_assets ??
            app.releaseAssets ??
            []) as string[],
          releaseAssetDigests: (app.release_asset_digests ??
            app.releaseAssetDigests ??
            {}) as Record<string, string>,
          message: (app.message ?? null) as string | null,
        }))
      : undefined,
    ci: raw.ci
      ? {
          status: (raw.ci as Record<string, unknown>).status as
            | string
            | undefined,
          url: (raw.ci as Record<string, unknown>).url as string | undefined,
          commitHash: ((raw.ci as Record<string, unknown>).commit_hash ??
            (raw.ci as Record<string, unknown>).commitHash) as
            | string
            | undefined,
        }
      : undefined,
    message: raw.message as string | undefined,
  };
}

function camelAppSource(raw: unknown): AppSource {
  const s = (raw ?? {}) as Record<string, any>;
  return {
    id: Number(s.id),
    installationId: Number(s.installation_id),
    repositoryId: s.repository_id ?? null,
    repositoryLink: s.repository_link ?? null,
    sourceRef: s.source_ref ?? null,
    commitHash: s.commit_hash ?? s.source_ref ?? null,
    githubAccount: s.github_account ?? null,
    githubUserId: s.github_user_id ?? null,
    boundPlatformId: s.bound_platform_id ?? null,
    boundPlatformName: s.bound_platform_name ?? null,
    createdBy: s.created_by ?? s.createdBy ?? null,
    templateRepo: s.template_repo ?? s.templateRepo ?? null,
    launchSourceKind: s.launch_source_kind ?? s.launchSourceKind ?? null,
  };
}

function camelTokenRecord(raw: unknown): TokenRecord {
  const t = (raw ?? {}) as Record<string, any>;
  return {
    id: Number(t.id),
    scope: t.scope ?? null,
    appId: t.app_id ?? null,
    tokenHashPrefix: t.token_hash_prefix ?? "",
    createdAt: t.created_at ?? null,
    lastUsedAt: t.last_used_at ?? null,
    revokedAt: t.revoked_at ?? null,
    appsUsage: t.apps_usage ?? null,
    platformUsage: t.platform_usage ?? null,
  };
}

function camelPlatformApp(raw: unknown): PlatformApp {
  const a = (raw ?? {}) as Record<string, any>;
  return {
    id: Number(a.id),
    name: a.name,
    label: a.label ?? null,
    platform: a.platform ?? null,
    isActive: Boolean(a.is_active),
    isPublic: Boolean(a.is_public),
    appSourceId: a.app_source_id ?? null,
    appReleaseTag: a.app_release_tag ?? null,
    targetTags: a.target_tags ?? [],
    artifactReady: Boolean(a.artifact_ready ?? a.artifactReady),
    loaded: Boolean(a.loaded),
    pricing: camelAppPricing(a.pricing),
  };
}

function camelAppPricing(raw: unknown): PlatformApp["pricing"] {
  if (!raw || typeof raw !== "object") return null;
  const pricing = raw as Record<string, any>;
  const config = (pricing.config ?? {}) as Record<string, any>;
  const resources = (config.resources ?? {}) as Record<
    string,
    Record<string, any>
  >;
  return {
    loadedAt: timestampSeconds(pricing.loaded_at ?? pricing.loadedAt),
    config: {
      version: Number(config.version ?? 0),
      beneficiaries: (
        (config.beneficiaries ?? []) as Record<string, any>[]
      ).map((beneficiary) => ({
        name: String(beneficiary.name ?? ""),
        type: String(beneficiary.type ?? ""),
        chain: String(beneficiary.chain ?? ""),
        value: String(beneficiary.value ?? ""),
      })),
      resources: Object.fromEntries(
        Object.entries(resources).map(([tool, resource]) => [
          tool,
          {
            pricing: {
              flat: Number(resource.pricing?.flat ?? 0),
            },
            beneficiary: resource.beneficiary ?? null,
          },
        ]),
      ),
      outcome: Array.isArray(config.outcome) ? config.outcome : [],
    },
  };
}

function camelBotRegistration(raw: unknown): BotRegistration {
  const b = (raw ?? {}) as Record<string, any>;
  return {
    id: String(b.id),
    platform: String(b.platform ?? ""),
    status: String(b.status ?? ""),
    label: b.label ?? null,
    defaultApp: String(b.default_app ?? b.defaultApp ?? ""),
    defaultAppId: Number(b.default_app_id ?? b.defaultAppId ?? 0),
    apps: ((b.apps ?? []) as Record<string, any>[]).map((app) => ({
      applicationId: Number(app.application_id ?? app.applicationId ?? 0),
      appSourceId: app.app_source_id ?? app.appSourceId ?? null,
      sourceLabel: app.source_label ?? app.sourceLabel ?? null,
      name: String(app.name ?? ""),
      label: String(app.label ?? app.name ?? ""),
      platform: app.platform ?? null,
      isPrimary: Boolean(app.is_primary ?? app.isPrimary),
    })),
    platformBotId: String(b.platform_bot_id ?? b.platformBotId ?? ""),
    platformUsername: b.platform_username ?? b.platformUsername ?? null,
    webhookUrl: b.webhook_url ?? b.webhookUrl ?? null,
    threadMode: String(b.thread_mode ?? b.threadMode ?? "single"),
    createdAt: Number(b.created_at ?? b.createdAt ?? 0),
  };
}

function camelModelKeyUsage(raw: unknown): BuilderModelKeyUsage {
  const u = (raw ?? {}) as Record<string, any>;
  return {
    inputTokens: Number(u.inputTokens ?? 0),
    outputTokens: Number(u.outputTokens ?? 0),
    costCredits: Number(u.costCredits ?? 0),
    turns: Number(u.turns ?? 0),
  };
}

function camelBuilderModelKey(raw: unknown): BuilderModelKey {
  const k = (raw ?? {}) as Record<string, any>;
  return {
    id: Number(k.id),
    provider: String(k.provider ?? ""),
    label: k.label ?? null,
    keyPrefix: String(k.keyPrefix ?? k.key_prefix ?? ""),
    createdAt: Number(k.createdAt ?? k.created_at ?? 0),
    updatedAt: Number(k.updatedAt ?? k.updated_at ?? 0),
    applicationIds: Array.isArray(k.applicationIds ?? k.application_ids)
      ? (k.applicationIds ?? k.application_ids).map(Number)
      : [],
    usage: camelModelKeyUsage(k.usage),
    usageByApplication: Array.isArray(k.usageByApplication)
      ? k.usageByApplication.map((row: unknown) => ({
          applicationId: Number((row as Record<string, any>)?.applicationId),
          ...camelModelKeyUsage(row),
        }))
      : [],
  };
}

function timestampSeconds(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 100_000_000_000 ? Math.floor(value / 1000) : value;
  }
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return numeric > 100_000_000_000 ? Math.floor(numeric / 1000) : numeric;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
}

function camelUserSourceLatestDeployment(
  raw: unknown,
): UserSource["latestDeployment"] {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, any>;
  const apps = (d.apps ?? []) as Record<string, any>[];
  return {
    deploymentId: d.deployment_id ?? d.deploymentId ?? d.id ?? null,
    state: d.state ?? d.status ?? null,
    deployBranch:
      d.deploy_branch ?? d.deployBranch ?? d.platform_branch ?? null,
    platformRepo: d.platform_repo ?? d.platformRepo ?? d.repository ?? null,
    commitHash: d.commit_hash ?? d.commitHash ?? null,
    ciStatus: d.ci_status ?? d.ciStatus ?? d.ci?.status ?? null,
    ciUrl: d.ci_url ?? d.ciUrl ?? d.ci?.url ?? null,
    ciRunId: d.ci_run_id ?? d.ciRunId ?? null,
    releaseTags: (d.release_tags ?? d.releaseTags ?? []) as string[],
    sdkVersion: d.sdk_version ?? d.sdkVersion ?? null,
    artifactTarget: d.artifact_target ?? d.artifactTarget ?? null,
    buildTarget: d.build_target ?? d.buildTarget ?? d.target ?? null,
    createdAt:
      typeof (d.created_at ?? d.createdAt) === "number"
        ? (d.created_at ?? d.createdAt)
        : null,
    apps: apps.map((app) => ({
      name: app.name,
      releaseTag: app.release_tag ?? app.releaseTag ?? null,
      sdkVersion: app.sdk_version ?? app.sdkVersion ?? null,
      target: app.target ?? null,
      applicationId: app.application_id ?? app.applicationId ?? null,
      appSourceId: app.app_source_id ?? app.appSourceId ?? null,
      appReleaseTag: app.app_release_tag ?? app.appReleaseTag ?? null,
      isActive: Boolean(app.is_active ?? app.isActive),
      artifactReady: Boolean(app.artifact_ready ?? app.artifactReady),
      loaded: Boolean(app.loaded),
    })),
  };
}

function camelUserDeployment(raw: unknown): UserDeployment | null {
  if (!raw || typeof raw !== "object") return null;
  const deployment = camelUserSourceLatestDeployment(raw);
  if (!deployment) return null;
  const value = raw as Record<string, any>;
  const sourceId = Number(value.source_id ?? value.sourceId);
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0) return null;
  return {
    ...deployment,
    sourceId,
    repositoryLink: value.repository_link ?? value.repositoryLink ?? null,
  };
}

function camelUserDeploymentsCursor(
  raw: unknown,
): UserDeploymentsPage["nextCursor"] {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, any>;
  const createdAt = Number(value.created_at ?? value.createdAt);
  const id = Number(value.id);
  if (!Number.isSafeInteger(createdAt) || !Number.isSafeInteger(id)) {
    return null;
  }
  return { createdAt, id };
}

function camelUserSource(raw: unknown): UserSource {
  const s = (raw ?? {}) as Record<string, any>;
  return {
    ...camelAppSource(s),
    apps: ((s.apps ?? []) as unknown[]).map(camelPlatformApp),
    latestDeployment: camelUserSourceLatestDeployment(
      s.latest_deployment ?? s.latestDeployment,
    ),
    sdkVersion: s.sdk_version ?? s.sdkVersion ?? null,
  };
}

function encodeTransactionCursor(
  cursor: OperateTransactionCursor | string | null | undefined,
): string | null {
  if (!cursor) return null;
  if (typeof cursor === "string") return cursor;
  return JSON.stringify({ created_at: cursor.createdAt, id: cursor.id });
}

function encodeLogCursor(
  cursor: OperateLogCursor | string | null | undefined,
): string | null {
  if (!cursor) return null;
  if (typeof cursor === "string") return cursor;
  return JSON.stringify({
    occurred_at: cursor.occurredAt,
    event_type: cursor.eventType,
    id: cursor.id,
  });
}

function camelTransactionCursor(raw: unknown): OperateTransactionCursor | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, any>;
  const createdAt = timestampSeconds(c.created_at ?? c.createdAt);
  const id = String(c.id ?? "");
  return createdAt && id ? { createdAt, id } : null;
}

function camelLogCursor(raw: unknown): OperateLogCursor | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, any>;
  const occurredAt = timestampSeconds(c.occurred_at ?? c.occurredAt);
  const eventType = String(c.event_type ?? c.eventType ?? "");
  const id = String(c.id ?? "");
  return occurredAt && eventType && id ? { occurredAt, eventType, id } : null;
}

function optString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function optNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function camelOperateTransactions(
  raw: Record<string, unknown>,
  fallbackPlatform: string,
): OperateTransactionsResult {
  return {
    source: camelAppSource(raw.source),
    platform: String(raw.platform ?? fallbackPlatform),
    transactions: ((raw.transactions ?? []) as Record<string, any>[]).map(
      (row) => ({
        id: String(row.id ?? ""),
        externalTxId: String(row.external_tx_id ?? row.externalTxId ?? ""),
        application: String(row.application ?? ""),
        applicationId: row.application_id ?? row.applicationId ?? null,
        status: String(row.status ?? ""),
        txHash: row.tx_hash ?? row.txHash ?? null,
        chainId: Number(row.chain_id ?? row.chainId ?? 0),
        fromAddress: String(row.from_address ?? row.fromAddress ?? ""),
        toAddress: String(row.to_address ?? row.toAddress ?? ""),
        value: String(row.value ?? "0"),
        hasCalldata: Boolean(row.has_calldata ?? row.hasCalldata),
        calldataPreview: row.calldata_preview ?? row.calldataPreview ?? null,
        description: row.description ?? null,
        createdAt: timestampSeconds(row.created_at ?? row.createdAt),
        updatedAt: timestampSeconds(row.updated_at ?? row.updatedAt),
        submittedAt:
          row.submitted_at == null && row.submittedAt == null
            ? null
            : timestampSeconds(row.submitted_at ?? row.submittedAt),
        family: (row.family ?? null) as "evm" | "svm" | null,
        chainName: optString(row.chain_name ?? row.chainName),
        fromLabel: optString(row.from_label ?? row.fromLabel),
        toLabel: optString(row.to_label ?? row.toLabel),
        valueUsd: optString(row.value_usd ?? row.valueUsd),
        block: optString(row.block),
        slot: optString(row.slot),
        confirmations: optNumber(row.confirmations),
        gasUsed: optString(row.gas_used ?? row.gasUsed),
        gasLimit: optString(row.gas_limit ?? row.gasLimit),
        effGasPrice: optString(row.eff_gas_price ?? row.effGasPrice),
        computeUnits: optString(row.compute_units ?? row.computeUnits),
        computeLimit: optString(row.compute_limit ?? row.computeLimit),
        priorityFee: optString(row.priority_fee ?? row.priorityFee),
        txFee: optString(row.tx_fee ?? row.txFee),
        platformFee: optString(row.platform_fee ?? row.platformFee),
        nonce: optNumber(row.nonce),
        method: optString(row.method),
        transfers: Array.isArray(row.transfers)
          ? row.transfers.map(String)
          : null,
        revertReason: optString(row.revert_reason ?? row.revertReason),
        explorerUrl: optString(row.explorer_url ?? row.explorerUrl),
      }),
    ),
    nextCursor: camelTransactionCursor(raw.next_cursor ?? raw.nextCursor),
  };
}

function camelOperateUsage(
  raw: Record<string, unknown>,
  fallbackPlatform: string,
): OperateUsageResult {
  const range = (raw.range ?? {}) as Record<string, any>;
  return {
    source: camelAppSource(raw.source),
    platform: String(raw.platform ?? fallbackPlatform),
    range: {
      fromDate: String(range.from_date ?? range.fromDate ?? ""),
      toDate: String(range.to_date ?? range.toDate ?? ""),
      maxDays: Number(range.max_days ?? range.maxDays ?? 90),
    },
    daily: ((raw.daily ?? []) as Record<string, any>[]).map((row) => ({
      periodUtcDay: String(row.period_utc_day ?? row.periodUtcDay ?? ""),
      application: String(row.application ?? ""),
      applicationId: Number(row.application_id ?? row.applicationId ?? 0),
      inputTokens: Number(row.input_tokens ?? row.inputTokens ?? 0),
      outputTokens: Number(row.output_tokens ?? row.outputTokens ?? 0),
      creditsUsed: Number(row.credits_used ?? row.creditsUsed ?? 0),
    })),
    breakdown: ((raw.breakdown ?? []) as Record<string, any>[]).map((row) => ({
      provider: String(row.provider ?? ""),
      model: String(row.model ?? ""),
      paymentMethod: String(row.payment_method ?? row.paymentMethod ?? ""),
      inputTokens: Number(row.input_tokens ?? row.inputTokens ?? 0),
      outputTokens: Number(row.output_tokens ?? row.outputTokens ?? 0),
      creditsUsed: Number(row.credits_used ?? row.creditsUsed ?? 0),
      events: Number(row.events ?? 0),
    })),
  };
}

function camelOperateStatement(
  raw: Record<string, unknown>,
  fallbackPlatform: string,
): OperateStatementResult {
  const range = (raw.range ?? {}) as Record<string, any>;
  const summary = (raw.summary ?? {}) as Record<string, any>;
  return {
    source: camelAppSource(raw.source),
    platform: String(raw.platform ?? fallbackPlatform),
    range: {
      fromDate: String(range.from_date ?? range.fromDate ?? ""),
      toDate: String(range.to_date ?? range.toDate ?? ""),
    },
    available: Boolean(raw.available),
    summary: {
      grossRevenue: Number(summary.gross_revenue ?? summary.grossRevenue ?? 0),
      platformFees: Number(summary.platform_fees ?? summary.platformFees ?? 0),
      serviceCharges: Number(
        summary.service_charges ?? summary.serviceCharges ?? 0,
      ),
      net: Number(summary.net ?? 0),
    },
    revenue: ((raw.revenue ?? []) as Record<string, any>[]).map((row) => ({
      subject: String(row.subject ?? ""),
      application: String(row.application ?? ""),
      applicationId: row.application_id ?? row.applicationId ?? null,
      events: Number(row.events ?? 0),
      gross: Number(row.gross ?? 0),
      platformFee: Number(row.platform_fee ?? row.platformFee ?? 0),
      net: Number(row.net ?? 0),
    })),
    charges: ((raw.charges ?? []) as Record<string, any>[]).map((row) => ({
      item: String(row.item ?? ""),
      application: String(row.application ?? ""),
      applicationId: row.application_id ?? row.applicationId ?? null,
      events: Number(row.events ?? 0),
      amount: Number(row.amount ?? 0),
    })),
    entries: ((raw.entries ?? []) as Record<string, any>[]).map((row) => ({
      day: String(row.day ?? ""),
      application: String(row.application ?? ""),
      subject: String(row.subject ?? ""),
      events: Number(row.events ?? 0),
      gross: Number(row.gross ?? 0),
      platformFee: Number(row.platform_fee ?? row.platformFee ?? 0),
      net: Number(row.net ?? 0),
    })),
    payments: camelPartnerPayments(raw.payments),
  };
}

function camelPartnerPayments(raw: unknown) {
  const payments = (raw ?? {}) as Record<string, any>;
  const summary = (payments.summary ?? {}) as Record<string, any>;
  return {
    available: Boolean(payments.available),
    scope: String(payments.scope ?? "recipient_bucket"),
    summary: {
      accruedCredits: Number(
        summary.accrued_credits ?? summary.accruedCredits ?? 0,
      ),
      accruedUsd: Number(summary.accrued_usd ?? summary.accruedUsd ?? 0),
      settledCredits: Number(
        summary.settled_credits ?? summary.settledCredits ?? 0,
      ),
      settledUsd: Number(summary.settled_usd ?? summary.settledUsd ?? 0),
      outstandingCredits: Number(
        summary.outstanding_credits ?? summary.outstandingCredits ?? 0,
      ),
      outstandingUsd: Number(
        summary.outstanding_usd ?? summary.outstandingUsd ?? 0,
      ),
      pricedCalls: Number(summary.priced_calls ?? summary.pricedCalls ?? 0),
      settlements: Number(summary.settlements ?? 0),
    },
    resources: ((payments.resources ?? []) as Record<string, any>[]).map(
      (resource) => ({
        application: String(resource.application ?? ""),
        applicationId:
          resource.application_id ?? resource.applicationId ?? null,
        tool: String(resource.tool ?? ""),
        flatCredits: Number(resource.flat_credits ?? resource.flatCredits ?? 0),
        flatUsd: Number(resource.flat_usd ?? resource.flatUsd ?? 0),
        beneficiary: resource.beneficiary ?? null,
        recipient: resource.recipient ?? null,
        chain: resource.chain ?? null,
        beneficiaryType:
          resource.beneficiary_type ?? resource.beneficiaryType ?? null,
        observedCalls: Number(
          resource.observed_calls ?? resource.observedCalls ?? 0,
        ),
      }),
    ),
    buckets: ((payments.buckets ?? []) as Record<string, any>[]).map(
      (bucket) => ({
        id: String(bucket.id ?? ""),
        recipient: String(bucket.recipient ?? ""),
        outstandingCredits: Number(
          bucket.outstanding_credits ?? bucket.outstandingCredits ?? 0,
        ),
        outstandingUsd: Number(
          bucket.outstanding_usd ?? bucket.outstandingUsd ?? 0,
        ),
      }),
    ),
    events: ((payments.events ?? []) as Record<string, any>[]).map((event) => ({
      id: String(event.id ?? ""),
      kind: String(event.kind ?? ""),
      occurredAt: timestampSeconds(event.occurred_at ?? event.occurredAt),
      application: event.application ?? null,
      applicationId: event.application_id ?? event.applicationId ?? null,
      tools: Array.isArray(event.tools) ? event.tools.map(String) : [],
      credits: Number(event.credits ?? 0),
      usd: Number(event.usd ?? 0),
      asset: event.asset ?? null,
      assetAmount:
        event.asset_amount === null || event.asset_amount === undefined
          ? (event.assetAmount ?? null)
          : Number(event.asset_amount),
      recipient: String(event.recipient ?? ""),
      paymentMethod: String(event.payment_method ?? event.paymentMethod ?? ""),
      receiptId: event.receipt_id ?? event.receiptId ?? null,
      chain: event.chain ?? null,
      explorerUrl: event.explorer_url ?? event.explorerUrl ?? null,
    })),
  };
}

function camelOperateLogs(
  raw: Record<string, unknown>,
  fallbackPlatform: string,
): OperateLogsResult {
  return {
    source: camelAppSource(raw.source),
    platform: String(raw.platform ?? fallbackPlatform),
    logs: ((raw.logs ?? []) as Record<string, any>[]).map((row) => {
      const details = (row.details ?? {}) as Record<string, any>;
      const rawModelKey = details.model_key ?? details.modelKey;
      const modelKeyId =
        rawModelKey && typeof rawModelKey === "object"
          ? optNumber(rawModelKey.id)
          : null;
      const modelKey =
        modelKeyId !== null && Number.isFinite(modelKeyId)
          ? {
              id: modelKeyId,
              label: optString(rawModelKey.label),
              prefix: optString(rawModelKey.prefix),
            }
          : null;
      return {
        occurredAt: timestampSeconds(row.occurred_at ?? row.occurredAt),
        eventType: String(row.event_type ?? row.eventType ?? ""),
        id: String(row.id ?? ""),
        application: String(row.application ?? ""),
        applicationId: row.application_id ?? row.applicationId ?? null,
        summary: String(row.summary ?? ""),
        details,
        modelKey,
        kind: (row.kind ?? null) as "invocation" | "event" | null,
        status: (row.status ?? null) as "ok" | "error" | "info" | null,
        tool: optString(row.tool),
        durationMs: optNumber(row.duration_ms ?? row.durationMs),
        retries: optNumber(row.retries),
        threadId: optString(row.thread_id ?? row.threadId),
        args: optString(row.args),
        result: optString(row.result),
      };
    }),
    nextCursor: camelLogCursor(raw.next_cursor ?? raw.nextCursor),
  };
}

function camelOperateObservability(
  raw: Record<string, unknown>,
  fallbackPlatform: string,
): OperateObservabilityResult {
  const monitoring = (raw.monitoring ?? {}) as Record<string, any>;
  return {
    source: camelAppSource(raw.source),
    platform: String(raw.platform ?? fallbackPlatform),
    scope: String(raw.scope ?? "owned_applications"),
    monitoring:
      raw.monitoring && typeof raw.monitoring === "object"
        ? {
            provider: String(monitoring.provider ?? ""),
            status: String(monitoring.status ?? ""),
            windowSeconds: Number(
              monitoring.window_seconds ?? monitoring.windowSeconds ?? 0,
            ),
          }
        : null,
    apps: ((raw.apps ?? []) as Record<string, any>[]).map((app) => ({
      applicationId: Number(app.application_id ?? app.applicationId ?? 0),
      application: String(app.application ?? ""),
      active: Boolean(app.active),
      loaded: Boolean(app.loaded),
      releaseTag: app.release_tag ?? app.releaseTag ?? null,
      sdkVersion: app.sdk_version ?? app.sdkVersion ?? null,
      status: String(app.status ?? ""),
      metrics: camelOperateAppMetrics(app.metrics),
      pricing: camelAppPricing(app.pricing),
    })),
    dashboardLinks: (
      (raw.dashboard_links ?? raw.dashboardLinks ?? []) as Record<string, any>[]
    ).map((link) => ({
      label: String(link.label ?? ""),
      url: String(link.url ?? ""),
      scope: String(link.scope ?? ""),
    })),
    platformMetrics: (
      (raw.platform_metrics ?? raw.platformMetrics ?? []) as Record<
        string,
        any
      >[]
    ).map((metric) => ({
      label: String(metric.label ?? ""),
      value:
        metric.value === null || metric.value === undefined
          ? null
          : Number(metric.value),
      unit: String(metric.unit ?? ""),
      scope: String(metric.scope ?? ""),
      description:
        typeof metric.description === "string" ? metric.description : undefined,
    })),
    payments: camelPartnerPayments(raw.payments),
  };
}

function camelOperateAppDetail(
  raw: Record<string, unknown>,
  fallbackPlatform: string,
): OperateAppDetailResult {
  const app = (raw.app ?? {}) as Record<string, any>;
  const funnel = (raw.funnel ?? {}) as Record<string, any>;
  const credits = (raw.credits ?? {}) as Record<string, any>;
  const lifecycle = (raw.lifecycle ?? {}) as Record<string, any>;
  const hourly = (raw.hourly ?? {}) as Record<string, any>;
  const series = (value: unknown): number[] | null =>
    Array.isArray(value) ? value.map(Number) : null;
  const nullableSeries = (value: unknown): Array<number | null> | null =>
    Array.isArray(value)
      ? value.map((item) => {
          if (item === null || item === undefined) return null;
          const numeric = Number(item);
          return Number.isFinite(numeric) ? numeric : null;
        })
      : null;
  return {
    source: camelAppSource(raw.source),
    platform: String(raw.platform ?? fallbackPlatform),
    windowSeconds: Number(raw.window_seconds ?? raw.windowSeconds ?? 0),
    app: {
      applicationId: Number(app.application_id ?? app.applicationId ?? 0),
      name: String(app.name ?? ""),
      releaseTag: optString(app.release_tag ?? app.releaseTag),
      sdkVersion: optString(app.sdk_version ?? app.sdkVersion),
      active: Boolean(app.active),
      loaded: Boolean(app.loaded),
      status: String(app.status ?? ""),
    },
    funnel: {
      chats24h: optNumber(funnel.chats_24h ?? funnel.chats24h),
      toolCalls24h: optNumber(funnel.tool_calls_24h ?? funnel.toolCalls24h),
      txProposed24h: optNumber(funnel.tx_proposed_24h ?? funnel.txProposed24h),
      txSubmitted24h: optNumber(
        funnel.tx_submitted_24h ?? funnel.txSubmitted24h,
      ),
      txConfirmed24h: optNumber(
        funnel.tx_confirmed_24h ?? funnel.txConfirmed24h,
      ),
      txReverted24h: optNumber(funnel.tx_reverted_24h ?? funnel.txReverted24h),
    },
    activeUsers24h: optNumber(raw.active_users_24h ?? raw.activeUsers24h),
    credits: {
      credits24h: optNumber(credits.credits_24h ?? credits.credits24h),
      creditsPerTurn24h: optNumber(
        credits.credits_per_turn_24h ?? credits.creditsPerTurn24h,
      ),
      creditsDaily: (
        (credits.credits_daily ?? credits.creditsDaily ?? []) as Record<
          string,
          any
        >[]
      ).map((row) => ({
        day: String(row.day ?? ""),
        credits: Number(row.credits ?? 0),
      })),
    },
    tools: ((raw.tools ?? []) as Record<string, any>[]).map((row) => {
      const lastError = (row.last_error ?? row.lastError) as
        | Record<string, any>
        | null
        | undefined;
      return {
        tool: String(row.tool ?? ""),
        calls: optNumber(row.calls),
        errors: optNumber(row.errors),
        errorRate: optNumber(row.error_rate ?? row.errorRate),
        p95Ms: optNumber(row.p95_ms ?? row.p95Ms),
        lastError: lastError
          ? {
              message: optString(lastError.message),
              occurredAt: Number(
                lastError.occurred_at ?? lastError.occurredAt ?? 0,
              ),
            }
          : null,
      };
    }),
    lifecycle: {
      coldStartMs: optNumber(lifecycle.cold_start_ms ?? lifecycle.coldStartMs),
      dylibBytes: optNumber(lifecycle.dylib_bytes ?? lifecycle.dylibBytes),
      loads24h: optNumber(lifecycle.loads_24h ?? lifecycle.loads24h),
      evictions24h: optNumber(
        lifecycle.evictions_24h ?? lifecycle.evictions24h,
      ),
    },
    hourly: {
      chats: series(hourly.chats),
      toolCalls: series(hourly.tool_calls ?? hourly.toolCalls),
      p95LatencyMs: nullableSeries(
        hourly.p95_latency_ms ?? hourly.p95LatencyMs,
      ),
      transactions: series(hourly.transactions),
    },
  };
}

function camelOperateAppMetrics(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const metrics = raw as Record<string, any>;
  const metricNumber = (snake: string, camel: string): number | null => {
    const value = metrics[snake] ?? metrics[camel];
    return value === null || value === undefined ? null : Number(value);
  };
  const metricSeries = (snake: string, camel: string): number[] | null => {
    const value = metrics[snake] ?? metrics[camel];
    return Array.isArray(value) ? value.map(Number) : null;
  };
  return {
    provider: String(metrics.provider ?? ""),
    windowSeconds: Number(metrics.window_seconds ?? metrics.windowSeconds ?? 0),
    available: Boolean(metrics.available),
    requestsPerMinute: metricNumber("requests_per_minute", "requestsPerMinute"),
    errorRate: metricNumber("error_rate", "errorRate"),
    p95LatencyMs: metricNumber("p95_latency_ms", "p95LatencyMs"),
    inflightRequests: metricNumber("inflight_requests", "inflightRequests"),
    trendWindowSeconds: metricNumber(
      "trend_window_seconds",
      "trendWindowSeconds",
    ),
    chats24h: metricNumber("chats_24h", "chats24h"),
    toolCalls24h: metricNumber("tool_calls_24h", "toolCalls24h"),
    transactions24h: metricNumber("transactions_24h", "transactions24h"),
    chatsHourly: metricSeries("chats_hourly", "chatsHourly"),
    toolCallsHourly: metricSeries("tool_calls_hourly", "toolCallsHourly"),
    transactionsHourly: metricSeries(
      "transactions_hourly",
      "transactionsHourly",
    ),
    toolErrorRate: metricNumber("tool_error_rate", "toolErrorRate"),
    txErrorRate: metricNumber("tx_error_rate", "txErrorRate"),
    coldStartMs: metricNumber("cold_start_ms", "coldStartMs"),
    dylibBytes: metricNumber("dylib_bytes", "dylibBytes"),
  };
}

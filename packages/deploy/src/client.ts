import { BackendError, BrowserEnvironmentError, DeployError } from "./errors";
import type {
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
  GitHubIdentity,
  ListAppsInput,
  ListUserSourcesInput,
  UserSource,
  ListTokensInput,
  MintTokenInput,
  MintedToken,
  PlatformApp,
  ProgressModel,
  RevokeTokenInput,
  ScaffoldInput,
  StatusInput,
  SyncSourceInput,
  TokenRecord,
  WatchDeploymentOptions,
} from "./types";

/** Portal one-shot template repo; the default source for `scaffold()`. */
const DEFAULT_TEMPLATE_REPO = "aomi-labs/playground-example";

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

  async deploy(input: DeployInput): Promise<DeployResult> {
    const platform = cleanPlatform(input.platform);
    const body = deployRequest(input);
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

  async status(input: StatusInput): Promise<DeploymentStatus> {
    const platform = cleanPlatform(input.platform);
    const path = input.deploymentId
      ? `/api/platforms/${encodeURIComponent(platform)}/deployments/${encodeURIComponent(input.deploymentId)}/status`
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
          status.state === "ready" || status.state === "failed";
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
    const raw = await this.post<{ ok?: boolean; source?: unknown }>(
      `/api/platforms/${encodeURIComponent(platform)}/sources/sync-installed`,
      { repo },
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
    const templateRepo = input.templateRepo?.trim() || DEFAULT_TEMPLATE_REPO;
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.post<{ ok?: boolean; source?: unknown }>(
      `/api/integrations/github-app/platforms/${encodeURIComponent(platform)}/sources/create-from-template`,
      {
        installation_id: installationId,
        template_repo: templateRepo,
        repo_name: repoName,
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
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.get<{
      github_user_id?: string;
      github_login?: string;
    }>(
      `/api/integrations/github-app/oauth/exchange?${params.toString()}`,
      "exchange_github_code",
      bearer,
    );
    return {
      githubUserId: String(raw.github_user_id ?? ""),
      githubLogin: String(raw.github_login ?? ""),
    };
  }

  /**
   * Every source repo a GitHub user connected (merged across installations,
   * platform-agnostic), each with the apps deployed from it. Backs the
   * post-sign-in dashboard. `GET /api/integrations/github-app/user/sources`.
   */
  async listUserSources(input: ListUserSourcesInput): Promise<UserSource[]> {
    const githubUserId = required(input.githubUserId, "githubUserId");
    const bearer = this.resolveBearer(input.bearer);
    const raw = await this.get<{ sources?: unknown[] }>(
      `/api/integrations/github-app/user/sources?${new URLSearchParams({
        github_user_id: githubUserId,
      }).toString()}`,
      "list_user_sources",
      bearer,
    );
    await this.audit({
      action: "list_user_sources",
      actor: input.actor,
      ts: Date.now(),
    });
    return (raw.sources ?? []).map(camelUserSource);
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
      case "failed":
        return { completed: lastCompleted, total, label: "Build failed" };
      default:
        return { completed: lastCompleted, total, label: "Waiting for build" };
    }
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

  private async del<Resp>(
    path: string,
    operation: string,
    bearer: string,
  ): Promise<Resp> {
    return this.request<Resp>(path, { method: "DELETE" }, operation, bearer);
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
        `${operation} request failed: ${err instanceof Error ? err.message : String(err)}`,
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
    } catch {
      throw new BackendError(
        operation,
        res.status,
        `${operation} returned invalid JSON`,
        text,
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

function deployRequest(input: DeployInput): Record<string, unknown> {
  const appSourceId = Number(input.appSourceId);
  if (!Number.isSafeInteger(appSourceId) || appSourceId <= 0) {
    throw new DeployError(
      "INVALID_REQUEST",
      "deploy requires a positive appSourceId",
    );
  }
  const aomiTomlPaths = cleanStringList(input.aomiTomlPaths, "aomiTomlPaths");
  return {
    app_source_id: appSourceId,
    source_ref: sourceRef(input.sourceRef),
    aomi_toml_paths: aomiTomlPaths,
    ...(input.dryRun ? { dry_run: true } : {}),
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

function sourceRef(ref: DeployInput["sourceRef"]): Record<string, string> {
  if (ref.kind !== "branch" && ref.kind !== "commit") {
    throw new DeployError(
      "INVALID_REQUEST",
      "sourceRef.kind must be branch or commit",
    );
  }
  return { kind: ref.kind, value: required(ref.value, "sourceRef.value") };
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
          target: app.target ?? null,
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
            platformCommitHash: promotion.platform_commit_hash,
            liveCommitHash: promotion.live_commit_hash ?? null,
            ciStatus: promotion.ci_status,
            ciUrl: promotion.ci_url ?? null,
            releaseAssets: promotion.release_assets ?? [],
          }),
        ),
      },
      apps: (activation.apps ?? []).map((app: Record<string, any>) => ({
        name: app.name,
        path: app.path ?? null,
        releaseTag: app.release_tag ?? null,
        isActive: Boolean(app.is_active),
        loaded: Boolean(app.loaded),
        error: app.error ?? null,
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
    githubAccount: s.github_account ?? null,
    githubUserId: s.github_user_id ?? null,
    boundPlatformId: s.bound_platform_id ?? null,
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
    isActive: Boolean(a.is_active),
    isPublic: Boolean(a.is_public),
    appSourceId: a.app_source_id ?? null,
    appReleaseTag: a.app_release_tag ?? null,
    targetTags: a.target_tags ?? [],
    loaded: Boolean(a.loaded),
  };
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
    artifactTarget: d.artifact_target ?? d.artifactTarget ?? null,
    buildTarget: d.build_target ?? d.buildTarget ?? d.target ?? null,
    apps: apps.map((app) => ({
      name: app.name,
      releaseTag: app.release_tag ?? app.releaseTag ?? null,
      target: app.target ?? null,
    })),
  };
}

function camelUserSource(raw: unknown): UserSource {
  const s = (raw ?? {}) as Record<string, any>;
  return {
    ...camelAppSource(s),
    apps: ((s.apps ?? []) as unknown[]).map(camelPlatformApp),
    latestDeployment: camelUserSourceLatestDeployment(
      s.latest_deployment ?? s.latestDeployment,
    ),
  };
}

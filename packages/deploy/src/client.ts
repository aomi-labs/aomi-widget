import { BackendError, BrowserEnvironmentError, DeployError } from "./errors";
import type {
  ActivateInput,
  ActivateResult,
  AuditEvent,
  DeployInput,
  DeployResult,
  DeploymentClientOptions,
  DeploymentProgressEvent,
  DeploymentStatus,
  DeploymentAppStatus,
  ProgressModel,
  StatusInput,
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
  private readonly bearer: string;

  constructor(opts: DeploymentClientOptions) {
    assertServerOnly();
    this.opts = opts;
    this.baseUrl = required(opts.aomi.backendUrl, "aomi.backendUrl").replace(
      /\/+$/,
      "",
    );
    this.bearer = required(opts.aomi.activationToken, "aomi.activationToken");
  }

  async deploy(input: DeployInput): Promise<DeployResult> {
    const platform = cleanPlatform(input.platform);
    const body = deployRequest(input);
    const result = await this.post<DeployResult>(
      `/api/platforms/${encodeURIComponent(platform)}/deploy`,
      body,
      "deploy",
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
    const result = await this.get<Record<string, unknown>>(path, "status");
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
    let lastProgress: ProgressModel = { completed: 0, total: 8, label: "Waiting for build" };

    while (!signal?.aborted && failures < maxRetries) {
      try {
        const status = await this.status({ platform, deploymentId });
        const mapped = this.buildProgressModel(status, lastCompleted);
        const completed = Math.max(mapped.completed, lastCompleted);
        const progress: ProgressModel = { ...mapped, completed };
        lastCompleted = completed;
        lastProgress = progress;

        const isTerminal = status.state === "ready" || status.state === "failed";
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
        if (err instanceof BackendError && err.status >= 400 && err.status < 500) {
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

  endpoint(path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  private buildProgressModel(status: DeploymentStatus, lastCompleted: number): ProgressModel {
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

  private backoffDelay(failures: number, baseMs: number, maxMs: number): number {
    return Math.min(baseMs * Math.pow(2, failures), maxMs);
  }

  private async get<Resp>(path: string, operation: string): Promise<Resp> {
    return this.request<Resp>(path, { method: "GET" }, operation);
  }

  private async post<Resp>(
    path: string,
    body: unknown,
    operation: string,
  ): Promise<Resp> {
    return this.request<Resp>(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      operation,
    );
  }

  private async request<Resp>(
    path: string,
    init: RequestInit,
    operation: string,
  ): Promise<Resp> {
    const url = this.endpoint(path);
    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.bearer}`,
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
          status: (raw.ci as Record<string, unknown>).status as string | undefined,
          url: (raw.ci as Record<string, unknown>).url as string | undefined,
          commitHash: ((raw.ci as Record<string, unknown>).commit_hash ??
            (raw.ci as Record<string, unknown>).commitHash) as string | undefined,
        }
      : undefined,
    message: raw.message as string | undefined,
  };
}

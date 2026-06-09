import { BackendError, BrowserEnvironmentError, DeployError } from "./errors";
import type {
  ActivateInput,
  ActivateResult,
  AuditEvent,
  DeployInput,
  DeployResult,
  DeploymentClientOptions,
  StatusInput,
  StatusResult,
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
    this.baseUrl = required(opts.aomi.backendUrl, "aomi.backendUrl").replace(/\/+$/, "");
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
    await this.audit({
      action: "deploy",
      platform,
      appSourceId: input.appSourceId,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelDeployResult(result);
  }

  async activate(input: ActivateInput): Promise<ActivateResult> {
    const platform = cleanPlatform(input.platform);
    const body = activateRequest(input);
    const result = await this.post<ActivateResult>(
      `/api/platforms/${encodeURIComponent(platform)}/apps/activate`,
      body,
      "activation",
    );
    await this.audit({
      action: "activate",
      platform,
      apps: input.apps,
      targetTags: input.targetTags,
      actor: input.actor,
      ts: Date.now(),
    });
    return camelActivateResult(result);
  }

  async status(input: StatusInput): Promise<StatusResult> {
    const platform = cleanPlatform(input.platform);
    const path = input.path ?? `/api/platforms/${encodeURIComponent(platform)}/status`;
    const result = await this.get<StatusResult>(path, "status");
    await this.audit({
      action: "status",
      platform,
      actor: input.actor,
      ts: Date.now(),
    });
    return result;
  }

  endpoint(path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  private async get<Resp>(path: string, operation: string): Promise<Resp> {
    return this.request<Resp>(path, { method: "GET" }, operation);
  }

  private async post<Resp>(path: string, body: unknown, operation: string): Promise<Resp> {
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

  private async request<Resp>(path: string, init: RequestInit, operation: string): Promise<Resp> {
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
      throw new BackendError(operation, res.status, `${operation} failed (${res.status})`, text);
    }
    if (!text.trim()) return null as Resp;
    try {
      return JSON.parse(text) as Resp;
    } catch {
      throw new BackendError(operation, res.status, `${operation} returned invalid JSON`, text);
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
    throw new DeployError("INVALID_REQUEST", "deploy requires a positive appSourceId");
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
  const apps = cleanStringList(input.apps, "apps");
  const releaseTags = cleanStringList(input.releaseTags ?? [], "releaseTags", true);
  const targetTags = cleanStringList(input.targetTags ?? [], "targetTags", true);
  if (input.target.kind === "platform_commit" && releaseTags.length === 0) {
    throw new DeployError("INVALID_REQUEST", "platform_commit activation requires releaseTags");
  }
  return {
    target: targetRef(input.target),
    apps,
    ...(releaseTags.length ? { release_tags: releaseTags } : {}),
    ...(targetTags.length ? { target_tags: targetTags } : {}),
  };
}

function sourceRef(ref: DeployInput["sourceRef"]): Record<string, string> {
  if (ref.kind !== "branch" && ref.kind !== "commit") {
    throw new DeployError("INVALID_REQUEST", "sourceRef.kind must be branch or commit");
  }
  return { kind: ref.kind, value: required(ref.value, "sourceRef.value") };
}

function targetRef(ref: ActivateInput["target"]): Record<string, unknown> {
  switch (ref.kind) {
    case "platform_pr":
    case "platform_branch":
    case "platform_commit":
      return { kind: ref.kind, value: required(ref.value, "target.value") };
    case "release_tags":
      return { kind: "release_tags", value: cleanStringList(ref.value, "target.value") };
    default:
      throw new DeployError("INVALID_REQUEST", "unknown activation target kind");
  }
}

function cleanPlatform(value: string): string {
  return required(value, "platform");
}

function required(value: string | undefined | null, field: string): string {
  const clean = value?.trim();
  if (!clean) throw new DeployError("INVALID_REQUEST", `${field} is required`);
  return clean;
}

function cleanStringList(values: string[], field: string, allowEmpty = false): string[] {
  const clean = values.map((value) => value.trim()).filter(Boolean);
  if (!allowEmpty && clean.length === 0) {
    throw new DeployError("INVALID_REQUEST", `${field} must contain at least one value`);
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

import { Octokit } from "@octokit/rest";

import { ActivationError, BrowserEnvironmentError, DeployError, TagWideningError } from "./errors";
import {
  buildDeploymentManifest,
  stageFiles,
  validateManifest,
} from "./deployment-json";
import { assertValidCommit, deriveSourceCommit } from "./release-tag";
import { GitHubCommitter, type GitHubRestClient } from "./github";
import {
  buildAccessRequest,
  buildAccessRequestDiscordBody,
  type AccessRequestPayload,
  type DiscordWebhookBody,
} from "./access-request";
import type { ActivateAppRequest, PlatformDescriptor } from "./contract";
import type {
  ActivateInput,
  ActivateResult,
  AuditEvent,
  DeployInput,
  DeployResult,
  DeploymentClientOptions,
  StatusResult,
} from "./types";

const DEFAULT_BRANCH = "publish";
const DEFAULT_ACTIVATE_PATH = "/api/admin/apps/activate";
const DEFAULT_SERVER_TAGS = ["staging"];
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Server-side client to the Aomi deployment platform. Holds the bot PAT and
 * the platform activation token; performs `deploy` (GitHub publish) and
 * `activate` (backend) on behalf of a proxy that has ALREADY authorized the
 * caller for the given slug.
 *
 * This client does NOT do ownership/auth — that is the proxy's job. It enforces
 * the platform contract (path scope, narrow-only tags, deployment.json shape).
 */
export class DeploymentClient {
  private readonly opts: DeploymentClientOptions;
  private readonly descriptor: PlatformDescriptor;
  private readonly committer: GitHubCommitter;
  private readonly branch: string;
  private readonly tagPrefix: string;

  constructor(opts: DeploymentClientOptions) {
    assertServerOnly();
    this.opts = opts;
    this.branch = opts.github.branch ?? DEFAULT_BRANCH;
    this.descriptor = opts.descriptor ?? defaultDescriptor(opts.aomi.platform, opts.github.repo, this.branch);
    this.tagPrefix = this.descriptor.release_tag_convention.split("{app_slug}")[0].replace(/-+$/, "");

    const api = resolveGitHubApi(opts);
    this.committer = new GitHubCommitter(api, opts.github.repo, this.branch);
  }

  /**
   * Build a pre-deploy access request (onboarding ask) for `app`, filling
   * `platform` + `repo` from this client's config. Mirror of `aomi-git request`
   * — same canonical payload, so a request raised here and one from the CLI are
   * indistinguishable to the consumer.
   *
   * If `discord.webhookUrl` is configured, the embed is POSTed and `posted` is
   * true; otherwise nothing is sent and the caller delivers `discordBody`
   * itself. The activation code is NEVER part of this — ops mint + deliver it
   * out-of-band.
   */
  async requestAccess(input: {
    email: string;
    githubAccount: string;
    app: string;
    requestedAt?: string;
    actor?: string;
  }): Promise<{ payload: AccessRequestPayload; discordBody: DiscordWebhookBody; posted: boolean }> {
    assertValidSlug(input.app);

    const common = {
      email: input.email,
      githubAccount: input.githubAccount,
      app: input.app,
      platform: this.opts.aomi.platform,
      repo: this.descriptor.source_repo,
      requestedAt: input.requestedAt,
    };
    const payload = buildAccessRequest(common);
    const discordBody = buildAccessRequestDiscordBody(common, {
      opsMention: this.opts.discord?.opsMention,
    });

    let posted = false;
    const webhookUrl = this.opts.discord?.webhookUrl;
    if (webhookUrl) {
      let res: Response;
      try {
        res = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(discordBody),
        });
      } catch (err) {
        throw new DeployError(
          "ACCESS_REQUEST",
          `failed to POST Discord webhook: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new DeployError("ACCESS_REQUEST", `Discord webhook returned ${res.status}: ${text.trim()}`);
      }
      posted = true;
    }

    await this.audit({
      action: "request",
      slug: input.app,
      actor: input.actor,
      ts: Date.now(),
    });

    return { payload, discordBody, posted };
  }

  /** Commit `apps/<slug>/` to the publish branch. Does NOT activate. */
  async deploy(input: DeployInput): Promise<DeployResult> {
    assertValidSlug(input.slug);

    const staged = stageFiles(input.slug, input.files);
    const sourceCommit = input.sourceCommit ?? deriveSourceCommit(staged);
    assertValidCommit(sourceCommit);

    const serverTags = normalizeTags(input.serverTags) ?? DEFAULT_SERVER_TAGS;

    const manifest = buildDeploymentManifest({
      slug: input.slug,
      displayName: input.displayName,
      descriptor: this.descriptor,
      staged,
      sourceCommit,
      serverTags,
      isPublic: input.isPublic ?? false,
    });
    // Defense: refuse to push a manifest CI would reject.
    validateManifest(manifest, this.descriptor);

    const releaseTag = manifest.target.release_tag;
    const publishCommitSha = await this.committer.commitApp({
      slug: input.slug,
      files: input.files,
      staged,
      manifest,
      message: `deploy ${input.slug} (${releaseTag})`,
    });

    await this.audit({
      action: "deploy",
      slug: input.slug,
      releaseTag,
      targetTags: serverTags,
      actor: input.actor,
      ts: Date.now(),
    });

    return {
      releaseTag,
      publishCommitSha,
      sourceCommit,
      appPath: manifest.target.app_path,
      serverTags,
      ciUrl: `https://github.com/${this.opts.github.repo}/actions`,
    };
  }

  /** CI + release readiness for a slug's latest matching release. */
  async getStatus(slug: string): Promise<StatusResult> {
    assertValidSlug(slug);
    return this.committer.status(slug, this.tagPrefix);
  }

  /**
   * Activate a built release on the backend. Call only after `getStatus`
   * reports `release: "ready"`. Enforces narrow-only `target_tags` when the
   * build's `server_tags` are supplied.
   */
  async activate(input: ActivateInput): Promise<ActivateResult> {
    assertValidSlug(input.slug);

    const targetTags = normalizeTags(input.targetTags) ?? (input.targetEnv ? [input.targetEnv] : undefined);
    if (!targetTags || targetTags.length === 0) {
      throw new DeployError("ACTIVATION", "activate requires `targetTags` or `targetEnv`");
    }
    if (input.buildServerTags) {
      assertSubset(targetTags, normalizeTags(input.buildServerTags) ?? []);
    }

    const body: ActivateAppRequest = {
      app_slug: input.slug,
      platform: this.opts.aomi.platform,
      source_repo: this.descriptor.source_repo,
      app_release_tag: input.releaseTag,
      source_commit: input.sourceCommit,
      is_public: input.isPublic ?? false,
      target_tags: targetTags,
      github_token: this.opts.github.botPat,
      ...(input.displayName ? { display_name: input.displayName } : {}),
    };

    const url =
      this.opts.aomi.backendUrl.replace(/\/+$/, "") +
      (this.opts.aomi.activatePath ?? DEFAULT_ACTIVATE_PATH);

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.opts.aomi.activationToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new ActivationError(0, `activation request failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* keep raw text */
    }

    if (!res.ok) {
      throw new ActivationError(res.status, `activation failed (${res.status})`, text);
    }

    await this.audit({
      action: "activate",
      slug: input.slug,
      releaseTag: input.releaseTag,
      targetTags,
      actor: input.actor,
      ts: Date.now(),
    });

    return { activated: true, status: res.status, body: parsed };
  }

  private async audit(event: AuditEvent): Promise<void> {
    if (this.opts.onAudit) await this.opts.onAudit(event);
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Refuse to run in a browser. This client holds the bot PAT + activation token,
 * which must never reach a browser bundle. The check allows an explicit
 * `globalThis.__AOMI_ALLOW_BROWSER__ = true` escape hatch for jsdom test setups
 * that deliberately exercise constructor behavior.
 */
export function assertServerOnly(): void {
  const g = globalThis as Record<string, unknown>;
  if (g.__AOMI_ALLOW_BROWSER__ === true) return;
  if (typeof (g as { window?: unknown }).window !== "undefined" &&
      typeof (g as { document?: unknown }).document !== "undefined") {
    throw new BrowserEnvironmentError(
      "@aomi-labs/deploy is server-only: it holds the bot PAT and activation token and " +
        "must never run in a browser. Import it from a server route handler, not client code.",
    );
  }
}

function assertValidSlug(slug: string): void {
  if (!SLUG_RE.test(slug)) {
    throw new DeployError(
      "INVALID_SLUG",
      `invalid app slug ${JSON.stringify(slug)}: must match ${SLUG_RE} (lowercase alphanumeric + hyphen)`,
    );
  }
}

function normalizeTags(tags: string[] | undefined): string[] | undefined {
  if (!tags) return undefined;
  const cleaned = tags.map((t) => t.trim()).filter((t) => t.length > 0);
  return cleaned.length > 0 ? cleaned : undefined;
}

function assertSubset(requested: string[], allowed: string[]): void {
  const allowedSet = new Set(allowed);
  const widened = requested.filter((t) => !allowedSet.has(t));
  if (widened.length > 0) {
    throw new TagWideningError(requested, allowed);
  }
}

/** Krexa-shaped descriptor used when the caller doesn't pass a real one. */
function defaultDescriptor(platform: string, repo: string, branch: string): PlatformDescriptor {
  return {
    name: platform,
    source_repo: repo,
    publish_branch: branch,
    app_path_prefix: "apps",
    release_tag_convention: "apps-{app_slug}-{short_commit}",
    visibility: "private",
  };
}

/** Build the narrow REST adapter from an injected fake or a real Octokit. */
function resolveGitHubApi(opts: DeploymentClientOptions): GitHubRestClient {
  const injected = opts.octokit as { rest?: unknown } | undefined;
  if (injected) {
    return ((injected.rest as GitHubRestClient | undefined) ?? (injected as unknown as GitHubRestClient));
  }
  const octokit = new Octokit({ auth: opts.github.botPat });
  return ((octokit as unknown as { rest?: GitHubRestClient }).rest ??
    (octokit as unknown as GitHubRestClient));
}

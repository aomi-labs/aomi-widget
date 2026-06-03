/** Discriminator value for the payload `kind` field. */
declare const ACCESS_REQUEST_KIND: "access_request";
/** Provenance stamp. Matches the `aomi-git` form (`<tool>/<version>`). */
declare const ACCESS_REQUEST_SOURCE = "@aomi-labs/deploy/0.1.0";
/** Discord embed accent color (blurple). Cosmetic only. Matches the CLI. */
declare const ACCESS_REQUEST_EMBED_COLOR = 5793266;
interface AccessRequestInput {
    /** Where ops sends the activation code. */
    email: string;
    /** GitHub account to invite as a platform-repo collaborator. */
    githubAccount: string;
    /** App slug. */
    app: string;
    /** Platform name (e.g. "community"). */
    platform: string;
    /** Normalized `owner/repo`. */
    repo: string;
    /** RFC3339 timestamp; defaults to now. Injectable for deterministic tests. */
    requestedAt?: string;
}
/**
 * The canonical machine-readable payload. Snake_case keys match the CLI /
 * Discord contract exactly — do not rename without updating the consumer.
 */
interface AccessRequestPayload {
    kind: typeof ACCESS_REQUEST_KIND;
    email: string;
    github_account: string;
    app: string;
    platform: string;
    repo: string;
    requested_at: string;
    source: string;
}
/** Minimal shape of a Discord incoming-webhook body (the parts we set). */
interface DiscordWebhookBody {
    content: string;
    allowed_mentions: {
        parse: string[];
    };
    embeds: Array<{
        title: string;
        color: number;
        fields: Array<{
            name: string;
            value: string;
            inline: boolean;
        }>;
        description: string;
    }>;
}
/**
 * Build the canonical access-request payload. Validates inputs and normalizes
 * whitespace. `requestedAt` defaults to the current time in RFC3339.
 */
declare function buildAccessRequest(input: AccessRequestInput): AccessRequestPayload;
/**
 * Build the Discord webhook body: a human-readable embed for ops plus the
 * canonical payload inlined as a fenced ```json block in the embed description
 * for the bot to parse. Mirror of `discord.rs::webhook_body`.
 *
 * `allowed_mentions` is scoped to users/roles only, never `@everyone`.
 */
declare function buildAccessRequestDiscordBody(input: AccessRequestInput, opts?: {
    opsMention?: string;
}): DiscordWebhookBody;

/**
 * Body of `POST /api/admin/apps/activate`. Field names follow the backend
 * struct (verified against `main`): `name` accepts aliases `app_slug` / `slug`
 * / `application`; `label` accepts alias `display_name`.
 */
interface ActivateAppRequest {
    /** App slug. Sent as `app_slug` (a backend-accepted alias of `name`). */
    app_slug: string;
    platform: string;
    source_repo: string;
    app_release_tag: string;
    /** Provenance commit (12–40 lowercase hex). */
    source_commit: string;
    is_public: boolean;
    /** Narrow-only: must be a subset of the build's declared `server_tags`. */
    target_tags: string[];
    /** Transient one-shot read PAT — backend uses it to fetch the private release, never persists it. */
    github_token?: string;
    /** Optional display name (backend alias `display_name`). */
    display_name?: string;
}
interface DeploymentApp {
    name: string;
    display_name: string;
    platform: string;
    /** GitHub URL of the platform publish repo. */
    git: string;
    public: boolean;
    /** Required server tags for activation/load targeting. */
    server_tags: string[];
}
interface DeploymentSource {
    /** Provenance commit (12–40 lowercase hex). CI enforces the format. */
    commit: string;
    /** Optional git tree id (provenance only). */
    tree?: string;
    /** Optional content digest (provenance only). */
    digest?: string;
}
interface DeploymentPlatform {
    /** Must equal the platform descriptor `name` (e.g. "krexa"). */
    name: string;
    /** Must normalize to the descriptor `source_repo`. */
    github_repo: string;
    resolved_deploy_branch?: string | null;
}
interface DeploymentTarget {
    /** Branch the deploy lands on (e.g. "publish"). */
    branch: string;
    /** `<app_path_prefix>/<slug>`, e.g. "apps/<slug>". */
    app_path: string;
    /** `apps-<slug>-<commit[:12]>`. */
    release_tag: string;
    server_tags: string[];
}
/** A staged file as recorded in `deployment.json` `files[]`. */
interface StagedFile {
    /** Path relative to the app dir (`apps/<slug>/`), posix-style. */
    path: string;
    /** `sha256:<64 lowercase hex>` of the file bytes. */
    sha256: string;
    bytes: number;
}
interface DeploymentStateFlags {
    pushed: boolean;
    deployed: boolean;
    activated: boolean;
}
/**
 * The `.aomi/deployment.json` artifact. We emit the fields CI reads plus the
 * descriptor echoes `aomi-git` writes; CLI-only `stages`/`errors` are omitted
 * (they are `#[serde(default)]` and purely preflight UI).
 */
interface DeploymentManifest {
    app: DeploymentApp;
    source: DeploymentSource;
    platform: DeploymentPlatform;
    target: DeploymentTarget;
    state: DeploymentStateFlags;
    files: StagedFile[];
    /** Unix timestamp (seconds). */
    updated_at: number;
}
/**
 * Platform descriptor (`platform.json` at the publish-repo root). The deploy
 * client only needs these fields to build a contract-valid manifest.
 */
interface PlatformDescriptor {
    name: string;
    source_repo: string;
    publish_branch: string;
    app_path_prefix: string;
    release_tag_convention: string;
    visibility?: string;
}

/**
 * The app's files, keyed by path **relative to `apps/<slug>/`** (posix).
 * Values are file contents (UTF-8 string or raw bytes).
 *
 * Do NOT include `.aomi/deployment.json` — the client generates it. Paths that
 * escape the app dir (absolute, or containing `..`) are rejected.
 */
type SourceBundle = Record<string, string | Uint8Array>;
interface GitHubConfig {
    /** `owner/repo`, e.g. "aomi-labs/krexa-hosted-apps". */
    repo: string;
    /** Publish branch; defaults to "publish". */
    branch?: string;
    /**
     * Fine-grained bot PAT (Contents: read+write on this repo only). Used to
     * commit, and reused as the transient read PAT the backend uses to fetch the
     * private release at activate time.
     */
    botPat: string;
}
interface AomiConfig {
    /** Backend base URL, e.g. "https://staging-api...". No trailing `/api`. */
    backendUrl: string;
    /** Platform name (e.g. "krexa"); must match the platform descriptor. */
    platform: string;
    /** Platform-wide activation token (Bearer). Server-side only. */
    activationToken: string;
    /** Override the activate path. Defaults to "/api/admin/apps/activate". */
    activatePath?: string;
}
/**
 * Optional Discord delivery for access requests. Mirrors the `aomi-git`
 * code-owned webhook, but here the destination is consumer-configured (this
 * library never hardcodes secrets). When `webhookUrl` is set, `requestAccess`
 * POSTs the embed; otherwise it just returns the body for you to deliver.
 */
interface DiscordConfig {
    /** Incoming webhook URL for the access-request channel. */
    webhookUrl?: string;
    /** Ops role/user mention, e.g. "<@&123>". Goes in the message `content`. */
    opsMention?: string;
}
interface AuditEvent {
    action: "request" | "deploy" | "activate";
    /** App slug (absent only for malformed events). */
    slug: string;
    releaseTag?: string;
    targetTags?: string[];
    /** Caller-supplied actor identity (the proxy resolves this from its session). */
    actor?: string;
    /** Unix ms. */
    ts: number;
}
interface DeploymentClientOptions {
    github: GitHubConfig;
    aomi: AomiConfig;
    /**
     * Platform descriptor (`platform.json`). If omitted, a krexa-shaped default
     * is derived from `aomi.platform` + `github.repo`. Pass the real descriptor
     * to guarantee the manifest matches the publish CI validator.
     */
    descriptor?: PlatformDescriptor;
    /** Optional Discord delivery for `requestAccess`. */
    discord?: DiscordConfig;
    /** Called on every privileged op. The proxy MUST persist this (attribution). */
    onAudit?: (event: AuditEvent) => void | Promise<void>;
    /** Injectable for tests; defaults to a real Octokit. */
    octokit?: unknown;
}
interface DeployInput {
    slug: string;
    /** Human-facing name; defaults to `slug`. */
    displayName?: string;
    files: SourceBundle;
    /** Build scope; defaults to ["staging"]. Activation can only narrow this. */
    serverTags?: string[];
    isPublic?: boolean;
    /**
     * Provenance commit (12–40 lowercase hex). If omitted, a deterministic one is
     * derived from the bundle contents (for browser uploads with no git history).
     */
    sourceCommit?: string;
    /** Attribution actor, forwarded to `onAudit`. */
    actor?: string;
}
interface DeployResult {
    releaseTag: string;
    /** SHA of the commit created on the publish branch. */
    publishCommitSha: string;
    /** The provenance commit used in the release tag + manifest. */
    sourceCommit: string;
    appPath: string;
    serverTags: string[];
    /** Link to the publish workflow runs for this repo. */
    ciUrl: string;
}
type CiStatus = "pending" | "running" | "success" | "failure" | "unknown";
type ReleaseStatus = "absent" | "building" | "ready";
interface StatusResult {
    ci: CiStatus;
    release: ReleaseStatus;
    releaseTag: string | null;
}
interface ActivateInput {
    slug: string;
    /** Convenience: "staging" | "prod" → `target_tags: [env]`. */
    targetEnv?: string;
    /** Explicit target tags (takes precedence over `targetEnv`). */
    targetTags?: string[];
    releaseTag: string;
    sourceCommit: string;
    isPublic?: boolean;
    displayName?: string;
    /**
     * The build's declared `server_tags` (from the DeployResult). When provided,
     * the client asserts `targetTags ⊆ buildServerTags` before calling the
     * backend (narrow-only, defense in depth).
     */
    buildServerTags?: string[];
    actor?: string;
}
interface ActivateResult {
    activated: boolean;
    status: number;
    /** Raw backend response body (JSON or text). */
    body: unknown;
}

/**
 * Server-side client to the Aomi deployment platform. Holds the bot PAT and
 * the platform activation token; performs `deploy` (GitHub publish) and
 * `activate` (backend) on behalf of a proxy that has ALREADY authorized the
 * caller for the given slug.
 *
 * This client does NOT do ownership/auth — that is the proxy's job. It enforces
 * the platform contract (path scope, narrow-only tags, deployment.json shape).
 */
declare class DeploymentClient {
    private readonly opts;
    private readonly descriptor;
    private readonly committer;
    private readonly branch;
    private readonly tagPrefix;
    constructor(opts: DeploymentClientOptions);
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
    requestAccess(input: {
        email: string;
        githubAccount: string;
        app: string;
        requestedAt?: string;
        actor?: string;
    }): Promise<{
        payload: AccessRequestPayload;
        discordBody: DiscordWebhookBody;
        posted: boolean;
    }>;
    /** Commit `apps/<slug>/` to the publish branch. Does NOT activate. */
    deploy(input: DeployInput): Promise<DeployResult>;
    /** CI + release readiness for a slug's latest matching release. */
    getStatus(slug: string): Promise<StatusResult>;
    /**
     * Activate a built release on the backend. Call only after `getStatus`
     * reports `release: "ready"`. Enforces narrow-only `target_tags` when the
     * build's `server_tags` are supplied.
     */
    activate(input: ActivateInput): Promise<ActivateResult>;
    private audit;
}
/**
 * Refuse to run in a browser. This client holds the bot PAT + activation token,
 * which must never reach a browser bundle. The check allows an explicit
 * `globalThis.__AOMI_ALLOW_BROWSER__ = true` escape hatch for jsdom test setups
 * that deliberately exercise constructor behavior.
 */
declare function assertServerOnly(): void;

/** The manifest path the client owns; callers may not stage it themselves. */
declare const RESERVED_MANIFEST_PATH = ".aomi/deployment.json";
declare const DEPLOYMENT_DIR = ".aomi";
declare const DEPLOYMENT_FILE = "deployment.json";
/** Mirror of publish_app.py `normalize_github_repo`. */
declare function normalizeGithubRepo(repo: string): string;
declare function sha256Prefixed(content: string | Uint8Array): string;
/**
 * The per-slug security guard. Validates every bundle path stays inside
 * `apps/<slug>/`, computes `{path, sha256, bytes}`, and returns the list sorted
 * by path (matching `aomi-git`'s ordering). Rejects:
 *   - absolute paths / `..` traversal
 *   - empty bundles
 *   - the reserved `.aomi/deployment.json` (the client generates it)
 *   - duplicate paths
 */
declare function stageFiles(slug: string, bundle: SourceBundle): StagedFile[];
interface BuildManifestArgs {
    slug: string;
    displayName?: string;
    descriptor: PlatformDescriptor;
    staged: StagedFile[];
    sourceCommit: string;
    serverTags: string[];
    isPublic: boolean;
    /** Unix seconds; injectable for deterministic tests. */
    now?: number;
}
/** Build a contract-valid `.aomi/deployment.json` object. */
declare function buildDeploymentManifest(args: BuildManifestArgs): DeploymentManifest;
/**
 * Replicate the publish CI's `validate_deployment_manifest` checks. Used by the
 * contract-drift test and as optional defense before committing.
 */
declare function validateManifest(manifest: DeploymentManifest, descriptor: PlatformDescriptor): void;

/** CI's `COMMIT_RE` from publish_app.py: 12–40 lowercase hex. */
declare const COMMIT_RE: RegExp;
declare const DEFAULT_RELEASE_TAG_CONVENTION = "apps-{app_slug}-{short_commit}";
/** CI uses `source_commit[:12]` as the short commit. */
declare function shortCommit(commit: string): string;
declare function assertValidCommit(commit: string): void;
/**
 * Build the release tag from the platform's convention. Defaults to
 * `apps-<slug>-<commit[:12]>`. The convention MUST contain `{app_slug}` and
 * `{short_commit}` (CI enforces this on the descriptor).
 */
declare function releaseTag(slug: string, commit: string, convention?: string): string;
/**
 * Derive a deterministic 40-hex "commit" from staged file contents, for
 * browser uploads that have no git history. Stable across runs for identical
 * input: hashes the sorted `path\0sha256\0bytes` lines.
 */
declare function deriveSourceCommit(files: StagedFile[]): string;

type DeployErrorCode = "BROWSER_ENVIRONMENT" | "INVALID_SLUG" | "PATH_SCOPE" | "EMPTY_BUNDLE" | "RESERVED_PATH" | "INVALID_COMMIT" | "TAG_WIDENING" | "GITHUB_COMMIT" | "ACTIVATION" | "ACCESS_REQUEST";
declare class DeployError extends Error {
    readonly code: DeployErrorCode;
    readonly reason?: unknown;
    constructor(code: DeployErrorCode, message: string, reason?: unknown);
}
/** Thrown when the module is imported into a browser-like environment. */
declare class BrowserEnvironmentError extends DeployError {
    constructor(message: string);
}
/** Thrown when a staged file path escapes `apps/<slug>/` (the per-slug guard). */
declare class PathScopeError extends DeployError {
    readonly path: string;
    constructor(path: string, message: string);
}
/** Thrown when `target_tags` is not a subset of the build's `server_tags`. */
declare class TagWideningError extends DeployError {
    readonly requested: string[];
    readonly allowed: string[];
    constructor(requested: string[], allowed: string[]);
}
/** Thrown when the Aomi backend rejects the activation. */
declare class ActivationError extends DeployError {
    readonly status: number;
    readonly body?: string;
    constructor(status: number, message: string, body?: string);
}

interface GitHubRestClient {
    git: {
        getRef(p: {
            owner: string;
            repo: string;
            ref: string;
        }): Promise<{
            data: {
                object: {
                    sha: string;
                };
            };
        }>;
        getCommit(p: {
            owner: string;
            repo: string;
            commit_sha: string;
        }): Promise<{
            data: {
                tree: {
                    sha: string;
                };
            };
        }>;
        createBlob(p: {
            owner: string;
            repo: string;
            content: string;
            encoding: string;
        }): Promise<{
            data: {
                sha: string;
            };
        }>;
        createTree(p: {
            owner: string;
            repo: string;
            base_tree?: string;
            tree: Array<{
                path: string;
                mode: string;
                type: string;
                sha: string;
            }>;
        }): Promise<{
            data: {
                sha: string;
            };
        }>;
        createCommit(p: {
            owner: string;
            repo: string;
            message: string;
            tree: string;
            parents: string[];
        }): Promise<{
            data: {
                sha: string;
            };
        }>;
        updateRef(p: {
            owner: string;
            repo: string;
            ref: string;
            sha: string;
            force?: boolean;
        }): Promise<unknown>;
    };
    repos: {
        listReleases(p: {
            owner: string;
            repo: string;
            per_page?: number;
        }): Promise<{
            data: Array<{
                tag_name: string;
                draft: boolean;
                assets: Array<unknown>;
            }>;
        }>;
    };
    actions: {
        listWorkflowRunsForRepo(p: {
            owner: string;
            repo: string;
            branch?: string;
            per_page?: number;
        }): Promise<{
            data: {
                workflow_runs: Array<{
                    status: string | null;
                    conclusion: string | null;
                }>;
            };
        }>;
    };
}

export { ACCESS_REQUEST_EMBED_COLOR, ACCESS_REQUEST_KIND, ACCESS_REQUEST_SOURCE, type AccessRequestInput, type AccessRequestPayload, type ActivateAppRequest, type ActivateInput, type ActivateResult, ActivationError, type AomiConfig, type AuditEvent, BrowserEnvironmentError, COMMIT_RE, type CiStatus, DEFAULT_RELEASE_TAG_CONVENTION, DEPLOYMENT_DIR, DEPLOYMENT_FILE, DeployError, type DeployErrorCode, type DeployInput, type DeployResult, type DeploymentApp, DeploymentClient, type DeploymentClientOptions, type DeploymentManifest, type DeploymentPlatform, type DeploymentSource, type DeploymentStateFlags, type DeploymentTarget, type DiscordConfig, type DiscordWebhookBody, type GitHubConfig, type GitHubRestClient, PathScopeError, type PlatformDescriptor, RESERVED_MANIFEST_PATH, type ReleaseStatus, type SourceBundle, type StagedFile, type StatusResult, TagWideningError, assertServerOnly, assertValidCommit, buildAccessRequest, buildAccessRequestDiscordBody, buildDeploymentManifest, deriveSourceCommit, normalizeGithubRepo, releaseTag, sha256Prefixed, shortCommit, stageFiles, validateManifest };

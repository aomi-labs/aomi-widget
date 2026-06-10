// =============================================================================
// Public input/output types
// =============================================================================

/**
 * The app's files, keyed by path **relative to `apps/<slug>/`** (posix).
 * Values are file contents (UTF-8 string or raw bytes).
 *
 * Do NOT include `.aomi/deployment.json` — the client generates it. Paths that
 * escape the app dir (absolute, or containing `..`) are rejected.
 */
export type SourceBundle = Record<string, string | Uint8Array>;

export interface GitHubConfig {
  /** `owner/repo`, e.g. "aomi-labs/krexa-hosted-apps". */
  repo: string;
  /** Publish branch; defaults to "publish". */
  branch?: string;
  /**
   * GitHub **read** token. Optional — only needed when the platform repo is
   * **private**, for `status` polling and as the one-shot read PAT the backend
   * uses to fetch the private release on `activate`. Public repos (the
   * playground) need no token: GitHub reads are unauthenticated. The *write*
   * credential is NOT here — the backend commits server-side with its own
   * stored bot PAT (Phase 6).
   */
  botPat?: string;
}

export interface AomiConfig {
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
 * Optional Discord delivery for activation requests. Mirrors the `aomi-git`
 * code-owned webhook, but here the destination is consumer-configured (this
 * library never hardcodes secrets). When `webhookUrl` is set, `requestActivation`
 * POSTs the embed; otherwise it just returns the body for you to deliver.
 */
export interface DiscordConfig {
  /** Incoming webhook URL for the activation-request channel. */
  webhookUrl?: string;
  /** Ops role/user mention, e.g. "<@&123>". Goes in the message `content`. */
  opsMention?: string;
}

export interface AuditEvent {
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

export interface DeploymentClientOptions {
  github: GitHubConfig;
  aomi: AomiConfig;
  /**
   * Platform descriptor (`platform.json`). If omitted, a krexa-shaped default
   * is derived from `aomi.platform` + `github.repo`. Pass the real descriptor
   * to guarantee the manifest matches the publish CI validator.
   */
  descriptor?: import("./contract").PlatformDescriptor;
  /** Optional Discord delivery for `requestActivation`. */
  discord?: DiscordConfig;
  /** Called on every privileged op. The proxy MUST persist this (attribution). */
  onAudit?: (event: AuditEvent) => void | Promise<void>;
  /** Injectable for tests; defaults to a real Octokit. */
  octokit?: unknown;
}

export interface DeployInput {
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

export interface DeployResult {
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

export type CiStatus = "pending" | "running" | "success" | "failure" | "unknown";
export type ReleaseStatus = "absent" | "building" | "ready";

export interface StatusResult {
  ci: CiStatus;
  release: ReleaseStatus;
  releaseTag: string | null;
}

export interface ActivateInput {
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

export interface ActivateResult {
  activated: boolean;
  status: number;
  /** Raw backend response body (JSON or text). */
  body: unknown;
}

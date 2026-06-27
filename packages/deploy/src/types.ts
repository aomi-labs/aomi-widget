// =============================================================================
// Public input/output types for the repo-scoped platform deploy contract.
// =============================================================================

export interface AomiConfig {
  /** Backend base URL, e.g. "https://api-staging.aomi.dev". */
  backendUrl: string;
  /**
   * Bearer token for platform/app activation (deploy / activate / status, and
   * the bootstrap reads). Optional so a bootstrap-only client can be built with
   * just `adminBearer`. Server-side only.
   */
  activationToken?: string;
  /**
   * Privileged admin/service AomiBearer for bootstrap writes — minting the very
   * first platform token, which no activation token can do yet. Mint it with
   * `@aomi-labs/service` (the signing twin). Server-side only.
   */
  adminBearer?: string;
}

export interface AuditEvent {
  action:
    | "request"
    | "preflight"
    | "deploy"
    | "activate"
    | "status"
    | "mint_token"
    | "list_tokens"
    | "revoke_token"
    | "sync_source"
    | "scaffold"
    | "list_apps"
    | "get_app"
    | "exchange_github_code"
    | "list_user_sources"
    | "get_user_source_latest_deployment";
  platform?: string;
  appSourceId?: number;
  apps?: string[];
  targetTags?: string[];
  /** Token scope for `mint_token`. */
  scope?: TokenScope;
  /** Source repo / scaffolded repo name for source + scaffold ops. */
  repo?: string;
  /** Token id for `revoke_token`. */
  tokenId?: number;
  actor?: string;
  ts: number;
}

export interface DeploymentClientOptions {
  aomi: AomiConfig;
  /** Called on every privileged op. The proxy should persist this. */
  onAudit?: (event: AuditEvent) => void | Promise<void>;
}

/** Immutable git commit SHA accepted by the platform deploy backend. */
export type SourceRef = string;

export interface DeployInput {
  platform: string;
  /** Connected GitHub App source row selected for this deploy. */
  appSourceId: number;
  sourceRef: SourceRef;
  /** Optional explicit manifests. Empty/omitted lets the backend discover every aomi.toml. */
  aomiTomlPaths?: string[];
  actor?: string;
}

export interface PreflightInput extends DeployInput {}

export type DeployStatus =
  | "preflight"
  | "pr_created"
  | "pr_updated"
  | "unchanged";
export type CiStatus = "no_ci" | "pending" | "running" | "passed" | "failed";

export interface DeployResult {
  ok: boolean;
  deployment: DeployPayload;
}

export interface DeployPayload {
  id: string;
  status: DeployStatus | string;
  source: Source;
  platform: Platform;
}

export interface Source {
  installationId: number;
  repositoryId: number;
  repositoryLink: string;
  ownerRepoName?: string;
  ref: SourceRef;
  commitHash: string;
  aomiTomlPaths: string[];
}

export interface Platform {
  platform: string;
  repository: string;
  deployBranch: string;
  sourceBranch: string;
  commitHash: string | null;
  prNumber: number | null;
  prUrl: string | null;
  ciStatus: CiStatus | null;
  ciUrl: string | null;
  apps: AppRecord[];
}

export interface AppRecord {
  name: string;
  path: string;
  aomiTomlPath: string;
  releaseTag: string;
  target?: string | null;
  files: AppFileRecord[];
}

export interface AppFileRecord {
  path: string;
  sha256: string;
  bytes: number;
}

export interface ReleaseTags {
  kind: "release_tags";
  value: string[];
}

export interface ActivateInput {
  platform: string;
  target: ReleaseTags;
  /** Apps to activate. Optional; the backend can derive names from release tags. */
  apps?: string[];
  targetTags?: string[];
  actor?: string;
}

export interface ActivateResult {
  ok: boolean;
  activation: {
    status: "activating" | "partial_failed" | string;
    platform: string;
    target: {
      kind: string;
      value: unknown;
      platformRepo?: string | null;
      platformBranch?: string | null;
      platformCommitHash?: string | null;
      ciStatus?: CiStatus | null;
      ciUrl?: string | null;
      promoted: ActivationPromotion[];
    };
    apps: ActivatedApp[];
  };
}

export interface ActivationPromotion {
  name: string;
  releaseTag: string;
  sourceBranch: string;
  platformCommitHash: string | null;
  liveCommitHash?: string | null;
  activationStatus?: "promoted" | "unchanged" | string | null;
  ciStatus: CiStatus | string;
  ciUrl: string | null;
  releaseAssets: string[];
  releaseAssetDigests?: Record<string, string>;
}

export interface ActivatedApp {
  applicationId?: number | null;
  name: string;
  path?: string | null;
  releaseTag?: string | null;
  isActive: boolean;
  artifactReady?: boolean | null;
  loaded: boolean;
  error?: string | null;
  sourceBranch?: string | null;
  liveCommitHash?: string | null;
  activationStatus?: "promoted" | "unchanged" | string | null;
  activationPr?: unknown | null;
  activationPrCloseError?: string | null;
}

export interface StatusInput {
  platform: string;
  /** Deployment ID to poll `/api/platforms/:platform/deployments/:id/status`. */
  deploymentId?: string;
  /** Optional backend status path. Defaults to `/api/platforms/:platform/status`. */
  path?: string;
  actor?: string;
}

// NEW — replaces StatusResult = unknown
export interface DeploymentStatus {
  state: "no_ci" | "building" | "releasing" | "ready" | "failed" | "pending";
  deployment?: DeployPayload;
  releaseTags: string[];
  apps?: DeploymentAppStatus[];
  ci?: { status?: string; url?: string; commitHash?: string };
  message?: string;
}

export interface DeploymentAppStatus {
  name: string;
  releaseTag: string;
  releaseReady: boolean;
  releaseAssets?: string[];
  releaseAssetDigests?: Record<string, string>;
  message?: string | null;
}

/** Structured progress value emitted with every DeploymentProgressEvent. */
export interface ProgressModel {
  /** 0–total */
  completed: number;
  /** total steps (>0) */
  total: number;
  /** human-readable phase label, e.g. "Building CI (2/5)" */
  label: string;
}

export type DeploymentEventKind =
  | "progress" // normal polling tick
  | "terminal" // ready or failed — polling will stop
  | "warning" // transient polling failure, will retry
  | "error"; // polling stopped due to exhaustion/timeout/cancellation/non-retryable

export interface DeploymentProgressEvent {
  kind: DeploymentEventKind;
  status: DeploymentStatus;
  progress: ProgressModel;
  /** Only set when kind === "error" || kind === "warning" */
  error?: Error;
}

export interface WatchDeploymentOptions {
  /** Polling interval for the first tick (ms). Default: 3000 */
  baseDelayMs?: number;
  /** Maximum polling interval after backoff (ms). Default: 30000 */
  maxDelayMs?: number;
  /** Maximum number of consecutive failures before emitting error event. Default: 8 */
  maxRetries?: number;
  /** AbortSignal to cancel the watch loop externally. */
  signal?: AbortSignal;
}

// =============================================================================
// Bootstrap surface — the runbook steps before deploy.
//
// Twin of the Rust `aomi-build` bootstrap commands; every call maps 1:1 onto a
// `/api/platforms/*` route (mint a token → resolve/scaffold a source → list
// apps). The `bearer` override lets a single client carry both an activation
// token (deploy/activate) and a privileged admin bearer (token minting).
// =============================================================================

/** Per-call bearer override — wins over the client's configured tokens. */
interface BearerOverride {
  /**
   * Bearer to authorize this call. For `mintToken` this is the privileged
   * admin/service AomiBearer; otherwise an activation token. Defaults to the
   * client's configured token (admin-preferred for privileged writes).
   */
  bearer?: string;
  actor?: string;
}

// ── Tokens (POST/GET/DELETE /api/platforms/:p/tokens) ────────────────────────

export type TokenScope = "platform" | "app";

export interface MintTokenInput extends BearerOverride {
  platform: string;
  scope: TokenScope;
  /** Required when `scope === "app"`. The target `applications.id`. */
  appId?: number;
}

/** Plaintext is returned ONCE at mint time; the backend stores only its hash. */
export interface MintedToken {
  id: number;
  token: string;
  scope: TokenScope | string;
}

export interface TokenRecord {
  id: number;
  scope: TokenScope | string | null;
  appId: number | null;
  tokenHashPrefix: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  appsUsage: string[] | null;
  platformUsage: string | null;
}

export interface ListTokensInput extends BearerOverride {
  platform: string;
}

export interface RevokeTokenInput extends BearerOverride {
  platform: string;
  id: number;
}

// ── App sources (POST sync-installed / GET resolve / POST create-from-template)

export interface AppSource {
  id: number;
  installationId: number;
  repositoryId: number | null;
  repositoryLink: string | null;
  sourceRef: SourceRef | null;
  commitHash: string | null;
  githubAccount: string | null;
  githubUserId: number | null;
  boundPlatformId: number | null;
  boundPlatformName?: string | null;
  createdBy?: string | null;
  templateRepo?: string | null;
  launchSourceKind?: string | null;
}

export interface SyncSourceInput extends BearerOverride {
  platform: string;
  /** `owner/name` of a repo already installed on the Aomi GitHub App. */
  repo: string;
}

export interface ScaffoldInput extends BearerOverride {
  platform: string;
  installationId: number;
  /** New repo name created in the installation's account from the template. */
  repoName: string;
  /** Template `owner/repo` to copy for the one-shot flow. */
  templateRepo: string;
  /** Create the new repo private. Defaults to false. */
  private?: boolean;
}

// ── Platform apps (GET /api/platforms/:p/apps[/:app]) ────────────────────────

export interface ListAppsInput extends BearerOverride {
  platform: string;
}

export interface GetAppInput extends BearerOverride {
  platform: string;
  app: string;
  /** Check loaded-state for a specific release tag. */
  releaseTag?: string;
}

export interface PlatformApp {
  id: number;
  name: string;
  label: string | null;
  platform: string | null;
  isActive: boolean;
  isPublic: boolean;
  appSourceId: number | null;
  appReleaseTag: string | null;
  targetTags: string[];
  loaded: boolean;
  artifactReady?: boolean | null;
}

// ── GitHub identity + per-user sources (the sign-in dashboard) ────────────────

export interface ExchangeGitHubCodeInput extends BearerOverride {
  /** GitHub OAuth authorization code from the sign-in redirect. */
  code: string;
  /** Which configured GitHub App (1 = build, 2 = oneshot). */
  app?: number;
}

export interface GitHubIdentity {
  githubUserId: string;
  githubLogin: string;
}

export interface ListUserSourcesInput extends BearerOverride {
  githubUserId: string;
  platform?: string;
}

export interface GetUserSourceLatestDeploymentInput extends BearerOverride {
  githubUserId: string;
  platform: string;
  appSourceId: number;
}

export interface UserSourceDeploymentApp {
  name: string;
  releaseTag: string | null;
  target?: string | null;
  applicationId?: number | null;
  appSourceId?: number | null;
  appReleaseTag?: string | null;
  isActive?: boolean;
  artifactReady?: boolean | null;
  loaded?: boolean;
}

export interface UserSourceLatestDeployment {
  deploymentId: string | null;
  state: string | null;
  deployBranch: string | null;
  platformRepo: string | null;
  commitHash: string | null;
  ciStatus: string | null;
  ciUrl: string | null;
  ciRunId?: string | number | null;
  releaseTags: string[];
  artifactTarget?: string | null;
  buildTarget?: string | null;
  apps: UserSourceDeploymentApp[];
}

/** A source repo plus the applications deployed from it. */
export interface UserSource extends AppSource {
  apps: PlatformApp[];
  latestDeployment?: UserSourceLatestDeployment | null;
}

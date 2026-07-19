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
    | "promote"
    | "rerun"
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
    | "list_user_deployments"
    | "list_user_source_deployments"
    | "list_user_source_bots"
    | "create_user_source_bot"
    | "delete_user_source_bot"
    | "list_user_source_transactions"
    | "get_user_source_usage"
    | "list_user_source_logs"
    | "get_user_source_observability"
    | "upgrade_user_source_sdk"
    | "get_source_sdk_upgrade_status"
    | "list_deployment_records"
    | "get_user_source_latest_deployment"
    | "deactivate"
    | "ingest_secrets";
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

export interface ListSecretsInput extends BearerOverride {
  githubUserId?: string;
  clientId?: string;
}

export interface ListSecretsResult {
  byApp: Record<string, string[]>;
}

export interface IngestSecretsInput extends BearerOverride {
  /** GitHub user id used as the only owner scope for app secret vault entries. */
  githubUserId: string;
  app: string;
  /** Optional portal source row id used to scope list/delete surfaces. */
  sourceId?: string;
  secrets: Record<string, string>;
}

export interface IngestSecretsResult {
  handles: Record<string, string>;
}

export interface ListAppSecretsInput extends BearerOverride {
  /** GitHub user id used as the only owner scope for app secret vault entries. */
  githubUserId: string;
  /** When present, only this app's handles are returned. */
  app?: string;
  /** When present, only this source's handles are returned. */
  sourceId?: string;
}

export interface RemoveAppSecretInput extends BearerOverride {
  /** GitHub user id used as the only owner scope for app secret vault entries. */
  githubUserId: string;
  app: string;
  sourceId?: string;
  name: string;
}

export interface ServerTagsResult {
  serverTags: string[];
  sdkVersion: string;
}

export interface SdkVersionStatus {
  requiredVersion: string;
  projectVersion?: string | null;
  lockfileVersion?: string | null;
  cliVersion?: string | null;
  status: "unknown" | "matching" | "outdated" | "loose" | "missing";
  fixCommand?: string | null;
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
  sdkVersion?: string | null;
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
  sdkVersion?: string | null;
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
  /** Optional owner filter for deployment status reads made from Aomi Build. */
  githubUserId?: string;
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
  /** Signed-in GitHub user id to bind this existing source to, when known. */
  githubUserId?: string;
}

export interface ScaffoldInput extends BearerOverride {
  platform: string;
  installationId: number;
  /** New repo name created in the installation's account from the template. */
  repoName: string;
  /** Template `owner/repo` to copy for the one-shot flow. */
  templateRepo: string;
  /**
   * GitHub user the created source is owned by. Written onto the source row at
   * insert so it appears on the developer's dashboard immediately. Supplied by
   * the portal BFF from the signed-in GitHub session.
   */
  githubUserId: string;
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
  /** Redirect URI used when the authorization code was issued. */
  redirectUri?: string;
}

export interface GitHubIdentity {
  githubUserId: string;
  githubLogin: string;
  /**
   * Most-recent installation of the exchanged App visible to this user, if any.
   * Lets the portal skip the install step when the App is already installed.
   */
  installationId: string | null;
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

export interface ListUserSourceDeploymentsInput extends BearerOverride {
  githubUserId: string;
  platform: string;
  appSourceId: number;
  limit?: number;
}

export interface UserDeploymentsCursor {
  createdAt: number;
  id: number;
}

export interface ListUserDeploymentsInput extends BearerOverride {
  githubUserId: string;
  platform: string;
  limit?: number;
  cursor?: UserDeploymentsCursor | null;
}

/** One append-only promotion record from the backend deployment log. */
export interface DeploymentRecord {
  deploymentId: string;
  releaseTag: string;
  actor: string | null;
  createdAt: number;
  sdkVersion: string | null;
  current: boolean;
}

export interface ListDeploymentRecordsInput extends BearerOverride {
  platform: string;
  app: string;
  /** Disambiguates same-named apps across sources on one platform. */
  appSourceId?: number;
}

export interface DeactivateAppInput extends BearerOverride {
  platform: string;
  app: string;
  /** Disambiguates same-named apps across sources on one platform. */
  appSourceId?: number;
  actor?: string;
}

export interface ListDeploymentRecordsResult {
  app: string;
  currentReleaseTag: string | null;
  records: DeploymentRecord[];
}

export interface UserSourceDeploymentApp {
  name: string;
  releaseTag: string | null;
  sdkVersion?: string | null;
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
  sdkVersion?: string | null;
  artifactTarget?: string | null;
  buildTarget?: string | null;
  /** Epoch seconds of the deploy request (`created_at`); null on legacy
   *  records that predate the timestamp. */
  createdAt?: number | null;
  apps: UserSourceDeploymentApp[];
}

export interface UserDeployment extends UserSourceLatestDeployment {
  sourceId: number;
  repositoryLink: string | null;
}

export interface UserDeploymentsPage {
  deployments: UserDeployment[];
  nextCursor: UserDeploymentsCursor | null;
}

/** A source repo plus the applications deployed from it. */
export interface UserSource extends AppSource {
  apps: PlatformApp[];
  latestDeployment?: UserSourceLatestDeployment | null;
  /** SDK version of the source's live app, from the DB promotion records
   *  (populated in the source list without a GitHub read). */
  sdkVersion?: string | null;
}

export interface OwnedOperateSourceInput extends BearerOverride {
  githubUserId: string;
  platform: string;
  appSourceId: number;
}

export type SourceSdkUpgradeResult =
  | {
      status: "current";
      requiredSdkVersion: string;
      sourceRef: string;
    }
  | {
      status: "pull_request";
      requiredSdkVersion: string;
      sourceRef: string;
      branch: string;
      files: string[];
      pullRequest: {
        number: number;
        url: string;
        created: boolean;
      };
    }
  | {
      status: "manual";
      requiredSdkVersion: string;
      sourceRef: string;
      reason: string;
      command: string;
    };

/**
 * Cheap read-only merge poll for the upgrade PR opened by an earlier
 * `upgradeUserSourceSdk` call. `merged` is terminal (redeploy from the merged
 * default branch); `open` means keep polling; `closed`/`none` mean the PR is
 * gone, so re-run the upgrade to recreate it.
 */
export type SourceSdkUpgradeStatusResult = {
  status: "merged" | "open" | "closed" | "none";
  requiredSdkVersion: string;
  branch: string;
  pullRequest: {
    number: number;
    url: string;
    state: string;
    merged: boolean;
  } | null;
};

export interface ListUserSourceTransactionsInput extends OwnedOperateSourceInput {
  cursor?: OperateTransactionCursor | string | null;
  limit?: number;
  status?: string;
}

export interface GetUserSourceUsageInput extends OwnedOperateSourceInput {
  fromDate?: string;
  toDate?: string;
}

export interface ListUserSourceLogsInput extends OwnedOperateSourceInput {
  cursor?: OperateLogCursor | string | null;
  limit?: number;
  type?: "deployment" | "usage" | "transaction" | string;
}

export interface OperateTransactionCursor {
  createdAt: number;
  id: string;
}

export interface OperateLogCursor {
  occurredAt: number;
  eventType: string;
  id: string;
}

export interface BotRegistration {
  id: string;
  platform: string;
  status: string;
  label: string | null;
  defaultApp: string;
  platformBotId: string;
  platformUsername: string | null;
  webhookUrl: string | null;
  threadMode: string;
  createdAt: number;
}

export interface CreateUserSourceBotInput extends OwnedOperateSourceInput {
  applicationId: number;
  /** The bot's platform (e.g. "telegram") — distinct from `platform`, which
   *  is the deploy platform (e.g. "community"). Maps to the request body's
   *  `platform` field. */
  botPlatform: string;
  /** Passed through to the backend; never stored, logged, or returned. */
  credential: string;
  label?: string;
  threadMode?: string;
}

export interface DeleteUserSourceBotInput extends OwnedOperateSourceInput {
  botId: string;
}

export interface OperateTransaction {
  id: string;
  externalTxId: string;
  application: string;
  applicationId: number | null;
  status: string;
  txHash: string | null;
  chainId: number;
  fromAddress: string;
  toAddress: string;
  value: string;
  hasCalldata: boolean;
  calldataPreview: string | null;
  description: string | null;
  createdAt: number;
  updatedAt: number;
  submittedAt: number | null;
}

export interface OperateTransactionsResult {
  source: AppSource;
  platform: string;
  transactions: OperateTransaction[];
  nextCursor: OperateTransactionCursor | null;
}

export interface OperateUsageDailyRow {
  periodUtcDay: string;
  application: string;
  applicationId: number;
  inputTokens: number;
  outputTokens: number;
  creditsUsed: number;
}

export interface OperateUsageBreakdownRow {
  provider: string;
  model: string;
  paymentMethod: string;
  inputTokens: number;
  outputTokens: number;
  creditsUsed: number;
  events: number;
}

export interface OperateUsageResult {
  source: AppSource;
  platform: string;
  range: { fromDate: string; toDate: string; maxDays: number };
  daily: OperateUsageDailyRow[];
  breakdown: OperateUsageBreakdownRow[];
}

export interface OperateLogEntry {
  occurredAt: number;
  eventType: string;
  id: string;
  application: string;
  applicationId: number | null;
  summary: string;
  details: Record<string, unknown>;
}

export interface OperateLogsResult {
  source: AppSource;
  platform: string;
  logs: OperateLogEntry[];
  nextCursor: OperateLogCursor | null;
}

export interface OperateAppHealth {
  applicationId: number;
  application: string;
  active: boolean;
  loaded: boolean;
  releaseTag: string | null;
  sdkVersion: string | null;
  status: "healthy" | "not_loaded" | "inactive" | string;
  metrics?: OperateAppMetrics | null;
}

export interface OperateAppMetrics {
  provider: "grafana_prometheus" | string;
  windowSeconds: number;
  available: boolean;
  requestsPerMinute: number | null;
  errorRate: number | null;
  p95LatencyMs: number | null;
  inflightRequests: number | null;
}

export interface OperateDashboardLink {
  label: string;
  url: string;
  scope: string;
}

export interface OperatePlatformMetric {
  label: string;
  value: number | null;
  unit: string;
  scope: "platform" | string;
  description?: string;
}

export interface OperateMonitoringStatus {
  provider: "grafana_prometheus" | string;
  status: "ok" | "partial" | "unavailable" | "unconfigured" | string;
  windowSeconds: number;
}

export interface OperateObservabilityResult {
  source: AppSource;
  platform: string;
  scope: "owned_applications" | string;
  monitoring?: OperateMonitoringStatus | null;
  apps: OperateAppHealth[];
  dashboardLinks: OperateDashboardLink[];
  platformMetrics: OperatePlatformMetric[];
}

// =============================================================================
// Deployment-management surface. These types are shared by the standalone
// dashboard/TUI work while the current launch routes remain compatible.
// =============================================================================

export interface RedactedDeploymentSecret {
  name: string;
  app?: string | null;
  scope: "user_app" | "user" | "project" | string;
  configured: boolean;
  updatedAt?: string | null;
}

export interface RedactedDeploymentEnvVar {
  name: string;
  app?: string | null;
  scope: "app" | "project" | string;
  configured: boolean;
  updatedAt?: string | null;
}

export interface PromoteInput {
  platform: string;
  deploymentId: string;
  apps?: string[];
  targetTags?: string[];
  actor?: string;
}

export interface PromoteResult {
  ok: boolean;
  promote: {
    deploymentId: string;
    releaseTags: string[];
    status: "promoted" | "blocked" | string;
    sdkStatus?: SdkVersionStatus | null;
    activation?: ActivateResult["activation"];
  };
}

/** A secret an app declares via the SDK's `Secret::new(name, description, required)`. */
export interface SecretSlot {
  name: string;
  description: string;
  required: boolean;
}

export interface ReleaseManifestPlugin {
  file: string;
  sha256: string;
  secrets?: SecretSlot[];
}

/** The `manifest.json` asset published with every plugin release. */
export interface ReleaseManifest {
  app_release_tag: string;
  sdk_version: string;
  target: string;
  commit: string;
  plugins: Record<string, ReleaseManifestPlugin>;
}

export interface RerunDeploymentInput {
  platform: string;
  deploymentId: string;
  /** Optional owner filter enforced by the backend for Aomi Build calls. */
  githubUserId?: string;
  actor?: string;
}

export interface RerunDeploymentResult {
  ok: boolean;
  deploymentId: string;
  commitHash: string | null;
  runId: number | null;
  ciUrl: string | null;
}

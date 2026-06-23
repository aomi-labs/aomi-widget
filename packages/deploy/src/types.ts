// =============================================================================
// Public input/output types for the repo-scoped platform deploy contract.
// =============================================================================

export interface AomiConfig {
  /** Backend base URL, e.g. "https://api-staging.aomi.dev". */
  backendUrl: string;
  /** Bearer token for platform/app activation. Server-side only. */
  activationToken: string;
}

export interface AuditEvent {
  action: "request" | "deploy" | "activate" | "status";
  platform?: string;
  appSourceId?: number;
  apps?: string[];
  targetTags?: string[];
  actor?: string;
  ts: number;
}

export interface DeploymentClientOptions {
  aomi: AomiConfig;
  /** Called on every privileged op. The proxy should persist this. */
  onAudit?: (event: AuditEvent) => void | Promise<void>;
}

export type SourceRef =
  | { kind: "branch"; value: string }
  | { kind: "commit"; value: string };

export interface DeployInput {
  platform: string;
  /** Connected GitHub App source row selected for this deploy. */
  appSourceId: number;
  sourceRef: SourceRef;
  aomiTomlPaths: string[];
  /** Resolve + validate only; open no PR, write nothing. */
  dryRun?: boolean;
  actor?: string;
}

export type DeployStatus = "dry_run" | "pr_created" | "pr_updated";
export type CiStatus = "pending" | "running" | "passed" | "failed";

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
    status: "activated" | "partial_failed" | string;
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
  platformCommitHash: string;
  liveCommitHash?: string | null;
  ciStatus: CiStatus | string;
  ciUrl: string | null;
  releaseAssets: string[];
}

export interface ActivatedApp {
  name: string;
  path?: string | null;
  releaseTag?: string | null;
  isActive: boolean;
  loaded: boolean;
  error?: string | null;
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
  state: "building" | "releasing" | "ready" | "failed" | "pending";
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
  | "progress"   // normal polling tick
  | "terminal"   // ready or failed — polling will stop
  | "warning"    // transient polling failure, will retry
  | "error";     // polling stopped due to exhaustion/timeout/cancellation/non-retryable

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

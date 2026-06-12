// =============================================================================
// Public input/output types for the repo-scoped platform deploy contract.
// =============================================================================

export interface AomiConfig {
  /** Backend base URL, e.g. "https://staging-api.aomi.dev". */
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
  /** Optional backend status path. Defaults to `/api/platforms/:platform/status`. */
  path?: string;
  actor?: string;
}

export type StatusResult = unknown;

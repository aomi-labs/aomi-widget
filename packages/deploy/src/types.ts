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
  deployment: {
    id: string;
    status: DeployStatus | string;
    source: {
      installationId: number;
      repositoryId: number;
      repositoryLink: string;
      ownerRepoName?: string;
      ref: SourceRef;
      commitHash: string;
      aomiTomlPaths: string[];
    };
    platform: {
      platform: string;
      repository: string;
      deployBranch: string;
      sourceBranch: string;
      commitHash: string | null;
      prNumber: number | null;
      prUrl: string | null;
      ciStatus: CiStatus | null;
      ciUrl: string | null;
      apps: DeployedApp[];
    };
  };
}

export interface DeployedApp {
  name: string;
  path: string;
  aomiTomlPath: string;
  releaseTag: string;
}

export type TargetRef =
  | { kind: "platform_pr"; value: string }
  | { kind: "platform_branch"; value: string }
  | { kind: "platform_commit"; value: string }
  | { kind: "release_tags"; value: string[] };

export interface ActivateInput {
  platform: string;
  target: TargetRef;
  apps: string[];
  /** Required for `platform_commit`; ignored for PR/branch targets. */
  releaseTags?: string[];
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
    };
    apps: ActivatedApp[];
  };
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

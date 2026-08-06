// =============================================================================
// Launch client contracts — the shapes the launch BFF routes return, plus the
// required-secrets gate that blocks a deploy when env keys are missing.
//
// Browser-safe: types plus a few pure helpers, no secrets.
// =============================================================================

import type {
  ActivateResult,
  DeployPayload,
  DeploymentStatus,
  PromoteResult,
  SdkVersionStatus,
  SecretSlot,
  UserDeploymentsPage,
  UserProject,
  UserProjectLatestDeployment,
} from "../types";

// One-click is the only launch path: the host forks the template and deploys
// it for the user. (Kept as a single-member union so the small amount of
// path-keyed state plumbing stays typed.)
export type LaunchPath = "oneshot";

export const DEFAULT_TEMPLATE_REPO = "aomi-labs/playground-example";

export function templateRepoUrl(templateRepo: string): string {
  return `https://github.com/${templateRepo}`;
}

export function templateGenerateUrl(templateRepo: string): string {
  return `${templateRepoUrl(templateRepo)}/generate`;
}

/**
 * The template repo the one-shot flow forks: explicit value, else the
 * `NEXT_PUBLIC_APP_DEPLOY_TEMPLATE_REPO` env (when the bundler inlines it),
 * else the Aomi playground example.
 */
export function resolveTemplateRepo(templateRepo?: string): string {
  if (templateRepo?.trim()) return templateRepo.trim();
  if (typeof process !== "undefined") {
    const fromEnv = process.env?.NEXT_PUBLIC_APP_DEPLOY_TEMPLATE_REPO?.trim();
    if (fromEnv) return fromEnv;
  }
  return DEFAULT_TEMPLATE_REPO;
}

export type LaunchDeployPayload = DeployPayload;

export type LaunchProgress = {
  installationId?: string;
  installationStatus?: string;
  repo?: string;
  /** Cached project id from create/dashboard responses. */
  projectId?: number;
  /** Immutable source commit returned by preflight. */
  sourceRef?: string;
  deploymentId?: string;
  deployment?: LaunchDeployPayload;
  releaseTags?: string[];
  apps?: string[];
  applicationId?: string;
  live?: boolean;
};

/**
 * Preflight / preview input. This is the one place a repo may stand in for a
 * project: the preflight materializes the backend project and returns its
 * `projectId`.
 */
export type LaunchPreflightInput = {
  /**
   * Platform a project is CREATED on when `repo` stands in for a project;
   * the host's default when omitted. Ignored once `projectId` is present —
   * a known project always deploys to its own bound platform.
   */
  platform?: string;
  projectId?: number;
  sourceRef?: string;
  /** GitHub App installation that owns the project repo. Wizard context only. */
  installationId?: string;
  /** `owner/name` repo used to create the backend project when projectId is absent. */
  repo?: string;
  actor?: string;
};

/**
 * Commit a deploy against a stable project and immutable source revision.
 * No platform: the BFF derives the project's bound platform.
 */
export type LaunchDeployInput = {
  projectId: number;
  sourceRef: string;
  actor?: string;
};

export type LaunchDeployResult = {
  projectUrl?: string;
  repo: string;
  installationId?: string;
  projectId?: number;
  sourceRef?: string;
  deployment: LaunchDeployPayload;
  releaseTags: string[];
  apps: string[];
};

export type LaunchCreateRepoResult = {
  ok: boolean;
  repo: string;
  installationId: string;
  projectId?: number;
  sourceRef?: string;
};

export type LaunchStatus = DeploymentStatus;

export type LaunchActivateResult = ActivateResult;

export type LaunchAppStatus = {
  ok: boolean;
  state: "pending" | "live";
  app?: {
    id?: number;
    name: string;
    app_release_tag?: string | null;
    is_active: boolean;
    loaded: boolean;
  };
};

export type LaunchRedeployResult = {
  ok: boolean;
  projectId: number;
  platformRepo: string | null;
  ciRunId: string | null;
  ciUrl: string | null;
};

export type LaunchSdkStatus = {
  ok: boolean;
  serverTags: string[];
  sdkStatus: SdkVersionStatus;
};

export type DeploymentProjectsResult = {
  projects: UserProject[];
  githubLogin?: string;
};

export type DeploymentHistoryResult = {
  deployments: UserProjectLatestDeployment[];
};

export type DeploymentFeedResult = UserDeploymentsPage;

export type DeploymentSecretsResult = {
  byApp: Record<string, string[]>;
};

export type DeploymentPromoteResult = PromoteResult;

export type RequiredSecretsByApp = Record<
  string,
  { slots: SecretSlot[]; missing: string[] }
>;

export type RequiredSecretsResult = {
  byApp: RequiredSecretsByApp;
};

export class MissingRequiredSecretsError extends Error {
  readonly missing: Record<string, string[]>;

  constructor(missing: Record<string, string[]>) {
    const names = Object.entries(missing)
      .map(([app, keys]) => `${app}: ${keys.join(", ")}`)
      .join("; ");
    super(`Missing required secrets — ${names}`);
    this.name = "MissingRequiredSecretsError";
    this.missing = missing;
  }
}

export function missingRequiredSecrets(
  byApp: RequiredSecretsByApp,
  apps: string[],
): Record<string, string[]> {
  return Object.fromEntries(
    apps
      .map((app) => [app, byApp[app]?.missing ?? []] as const)
      .filter(([, missing]) => missing.length > 0),
  );
}

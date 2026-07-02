import type {
  ActivateResult,
  DeployPayload,
  DeploymentStatus,
} from "@aomi-labs/deploy";

// One-click is the only launch path: the portal forks the template and deploys
// it for the user. (Kept as a single-member union so the small amount of
// path-keyed state plumbing stays typed.)
export type LaunchPath = "oneshot";

export const TEMPLATE_REPO =
  process.env.NEXT_PUBLIC_APP_DEPLOY_TEMPLATE_REPO?.trim() ||
  "aomi-labs/playground-example";
export const TEMPLATE_REPO_URL = `https://github.com/${TEMPLATE_REPO}`;
export const TEMPLATE_GENERATE_URL = `${TEMPLATE_REPO_URL}/generate`;

export type LaunchDeployPayload = DeployPayload;

export type LaunchProgress = {
  installationId?: string;
  installationStatus?: string;
  repo?: string;
  /** Cached source row id from create/sync/dashboard responses. */
  appSourceId?: number;
  /** Immutable source commit returned by source sync/create. */
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
 * source row: the preflight materializes the backend source and returns its
 * `appSourceId`.
 */
export type LaunchPreflightInput = {
  appSourceId?: number;
  sourceRef?: string;
  /** GitHub App installation that owns the source repo. Wizard context only. */
  installationId?: string;
  /** `owner/name` repo used to mint the backend source when appSourceId is absent. */
  repo?: string;
  actor?: string;
};

/** Commit a deploy against a stable, already-resolved source row. */
export type LaunchDeployInput = {
  appSourceId: number;
  sourceRef?: string;
  repo?: string;
  actor?: string;
};

export type LaunchDeployResult = {
  repo: string;
  installationId?: string;
  appSourceId?: number;
  sourceRef?: string;
  deployment: LaunchDeployPayload;
  releaseTags: string[];
  apps: string[];
};

export type LaunchCreateRepoResult = {
  ok: boolean;
  repo: string;
  installationId: string;
  appSourceId?: number;
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
  appSourceId: number;
  platformRepo: string;
  ciRunId: string;
  ciUrl: string;
};

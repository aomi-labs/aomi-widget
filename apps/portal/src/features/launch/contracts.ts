export type LaunchPath = "oneshot" | "bootstrap";

export const TEMPLATE_REPO = "aomi-labs/playground-example";
export const TEMPLATE_REPO_URL = `https://github.com/${TEMPLATE_REPO}`;
export const TEMPLATE_GENERATE_URL = `${TEMPLATE_REPO_URL}/generate`;

export type LaunchDeployPayload = {
  id: string;
  status?: string;
  source?: Record<string, unknown>;
  platform?: {
    platform?: string;
    repository?: string;
    deploy_branch?: string;
    deployBranch?: string;
    source_branch?: string;
    sourceBranch?: string;
    commit_hash?: string | null;
    commitHash?: string | null;
    pr_number?: number | null;
    prNumber?: number | null;
    pr_url?: string | null;
    prUrl?: string | null;
    ci_status?: string | null;
    ciStatus?: string | null;
    ci_url?: string | null;
    ciUrl?: string | null;
    apps?: Array<{
      name: string;
      path?: string;
      aomi_toml_path?: string;
      aomiTomlPath?: string;
      release_tag?: string;
      releaseTag?: string;
      target?: string;
    }>;
  };
};

export type LaunchProgress = {
  installationId?: string;
  installationStatus?: string;
  repo?: string;
  /** Cached source row id from create/sync/dashboard responses. Deploy still
   *  re-resolves by installation/repo in the BFF before calling the backend. */
  appSourceId?: number;
  deploymentId?: string;
  deployment?: LaunchDeployPayload;
  releaseTags?: string[];
  apps?: string[];
  applicationId?: string;
  live?: boolean;
};

export type LaunchDeployInput = {
  /** Existing backend source row id. Preferred when the dashboard already has it. */
  appSourceId?: number;
  /** GitHub App installation that owns the source repo. Kept for wizard state. */
  installationId: string;
  /** Optional `owner/name` disambiguator when an installation has more than one repo. */
  repo?: string;
  actor?: string;
};

export type LaunchDeployResult = {
  repo: string;
  deployment: LaunchDeployPayload;
  releaseTags: string[];
  apps: string[];
};

export type LaunchCreateRepoResult = {
  ok: boolean;
  repo: string;
  installationId: string;
  appSourceId?: number;
};

export type LaunchStatus = {
  state: "building" | "releasing" | "ready" | "failed" | "pending";
  deployment?: LaunchDeployPayload;
  releaseTags: string[];
  apps?: Array<{
    name: string;
    release_tag: string;
    release_ready: boolean;
    message?: string | null;
  }>;
  ci?: {
    status?: string;
    url?: string;
    commit_hash?: string;
    commitHash?: string;
  };
  message?: string;
};

export type LaunchActivateResult = {
  ok: boolean;
  activation?: {
    status?: string;
    apps?: Array<{
      application_id?: number | null;
      applicationId?: number | null;
      name: string;
      release_tag?: string | null;
      is_active: boolean;
      loaded: boolean;
      error?: string | null;
    }>;
  };
};

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

export type LaunchSyncInstalledResult = {
  ok: boolean;
  repo: string;
  installationId: string;
  appSourceId?: number;
};

export type LaunchRedeployResult = {
  ok: boolean;
  appSourceId: number;
  platformRepo: string;
  ciRunId: string;
  ciUrl: string;
};

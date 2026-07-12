// =============================================================================
// Launch client contracts — the shapes the launch BFF routes return.
//
// Browser-safe: types plus a few pure helpers, no env reads and no secrets.
// =============================================================================

import type { ActivateResult, DeployPayload, DeploymentStatus } from "../types";

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

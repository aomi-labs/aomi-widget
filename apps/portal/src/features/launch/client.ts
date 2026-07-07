"use client";

import { API_PATHS } from "@portal/lib/api-paths";
import { sessionScopedFetch } from "@portal/lib/settings-api";
import {
  type LaunchActivateResult,
  type LaunchAppStatus,
  type LaunchCreateRepoResult,
  type DeploymentHistoryResult,
  type DeploymentSecretsResult,
  type ListDeploymentRecordsResult,
  type DeploymentPromoteResult,
  type DeploymentSourcesResult,
  type LaunchDeployInput,
  type LaunchDeployResult,
  type LaunchPreflightInput,
  type LaunchRedeployResult,
  type LaunchSdkStatus,
  type LaunchStatus,
} from "./contracts";
import { normalizeRepo } from "./state";

export type GithubAppOAuthStartResponse = {
  ok: boolean;
  install_url?: string;
};

export async function githubAppInstallUrl(args: {
  platform?: string;
  repo?: string;
  mode?: "install" | "authorize";
  app?: number;
}): Promise<string> {
  const params = new URLSearchParams();
  const platform = args.platform?.trim();
  if (platform) params.set("platform", platform);
  const repo = args.repo ? normalizeRepo(args.repo) : null;
  if (repo) params.set("repo", repo);
  if (args.mode === "authorize") params.set("mode", "authorize");
  if (args.app && args.app !== 1) params.set("app", String(args.app));
  const query = params.toString();
  const result = await sessionScopedFetch<GithubAppOAuthStartResponse>(
    `/api/integrations/github-app/oauth/start${query ? `?${query}` : ""}`,
  );
  if (!result.install_url) {
    throw new Error("GitHub App install URL was not returned by the backend.");
  }
  return result.install_url;
}

// Every launch BFF route returns the payload on success or `{ error }` on
// failure. Centralize that contract so each call site stays a one-liner.
async function launchFetch<T>(
  path: string,
  label: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, init);
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `${label} failed (${res.status})`);
  }
  return json;
}

function postJson<T>(path: string, label: string, input: unknown): Promise<T> {
  return launchFetch<T>(path, label, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function launchPreflight(
  input: LaunchPreflightInput,
): Promise<LaunchDeployResult> {
  return postJson(API_PATHS.bff.launch.preflight, "launch preflight", input);
}

export function launchDeploy(
  input: LaunchDeployInput,
): Promise<LaunchDeployResult> {
  return postJson(API_PATHS.bff.launch.deploy, "launch deploy", input);
}

export function launchRedeploy(input: {
  appSourceId: number;
}): Promise<LaunchRedeployResult> {
  return postJson(API_PATHS.bff.launch.redeploy, "launch redeploy", input);
}

export function launchCreateRepo(input: {
  installationId: string;
  repoName?: string;
}): Promise<LaunchCreateRepoResult> {
  return postJson(API_PATHS.bff.launch.create, "launch repo creation", input);
}

export function launchStatus(deploymentId: string): Promise<LaunchStatus> {
  return launchFetch(
    API_PATHS.bff.launch.status(deploymentId),
    "launch status",
  );
}

export function launchSdkStatus(): Promise<LaunchSdkStatus> {
  return launchFetch(API_PATHS.bff.launch.sdkStatus, "launch SDK status");
}

export function deploymentSources(): Promise<DeploymentSourcesResult> {
  return launchFetch(API_PATHS.bff.deployments.sources, "deployment sources");
}

export function deploymentSdkStatus(): Promise<LaunchSdkStatus> {
  return launchFetch(
    API_PATHS.bff.deployments.sdkStatus,
    "deployment SDK status",
  );
}

export function deploymentHistory(input: {
  appSourceId: number;
  limit?: number;
}): Promise<DeploymentHistoryResult> {
  return launchFetch(
    API_PATHS.bff.deployments.history(input.appSourceId, input.limit),
    "deployment history",
  );
}

export function deploymentSecrets(input: {
  appSourceId: number;
}): Promise<DeploymentSecretsResult> {
  return launchFetch(
    API_PATHS.bff.deployments.secrets(input.appSourceId),
    "deployment secrets",
  );
}

export function deploymentRecords(input: {
  app: string;
  appSourceId?: number;
}): Promise<ListDeploymentRecordsResult> {
  return launchFetch(
    API_PATHS.bff.deployments.records(input.app, input.appSourceId),
    "deployment records",
  );
}

export function deploymentPromote(input: {
  deploymentId: string;
  appSourceId: number;
  apps?: string[];
  actor?: string;
}): Promise<DeploymentPromoteResult> {
  return postJson(
    API_PATHS.bff.deployments.promote,
    "deployment promote",
    input,
  );
}

export function launchActivate(input: {
  releaseTags: string[];
  apps?: string[];
  actor?: string;
}): Promise<LaunchActivateResult> {
  return postJson(API_PATHS.bff.launch.activate, "launch activation", input);
}

export function deploymentDeactivate(input: {
  appSourceId: number;
  apps: string[];
}): Promise<{ ok: boolean; apps: string[] }> {
  return postJson(
    API_PATHS.bff.deployments.deactivate,
    "deployment deactivate",
    input,
  );
}

export function deploymentSetSecrets(input: {
  app: string;
  appSourceId: number;
  secrets: Record<string, string>;
}): Promise<{ ok: boolean; keys: string[] }> {
  return postJson(
    API_PATHS.bff.deployments.secrets(input.appSourceId),
    "set environment variables",
    input,
  );
}

export function deploymentDeleteSecret(input: {
  app: string;
  appSourceId: number;
  name: string;
}): Promise<{ ok: boolean; removed: boolean }> {
  return launchFetch(
    API_PATHS.bff.deployments.secrets(input.appSourceId),
    "delete environment variable",
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
}

export function launchAppStatus(input: {
  name: string;
  releaseTag?: string;
}): Promise<LaunchAppStatus> {
  return launchFetch(
    API_PATHS.bff.launch.app(input.name, input.releaseTag),
    "launch app status",
  );
}

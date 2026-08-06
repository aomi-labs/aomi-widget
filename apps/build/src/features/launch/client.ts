"use client";

// Launch/deployments BFF client — one @aomi-labs/deploy/launch client instance
// bound to Aomi Build's route mounts, re-exported as the named functions the
// call sites (and their test mocks) already use. Only `githubAppInstallUrl`
// leaves the BFF: it reaches the backend through the session-scoped fetch.

import type {
  SourceSdkUpgradeResult,
  SourceSdkUpgradeStatusResult,
} from "@aomi-labs/deploy";
import {
  createLaunchClient,
  LaunchRequestError,
  type GithubAppOAuthStartResponse,
} from "@aomi-labs/deploy/launch";
import { sessionScopedFetch } from "@build/lib/settings-api";
import {
  type LaunchActivateResult,
  type LaunchAppStatus,
  type LaunchCreateRepoResult,
  type DeploymentHistoryResult,
  type DeploymentFeedResult,
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
import type { RequiredSecretsByApp } from "./required-secrets";

export { LaunchRequestError };
export type { GithubAppOAuthStartResponse };

type PlatformInput = { platform?: string };

const client = createLaunchClient({
  backendFetch: sessionScopedFetch,
});

export function githubAppInstallUrl(args: {
  platform?: string;
  repo?: string;
  app?: number;
  returnTo?: string;
}): Promise<string> {
  return client.githubAppInstallUrl(args);
}

export function launchPreflight(
  input: LaunchPreflightInput,
): Promise<LaunchDeployResult> {
  return client.preflight(input);
}

export function launchDeploy(
  input: LaunchDeployInput,
): Promise<LaunchDeployResult> {
  return client.deploy(input);
}

export function launchRedeploy(input: {
  platform?: string;
  appSourceId: number;
}): Promise<LaunchRedeployResult> {
  return client.redeploy(input);
}

export function launchCreateRepo(input: {
  platform?: string;
  installationId: string;
  repoName?: string;
}): Promise<LaunchCreateRepoResult> {
  return client.createRepo(input);
}

export function launchStatus(
  deploymentId: string,
  platform?: string,
): Promise<LaunchStatus> {
  return client.status({ deploymentId, platform });
}

export function launchSdkStatus(): Promise<LaunchSdkStatus> {
  return client.sdkStatus();
}

export function deploymentSources(
  platform?: string,
  appSourceId?: number,
): Promise<DeploymentSourcesResult> {
  return client.deployments.sources({ platform, appSourceId });
}

export function deploymentUpgradeSdk(
  input: PlatformInput & { appSourceId: number },
): Promise<SourceSdkUpgradeResult> {
  return client.deployments.upgradeSdk(input);
}

export function deploymentSdkStatus(): Promise<LaunchSdkStatus> {
  return client.sdkStatus();
}

export function deploymentSdkUpgradeStatus(
  input: PlatformInput & { appSourceId: number },
): Promise<SourceSdkUpgradeStatusResult> {
  return client.deployments.sdkUpgradeStatus(input);
}

export function deploymentHistory(
  input: PlatformInput & { appSourceId: number; limit?: number },
): Promise<DeploymentHistoryResult> {
  return client.deployments.history(input);
}

export function deploymentFeed(input: {
  limit?: number;
  cursor?: DeploymentFeedResult["nextCursor"];
}): Promise<DeploymentFeedResult> {
  return client.deployments.feed(input);
}

export function deploymentSecrets(
  input: PlatformInput & { appSourceId: number },
): Promise<DeploymentSecretsResult> {
  return client.deployments.secrets(input);
}

export type RequiredSecretsResult = {
  byApp: RequiredSecretsByApp;
};

export function deploymentRequiredSecrets(
  input: PlatformInput & { appSourceId: number },
): Promise<RequiredSecretsResult> {
  return client.deployments.requiredSecrets(input);
}

export function deploymentRecords(
  input: PlatformInput & { app: string; appSourceId?: number },
): Promise<ListDeploymentRecordsResult> {
  return client.deployments.records(input);
}

export function deploymentPromote(input: {
  platform?: string;
  deploymentId: string;
  appSourceId: number;
  apps?: string[];
  actor?: string;
}): Promise<DeploymentPromoteResult> {
  return client.deployments.promote(input);
}

export function launchActivate(input: {
  platform?: string;
  appSourceId: number;
  releaseTags: string[];
  apps: string[];
  actor?: string;
}): Promise<LaunchActivateResult> {
  return client.activate(input);
}

export function deploymentDeactivate(input: {
  platform?: string;
  appSourceId: number;
  apps: string[];
}): Promise<{ ok: boolean; apps: string[] }> {
  return client.deployments.deactivate(input);
}

export function deploymentSetSecrets(input: {
  platform?: string;
  app: string;
  appSourceId: number;
  secrets: Record<string, string>;
}): Promise<{ ok: boolean; keys: string[] }> {
  return client.deployments.setSecrets(input);
}

export function deploymentDeleteSecret(input: {
  platform?: string;
  app: string;
  appSourceId: number;
  name: string;
}): Promise<{ ok: boolean; removed: boolean }> {
  return client.deployments.deleteSecret(input);
}

export function launchAppStatus(input: {
  name: string;
  releaseTag?: string;
}): Promise<LaunchAppStatus> {
  return client.appStatus(input);
}

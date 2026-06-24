"use client";

import { sessionScopedFetch } from "@portal/lib/settings-api";
import {
  type LaunchActivateResult,
  type LaunchAppStatus,
  type LaunchCreateRepoResult,
  type LaunchDeployInput,
  type LaunchDeployResult,
  type LaunchRedeployResult,
  type LaunchStatus,
  type LaunchSyncInstalledResult,
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

async function postLaunchDeploy(
  path: "/api/launch/dry-run" | "/api/launch/deploy",
  input: LaunchDeployInput,
): Promise<LaunchDeployResult> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as
    | LaunchDeployResult
    | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in json && json.error
        ? json.error
        : `launch deploy failed (${res.status})`;
    throw new Error(msg);
  }
  return json as LaunchDeployResult;
}

export function launchDryRun(
  input: LaunchDeployInput,
): Promise<LaunchDeployResult> {
  return postLaunchDeploy("/api/launch/dry-run", input);
}

export function launchDeploy(
  input: LaunchDeployInput,
): Promise<LaunchDeployResult> {
  return postLaunchDeploy("/api/launch/deploy", input);
}

export async function launchRedeploy(input: {
  appSourceId: number;
}): Promise<LaunchRedeployResult> {
  const res = await fetch("/api/launch/redeploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as
    | LaunchRedeployResult
    | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in json && json.error
        ? json.error
        : `launch redeploy failed (${res.status})`;
    throw new Error(msg);
  }
  return json as LaunchRedeployResult;
}

export async function launchCreateRepo(input: {
  installationId: string;
  repoName?: string;
}): Promise<LaunchCreateRepoResult> {
  const res = await fetch("/api/launch/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as
    | LaunchCreateRepoResult
    | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in json && json.error
        ? json.error
        : `launch repo creation failed (${res.status})`;
    throw new Error(msg);
  }
  return json as LaunchCreateRepoResult;
}

export async function launchStatus(
  deploymentId: string,
): Promise<LaunchStatus> {
  const res = await fetch(
    `/api/launch/status?deploymentId=${encodeURIComponent(deploymentId)}`,
  );
  const json = (await res.json().catch(() => ({}))) as
    | LaunchStatus
    | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in json && json.error
        ? json.error
        : `launch status failed (${res.status})`;
    throw new Error(msg);
  }
  return json as LaunchStatus;
}

export async function launchActivate(input: {
  releaseTags: string[];
  apps?: string[];
  actor?: string;
}): Promise<LaunchActivateResult> {
  const res = await fetch("/api/launch/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as
    | LaunchActivateResult
    | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in json && json.error
        ? json.error
        : `launch activation failed (${res.status})`;
    throw new Error(msg);
  }
  return json as LaunchActivateResult;
}

export async function launchAppStatus(input: {
  name: string;
  releaseTag?: string;
}): Promise<LaunchAppStatus> {
  const params = new URLSearchParams({ name: input.name });
  if (input.releaseTag) params.set("releaseTag", input.releaseTag);
  const res = await fetch(`/api/launch/app?${params}`);
  const json = (await res.json().catch(() => ({}))) as
    | LaunchAppStatus
    | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in json && json.error
        ? json.error
        : `launch app status failed (${res.status})`;
    throw new Error(msg);
  }
  return json as LaunchAppStatus;
}

export async function launchSyncInstalled(input: {
  repo: string;
}): Promise<LaunchSyncInstalledResult> {
  const res = await fetch("/api/launch/sync-installed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as
    | LaunchSyncInstalledResult
    | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in json && json.error
        ? json.error
        : `launch installed app sync failed (${res.status})`;
    throw new Error(msg);
  }
  return json as LaunchSyncInstalledResult;
}

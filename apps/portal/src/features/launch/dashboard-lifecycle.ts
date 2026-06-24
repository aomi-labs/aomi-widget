import type { UserSource } from "@aomi-labs/deploy";
import type { LaunchStatus } from "./contracts";
import { normalizeRepo } from "./state";

export type SourceLifecycleKind =
  | "live"
  | "build_ready"
  | "building"
  | "failed"
  | "empty";

export type SourceLifecycle = {
  kind: SourceLifecycleKind;
  repo: string;
  statusLabel: string;
  statusTone: "good" | "warning" | "bad" | "muted";
  message: string;
  appNames: string[];
  releaseTags: string[];
  chatApp?: string;
  chatApplicationId?: number;
  deploymentId?: string;
  ciStatus?: string | null;
  ciUrl?: string | null;
  branchUrl?: string | null;
  deployBranch?: string | null;
  platformRepo?: string | null;
  commitHash?: string | null;
  buildTarget?: string | null;
  progressLabel?: string;
  progressPercent?: number;
  failureReport?: string;
};

export function sourceRepoLabel(source: UserSource): string {
  return (
    normalizeRepo(source.repositoryLink ?? "") ??
    source.repositoryLink ??
    `source ${source.id}`
  );
}

export function sourceLifecycle(source: UserSource): SourceLifecycle {
  const repo = sourceRepoLabel(source);
  const latest = source.latestDeployment ?? null;
  const appNames = namesFromSource(source);
  const releaseTags = tagsFromSource(source);
  const liveApp = liveAppFromSource(source);
  const ciStatus = clean(latest?.ciStatus);
  const state = clean(latest?.state)?.toLowerCase() ?? null;
  const deploymentId = clean(latest?.deploymentId) ?? undefined;
  const platformRepo = clean(latest?.platformRepo);
  const deployBranch = clean(latest?.deployBranch);

  const base = {
    repo,
    appNames,
    releaseTags,
    deploymentId,
    ciStatus,
    ciUrl: clean(latest?.ciUrl),
    branchUrl: branchUrl(platformRepo, deployBranch),
    deployBranch,
    platformRepo,
    commitHash: clean(latest?.commitHash),
    buildTarget: clean(latest?.buildTarget ?? latest?.artifactTarget),
  };

  if (liveApp) {
    return {
      ...base,
      kind: "live",
      statusLabel: "Live",
      statusTone: "good",
      message: "The latest deployment is active.",
      chatApp: liveApp.name,
      chatApplicationId: liveApp.applicationId,
    };
  }

  if (
    state === "failed" ||
    state === "skipped" ||
    ciStatus === "failed" ||
    ciStatus === "skipped" ||
    ciStatus === "stale"
  ) {
    return {
      ...base,
      kind: "failed",
      statusLabel:
        state === "skipped" || ciStatus === "skipped"
          ? "CI skipped"
          : ciStatus === "stale"
            ? "CI stale"
            : "Build failed",
      statusTone: "bad",
      message:
        state === "skipped" || ciStatus === "skipped"
          ? "CI did not run for the latest deployment attempt."
          : "The latest deployment did not produce a usable release.",
    };
  }

  if (state === "ready" || ciStatus === "passed") {
    return {
      ...base,
      kind: "build_ready",
      statusLabel: "Build ready",
      statusTone: "warning",
      message: "Build passed and can be activated.",
    };
  }

  if (
    state === "pending" ||
    state === "building" ||
    state === "releasing" ||
    ciStatus === "pending" ||
    ciStatus === "running"
  ) {
    return {
      ...base,
      kind: "building",
      statusLabel: state === "releasing" ? "Releasing" : "Building",
      statusTone: "muted",
      message: "Waiting for platform CI and release assets.",
    };
  }

  return {
    ...base,
    kind: "empty",
    statusLabel: "Not deployed",
    statusTone: "muted",
    message: "Run a preflight to preview the deployment manifest.",
  };
}

export function deploymentIdFromReleaseTag(
  tag: string | null | undefined,
): string | null {
  const match = tag
    ?.trim()
    .match(/^apps-(\d+)-(r[a-zA-Z0-9]+)-.+-([a-fA-F0-9]{7,40})$/);
  if (!match) return null;
  return `dep_${match[1]}_${match[2]}_${match[3]}`;
}

export function lifecycleFromLaunchStatus(
  current: SourceLifecycle,
  status: LaunchStatus,
): SourceLifecycle {
  const deployment = status.deployment;
  const platform = deployment?.platform;
  const apps = platform?.apps ?? [];
  const ciStatus =
    clean(status.ci?.status) ??
    clean(platform?.ci_status ?? platform?.ciStatus) ??
    null;
  const state = status.state;
  const platformRepo =
    clean(platform?.repository) ?? current.platformRepo ?? null;
  const deployBranch =
    clean(platform?.source_branch ?? platform?.sourceBranch) ??
    current.deployBranch ??
    null;
  const releaseTags =
    status.releaseTags.length > 0
      ? status.releaseTags
      : apps
          .map((app) => app.release_tag ?? app.releaseTag)
          .map((tag) => tag?.trim())
          .filter((tag): tag is string => Boolean(tag));
  const appNames =
    apps.length > 0
      ? apps.map((app) => app.name?.trim()).filter(Boolean)
      : current.appNames;
  const progress = progressFor(state, ciStatus);
  const failed =
    state === "failed" ||
    ciStatus === "failed" ||
    ciStatus === "skipped" ||
    ciStatus === "stale";
  const ready = state === "ready";

  return {
    ...current,
    kind: failed ? "failed" : ready ? "build_ready" : "building",
    statusLabel: failed
      ? ciStatus === "skipped"
        ? "CI skipped"
        : ciStatus === "stale"
          ? "CI stale"
          : "Build failed"
      : ready
        ? "Build ready"
        : state === "releasing" || ciStatus === "passed"
          ? "Releasing"
          : "Building",
    statusTone: failed ? "bad" : ready ? "warning" : "muted",
    message: failed
      ? (status.message ??
        "The latest deployment did not produce a usable release.")
      : ready
        ? "Build passed and can be activated."
        : ciStatus === "passed"
          ? "CI passed; waiting for release assets."
          : "Waiting for platform CI and release assets.",
    appNames,
    releaseTags,
    deploymentId: deployment?.id ?? current.deploymentId,
    ciStatus,
    ciUrl:
      clean(status.ci?.url) ??
      clean(platform?.ci_url ?? platform?.ciUrl) ??
      current.ciUrl,
    branchUrl: branchUrl(platformRepo, deployBranch) ?? current.branchUrl,
    deployBranch,
    platformRepo,
    commitHash:
      clean(status.ci?.commitHash ?? status.ci?.commit_hash) ??
      clean(platform?.commit_hash ?? platform?.commitHash) ??
      current.commitHash,
    buildTarget:
      apps.map((app) => app.target?.trim()).find(Boolean) ??
      current.buildTarget,
    progressLabel: progress.label,
    progressPercent: progress.percent,
    failureReport: failed ? status.message : undefined,
  };
}

function clean(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
}

function liveAppFromSource(
  source: UserSource,
): { name: string; applicationId?: number } | null {
  const latest = source.latestDeployment;
  const latestLive = latest?.apps.find(
    (app) => app.applicationId && app.isActive,
  );
  if (latestLive) {
    return {
      name: latestLive.name,
      applicationId: latestLive.applicationId ?? undefined,
    };
  }
  if (latest) return null;

  const live = source.apps.find((app) => app.isActive);
  return live ? { name: live.name, applicationId: live.id } : null;
}

function namesFromSource(source: UserSource): string[] {
  const names =
    source.latestDeployment?.apps
      .map((app) => app.name.trim())
      .filter(Boolean) ?? [];
  if (names.length > 0) return unique(names);
  return unique(source.apps.map((app) => app.name.trim()).filter(Boolean));
}

function tagsFromSource(source: UserSource): string[] {
  const latestTags = source.latestDeployment?.releaseTags ?? [];
  const cleanLatestTags = latestTags.map((tag) => tag.trim()).filter(Boolean);
  if (cleanLatestTags.length > 0) return unique(cleanLatestTags);

  return unique(
    source.apps
      .map((app) => app.appReleaseTag?.trim())
      .filter((tag): tag is string => Boolean(tag && tag !== "latest")),
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function branchUrl(
  platformRepo: string | null,
  deployBranch: string | null,
): string | null {
  if (!platformRepo || !deployBranch) return null;
  const repo = normalizeRepo(platformRepo);
  if (!repo) return null;
  return `https://github.com/${repo}/tree/${encodeURIComponent(deployBranch)}`;
}

function progressFor(
  state: string,
  ciStatus: string | null,
): { label: string; percent: number } {
  if (state === "ready" || ciStatus === "passed") {
    return state === "ready"
      ? { label: "Build ready", percent: 100 }
      : { label: "CI passed; verifying release assets", percent: 70 };
  }
  if (state === "releasing") {
    return { label: "Verifying release assets", percent: 65 };
  }
  if (
    state === "failed" ||
    ciStatus === "failed" ||
    ciStatus === "skipped" ||
    ciStatus === "stale"
  ) {
    return {
      label:
        ciStatus === "skipped"
          ? "CI skipped"
          : ciStatus === "stale"
            ? "CI stale"
            : "Build failed",
      percent: 100,
    };
  }
  if (state === "pending" || ciStatus === "pending") {
    return { label: "Waiting for CI", percent: 15 };
  }
  return { label: "Building CI", percent: 25 };
}

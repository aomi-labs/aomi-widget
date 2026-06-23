"use client";

import type { LaunchPath, LaunchProgress } from "./contracts";

export type PendingInstall = {
  path: LaunchPath;
};

export type LaunchState = {
  path: LaunchPath | null;
  oneshot: LaunchProgress;
  bootstrap: LaunchProgress;
  pendingInstall: PendingInstall | null;
};

const STORAGE_KEY = "aomi_launch";

function empty(): LaunchState {
  return { path: null, oneshot: {}, bootstrap: {}, pendingInstall: null };
}

export function loadLaunch(): LaunchState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<LaunchState>;
    return {
      path: parsed.path ?? null,
      oneshot: parsed.oneshot ?? {},
      bootstrap: parsed.bootstrap ?? {},
      pendingInstall: parsed.pendingInstall ?? null,
    };
  } catch {
    return empty();
  }
}

export function saveLaunch(state: LaunchState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetLaunch(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function progressOf(
  state: LaunchState,
  path: LaunchPath,
): LaunchProgress {
  return state[path];
}

export function withPath(
  state: LaunchState,
  path: LaunchPath | null,
): LaunchState {
  return { ...state, path };
}

export function withProgress(
  state: LaunchState,
  path: LaunchPath,
  patch: Partial<LaunchProgress>,
): LaunchState {
  return { ...state, [path]: { ...state[path], ...patch } };
}

export function withPendingInstall(
  state: LaunchState,
  pending: PendingInstall | null,
): LaunchState {
  return { ...state, pendingInstall: pending };
}

export type GithubRedirect = {
  installationId: string;
  setupAction: string | null;
  state: string | null;
  launchStatus: string | null;
  repo: string | null;
};

export function normalizeRepo(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (host !== "github.com" && host !== "www.github.com") return null;
    const [owner, repo] = url.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    candidate = owner && repo ? `${owner}/${repo}` : "";
  } catch {
    candidate = trimmed.replace(/^github\.com\//i, "");
  }

  const m = candidate.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export function readGithubRedirect(search: string): GithubRedirect | null {
  const params = new URLSearchParams(search);
  const installationId = params.get("installation_id");
  if (!installationId) return null;
  return {
    installationId,
    setupAction: params.get("setup_action"),
    state: params.get("state"),
    launchStatus: params.get("launch"),
    repo: normalizeRepo(params.get("repo") ?? ""),
  };
}

export const GITHUB_REDIRECT_KEYS = [
  "installation_id",
  "setup_action",
  "state",
  "code",
  "launch",
  "repo",
] as const;

export type OneshotStep = "install" | "create" | "build" | "live";
export type BootstrapStep = "template" | "install" | "deploy" | "live";

export const ONESHOT_STEPS: OneshotStep[] = [
  "install",
  "create",
  "build",
  "live",
];
export const BOOTSTRAP_STEPS: BootstrapStep[] = [
  "template",
  "install",
  "deploy",
  "live",
];

export function oneshotStep(p: LaunchProgress): OneshotStep {
  if (!p.installationId) return "install";
  if (!p.repo) return "create";
  if (!p.live) return "build";
  return "live";
}

export function bootstrapStep(p: LaunchProgress): BootstrapStep {
  if (!p.repo) return "template";
  if (!p.installationId) return "install";
  if (!p.live) return "deploy";
  return "live";
}

export function installationStatusLabel(status?: string): string | null {
  switch (status) {
    case "bound":
      return "installation done";
    case "awaiting_webhook":
      return "installed, syncing repositories";
    case "awaiting_install":
      return "installation requested";
    default:
      return null;
  }
}

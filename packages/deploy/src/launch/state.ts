// =============================================================================
// Launch wizard state machine — pure functions plus a localStorage store.
//
// Browser-safe; every window/localStorage read is guarded so the module also
// loads in server components and tests.
// =============================================================================

import type { LaunchPath, LaunchProgress } from "./contracts";

export type PendingInstall = {
  path: LaunchPath;
};

export type LaunchState = {
  /**
   * Platform context for the persisted wizard progress. Wizard progress
   * belongs to exactly one platform: reusing a source id or deployment from
   * one platform after entering another would route writes to the wrong
   * platform, so hosts reset the state when this differs from the page's.
   */
  platform: string | null;
  path: LaunchPath | null;
  oneshot: LaunchProgress;
  pendingInstall: PendingInstall | null;
  /**
   * An installation id that a create attempt rejected (uninstalled, wrong
   * account, missing permissions). Kept so we never re-seed it from the signed
   * session cookie on reload or "Start over" — it's cleared when a fresh install
   * redirect supplies a new installation.
   */
  rejectedInstallationId: string | null;
};

const STORAGE_KEY = "aomi_launch";

// Minimal localStorage surface so this module typechecks without the DOM lib
// (the package tsconfig is node-only; the functions are still browser-first).
type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function browserStorage(): StorageLike | null {
  const g = globalThis as { window?: unknown; localStorage?: StorageLike };
  if (typeof g.window === "undefined") return null;
  return g.localStorage ?? null;
}

function empty(): LaunchState {
  return {
    platform: null,
    path: null,
    oneshot: {},
    pendingInstall: null,
    rejectedInstallationId: null,
  };
}

/**
 * Read the persisted wizard state.
 *
 * Pass the platform the page is rendering against and the state is scoped to
 * it: progress saved under a different platform is discarded rather than
 * returned, because reusing its `appSourceId` or deployment would route the
 * next write to the wrong platform. Without an argument the stored state is
 * returned as-is.
 */
export function loadLaunch(platform?: string | null): LaunchState {
  const scope = platform?.trim() || null;
  const storage = browserStorage();
  if (!storage) return { ...empty(), platform: scope };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { ...empty(), platform: scope };
    const parsed = JSON.parse(raw) as Partial<LaunchState>;
    const stored =
      typeof parsed.platform === "string" && parsed.platform.trim()
        ? parsed.platform.trim()
        : null;
    if (platform !== undefined && stored !== scope) {
      return { ...empty(), platform: scope };
    }
    return {
      platform: stored,
      path: parsed.path ?? null,
      oneshot: parsed.oneshot ?? {},
      pendingInstall: parsed.pendingInstall ?? null,
      rejectedInstallationId: parsed.rejectedInstallationId ?? null,
    };
  } catch {
    return { ...empty(), platform: scope };
  }
}

export function saveLaunch(state: LaunchState): void {
  browserStorage()?.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetLaunch(): void {
  browserStorage()?.removeItem(STORAGE_KEY);
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

export function withRejectedInstall(
  state: LaunchState,
  installationId: string | null,
): LaunchState {
  return { ...state, rejectedInstallationId: installationId };
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

/**
 * Is a launch mid-flow, returning from the GitHub install round-trip?
 *
 * A template → install → deploy launch is a full-page navigation away to GitHub
 * and back, so by the time we return a matching source already exists. Callers
 * (the deploy dashboard) gate the wizard on "nothing connected yet", which would
 * otherwise yank the user out of the stepper to the source list at exactly the
 * install → deploy hand-off. This stays true only while the install redirect is
 * being consumed: an active `path` plus either a saved `pendingInstall` or the
 * `installation_id` redirect still on the URL.
 */
export function isResumingInstall(state: LaunchState, search: string): boolean {
  if (!state.path) return false;
  return Boolean(state.pendingInstall) || readGithubRedirect(search) !== null;
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

export const ONESHOT_STEPS: OneshotStep[] = [
  "install",
  "create",
  "build",
  "live",
];

export function oneshotStep(p: LaunchProgress): OneshotStep {
  if (!p.installationId) return "install";
  if (!p.repo) return "create";
  if (!p.live) return "build";
  return "live";
}

export function installationStatusLabel(status?: string): string | null {
  switch (status) {
    case "bound":
      return "installation done";
    case "awaiting_install":
      return "installation requested";
    default:
      return null;
  }
}

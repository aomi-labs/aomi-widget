"use client";

// =============================================================================
// Onboarding state machine for the two "deploy an example" paths.
//
// Pure client module — it owns only the GitHub-side flow and its persistence:
//   • localStorage so progress survives the full-page redirect to github.com
//     and back (installing a GitHub App leaves the SPA entirely),
//   • a pending path marker so the backend callback redirect can resume on the
//     right step,
//   • deep-link builders for the "use this template" page,
//   • a per-path step resolver derived from accumulated progress.
//
// The deploy/create calls that need the backend (create-repo-from-template,
// deploy-by-application-id) are NOT here — the wizards call /api/onboard/*,
// which is the single seam pending the backend's opaque app-identity contract.
// =============================================================================

import { settingsApiFetch } from "@portal/lib/settings-api";

export type OnboardingPath = "oneshot" | "bootstrap";

export const TEMPLATE_REPO = "aomi-labs/playground-example";
export const TEMPLATE_REPO_URL = `https://github.com/${TEMPLATE_REPO}`;
export const TEMPLATE_GENERATE_URL = `${TEMPLATE_REPO_URL}/generate`;

/** Accept "owner/name" or a full github.com URL; return "owner/name" or null. */
export function normalizeRepo(input: string): string | null {
  const trimmed = input.trim().replace(/^https?:\/\/github\.com\//i, "");
  const m = trimmed.match(/^([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

// --- per-path progress ------------------------------------------------------
export type PathProgress = {
  /** GitHub installation id, from the install-callback redirect. */
  installationId?: string;
  /** Backend callback status: `bound`, `awaiting_webhook`, or `awaiting_install`. */
  installationStatus?: string;
  /** `owner/name` — created from the template (oneshot) or supplied by the
   *  user (bootstrap). */
  repo?: string;
  /** Release tag emitted once a deploy has been kicked off. */
  releaseTag?: string;
  /** Opaque backend app identity (the application_id contract). */
  applicationId?: string;
  /** True once activation has succeeded and the app is serving. */
  live?: boolean;
};

export type PendingInstall = {
  path: OnboardingPath;
};

export type OnboardingState = {
  /** null → render the picker. */
  path: OnboardingPath | null;
  oneshot: PathProgress;
  bootstrap: PathProgress;
  /** The in-flight GitHub redirect we expect to come back, if any. */
  pendingInstall: PendingInstall | null;
};

const STORAGE_KEY = "aomi_onboard";

function empty(): OnboardingState {
  return { path: null, oneshot: {}, bootstrap: {}, pendingInstall: null };
}

function stripMockProgress(progress: PathProgress): PathProgress {
  if (
    progress.applicationId !== "mock-app-1" &&
    !progress.releaseTag?.startsWith("apps-playground-example-")
  ) {
    return progress;
  }
  const next: PathProgress = {};
  if (progress.installationId) next.installationId = progress.installationId;
  if (progress.installationStatus) {
    next.installationStatus = progress.installationStatus;
  }
  if (progress.repo) next.repo = progress.repo;
  return next;
}

export function loadOnboarding(): OnboardingState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return {
      path: parsed.path ?? null,
      oneshot: stripMockProgress(parsed.oneshot ?? {}),
      bootstrap: stripMockProgress(parsed.bootstrap ?? {}),
      pendingInstall: parsed.pendingInstall ?? null,
    };
  } catch {
    return empty();
  }
}

export function saveOnboarding(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetOnboarding(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// --- pure state transitions -------------------------------------------------
export function progressOf(
  state: OnboardingState,
  path: OnboardingPath,
): PathProgress {
  return state[path];
}

export function withPath(
  state: OnboardingState,
  path: OnboardingPath | null,
): OnboardingState {
  return { ...state, path };
}

export function withProgress(
  state: OnboardingState,
  path: OnboardingPath,
  patch: Partial<PathProgress>,
): OnboardingState {
  return { ...state, [path]: { ...state[path], ...patch } };
}

export function withPendingInstall(
  state: OnboardingState,
  pending: PendingInstall | null,
): OnboardingState {
  return { ...state, pendingInstall: pending };
}

// --- GitHub redirect parsing ------------------------------------------------
export type GithubRedirect = {
  installationId: string;
  setupAction: string | null;
  state: string | null;
  onboard: string | null;
};

/** Parse the backend callback redirect back to `/settings`. GitHub may append
 *  `setup_action`, `state`, and `code` when this page is registered directly;
 *  the current secure flow returns from backend as `?installation_id=...&onboard=...`. */
export function readGithubRedirect(search: string): GithubRedirect | null {
  const params = new URLSearchParams(search);
  const installationId = params.get("installation_id");
  if (!installationId) return null;
  return {
    installationId,
    setupAction: params.get("setup_action"),
    state: params.get("state"),
    onboard: params.get("onboard"),
  };
}

/** The query keys GitHub adds on redirect — stripped from the URL after we fold
 *  them into state, so a refresh doesn't re-trigger hydration. */
export const GITHUB_REDIRECT_KEYS = [
  "installation_id",
  "setup_action",
  "state",
  "code",
  "onboard",
] as const;

// --- step resolvers ---------------------------------------------------------
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

export function oneshotStep(p: PathProgress): OneshotStep {
  if (!p.installationId) return "install";
  if (!p.repo) return "create";
  if (!p.live) return "build";
  return "live";
}

export function bootstrapStep(p: PathProgress): BootstrapStep {
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

export type GithubAppOAuthStartResponse = {
  ok: boolean;
  install_url?: string;
};

export async function githubAppInstallUrl(args: {
  platform?: string;
}): Promise<string> {
  const params = new URLSearchParams();
  const platform = args.platform?.trim();
  if (platform) params.set("platform", platform);
  const query = params.toString();
  const result = await settingsApiFetch<GithubAppOAuthStartResponse>(
    `/api/integrations/github-app/oauth/start${query ? `?${query}` : ""}`,
  );
  if (!result.install_url) {
    throw new Error("GitHub App install URL was not returned by the backend.");
  }
  return result.install_url;
}

// --- backend seam (pending the application_id contract) ---------------------
// These hit /api/onboard/*, which is currently a 501 stub. The wizards surface
// a clear "pending backend" state when it errors, so the GitHub-side flow stays
// fully exercisable in the meantime.
export type OnboardDeployInput = {
  path: OnboardingPath;
  installationId: string;
  /** owner/name of the source repo (created or user-supplied). */
  repo?: string;
  actor?: string;
};

export type OnboardDeployResult = {
  /** owner/name actually deployed (oneshot creates it backend-side). */
  repo: string;
  releaseTag: string;
  applicationId?: string;
};

export async function onboardDeploy(
  input: OnboardDeployInput,
): Promise<OnboardDeployResult> {
  const res = await fetch("/api/onboard/deploy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => ({}))) as
    | OnboardDeployResult
    | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in json && json.error
        ? json.error
        : `onboarding deploy failed (${res.status})`;
    throw new Error(msg);
  }
  return json as OnboardDeployResult;
}

export type OnboardStatus = {
  state: "building" | "activating" | "live" | "failed";
  releaseTag: string;
  message?: string;
};

/** Poll release/activation progress for an in-flight onboarding deploy. */
export async function onboardStatus(
  releaseTag: string,
): Promise<OnboardStatus> {
  const res = await fetch(
    `/api/onboard/status?releaseTag=${encodeURIComponent(releaseTag)}`,
  );
  const json = (await res.json().catch(() => ({}))) as
    | OnboardStatus
    | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in json && json.error
        ? json.error
        : `onboarding status failed (${res.status})`;
    throw new Error(msg);
  }
  return json as OnboardStatus;
}

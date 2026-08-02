// =============================================================================
// createLaunchClient — the browser seam of the launch flow.
//
// Talks only to the host's same-origin BFF (`createLaunchRoutes` +
// `createGitHubAuthRoutes` mounts); the GitHub session cookie and the
// activation/service bearer stay server-side.
// =============================================================================

import type {
  DeploymentFeedResult,
  DeploymentHistoryResult,
  DeploymentPromoteResult,
  DeploymentSecretsResult,
  DeploymentSourcesResult,
  LaunchActivateResult,
  LaunchAppStatus,
  LaunchCreateRepoResult,
  LaunchDeployInput,
  LaunchDeployResult,
  LaunchPreflightInput,
  LaunchRedeployResult,
  LaunchSdkStatus,
  LaunchStatus,
  RequiredSecretsResult,
} from "./contracts";
import type {
  ListDeploymentRecordsResult,
  SourceSdkUpgradeResult,
  SourceSdkUpgradeStatusResult,
} from "../types";
import { normalizeRepo } from "./state";
import type { UserSource } from "../types";

export type { UserSource };

export const DEFAULT_LAUNCH_BASE_PATH = "/api/bff/launch";
export const DEFAULT_DEPLOYMENTS_BASE_PATH = "/api/bff/deployments";
export const DEFAULT_GITHUB_AUTH_BASE_PATH = "/api/bff/auth/github";

/**
 * Every launch BFF route returns the payload on success or `{ error }` on
 * failure; this carries the status and body so hosts can branch on them
 * (e.g. 404 from an exact-platform lookup means "no such platform").
 */
export class LaunchRequestError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "LaunchRequestError";
    this.status = status;
    this.body = body;
  }
}

export interface GitHubSessionInfo {
  signedIn: boolean;
  githubLogin: string | null;
  githubAvatarUrl?: string | null;
  /** Present when the one-shot App is already installed (skip-install). */
  installationId?: string | null;
}

export interface UserSourcesResult {
  sources: UserSource[];
  githubLogin: string | null;
}

export type GithubAppOAuthStartResponse = {
  ok: boolean;
  install_url?: string;
};

export type LaunchClientOptions = {
  /** Where `createLaunchRoutes` is mounted. Default `/api/bff/launch`. */
  basePath?: string;
  /** Where the deployments console routes are mounted. Default `/api/bff/deployments`. */
  deploymentsBasePath?: string;
  /** Where `createGitHubAuthRoutes` is mounted. Default `/api/bff/auth/github`. */
  authBasePath?: string;
  /**
   * Fetch that reaches the Aomi backend (for `githubAppInstallUrl`, which calls
   * `/api/integrations/github-app/oauth/start`). Hosts running the widget
   * proxy pass a same-origin fetcher here; defaults to a plain same-origin
   * `fetch` that JSON-parses and throws `{ error }` on non-2xx.
   */
  backendFetch?: <T>(path: string) => Promise<T>;
  /** Custom fetch (tests, SSR). Default `globalThis.fetch`. */
  fetch?: typeof fetch;
};

export type LaunchClient = ReturnType<typeof createLaunchClient>;

export function createLaunchClient(options: LaunchClientOptions = {}) {
  const basePath = (options.basePath ?? DEFAULT_LAUNCH_BASE_PATH).replace(
    /\/+$/,
    "",
  );
  const deploymentsPath = (
    options.deploymentsBasePath ?? DEFAULT_DEPLOYMENTS_BASE_PATH
  ).replace(/\/+$/, "");
  const authBasePath = (
    options.authBasePath ?? DEFAULT_GITHUB_AUTH_BASE_PATH
  ).replace(/\/+$/, "");
  const doFetch: typeof fetch =
    options.fetch ?? ((...args) => globalThis.fetch(...args));

  // Every launch BFF route returns the payload on success or `{ error }` on
  // failure. Centralize that contract so each call site stays a one-liner.
  async function launchFetch<T>(
    path: string,
    label: string,
    init?: RequestInit,
  ): Promise<T> {
    const res = await doFetch(path, init);
    const json = (await res.json().catch(() => ({}))) as T & {
      error?: string;
    };
    if (!res.ok) {
      throw new LaunchRequestError(
        json.error || `${label} failed (${res.status})`,
        res.status,
        json,
      );
    }
    return json;
  }

  /** `?appSourceId=…&platform=…` with the platform (if any) appended last. */
  function sourceQuery(appSourceId: number, platform?: string): string {
    const params = new URLSearchParams({ appSourceId: String(appSourceId) });
    if (platform) params.set("platform", platform);
    return `${params}`;
  }

  function postJson<T>(
    path: string,
    label: string,
    input: unknown,
  ): Promise<T> {
    return launchFetch<T>(path, label, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  }

  const backendFetch =
    options.backendFetch ??
    (<T,>(path: string) => launchFetch<T>(path, "backend request"));

  return {
    /** Where the "Sign in with GitHub" button points. */
    githubSigninUrl: `${authBasePath}/login`,

    preflight(input: LaunchPreflightInput): Promise<LaunchDeployResult> {
      return postJson(`${basePath}/preflight`, "launch preflight", input);
    },

    deploy(input: LaunchDeployInput): Promise<LaunchDeployResult> {
      return postJson(`${basePath}/deploy`, "launch deploy", input);
    },

    redeploy(input: { appSourceId: number }): Promise<LaunchRedeployResult> {
      return postJson(`${basePath}/redeploy`, "launch redeploy", input);
    },

    createRepo(input: {
      platform?: string;
      installationId: string;
      repoName?: string;
    }): Promise<LaunchCreateRepoResult> {
      return postJson(`${basePath}/create`, "launch repo creation", input);
    },

    status(deploymentId: string, platform?: string): Promise<LaunchStatus> {
      const params = new URLSearchParams({ deploymentId });
      if (platform) params.set("platform", platform);
      return launchFetch(`${basePath}/status?${params}`, "launch status");
    },

    sdkStatus(): Promise<LaunchSdkStatus> {
      return launchFetch(`${basePath}/sdk-status`, "launch SDK status");
    },

    activate(input: {
      platform?: string;
      appSourceId?: number;
      releaseTags: string[];
      apps?: string[];
      actor?: string;
    }): Promise<LaunchActivateResult> {
      return postJson(`${basePath}/activate`, "launch activation", input);
    },

    appStatus(input: {
      name: string;
      releaseTag?: string;
    }): Promise<LaunchAppStatus> {
      const params = new URLSearchParams({ name: input.name });
      if (input.releaseTag) params.set("releaseTag", input.releaseTag);
      return launchFetch(`${basePath}/app?${params}`, "launch app status");
    },

    async fetchGitHubSession(): Promise<GitHubSessionInfo> {
      try {
        const res = await doFetch(`${authBasePath}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return { signedIn: false, githubLogin: null };
        return (await res.json()) as GitHubSessionInfo;
      } catch {
        return { signedIn: false, githubLogin: null };
      }
    },

    async signOutGitHub(): Promise<void> {
      await doFetch(`${authBasePath}/signout`, { method: "POST" });
    },

    async fetchUserSources(): Promise<UserSourcesResult> {
      const res = await doFetch(`${basePath}/sources`, { cache: "no-store" });
      const json = (await res.json().catch(() => ({}))) as
        | UserSourcesResult
        | { error?: string };
      if (!res.ok) {
        const message =
          "error" in json && json.error
            ? json.error
            : `failed to load sources (${res.status})`;
        throw new Error(message);
      }
      return json as UserSourcesResult;
    },

    // ── Deployments console (the project dashboard's reads and writes) ──

    deploymentSources(
      platform?: string,
      appSourceId?: number,
    ): Promise<DeploymentSourcesResult> {
      const params = new URLSearchParams();
      if (appSourceId !== undefined)
        params.set("appSourceId", String(appSourceId));
      if (platform) params.set("platform", platform);
      const query = `${params}`;
      return launchFetch(
        `${deploymentsPath}/sources${query ? `?${query}` : ""}`,
        "deployment sources",
      );
    },

    deploymentSdkStatus(): Promise<LaunchSdkStatus> {
      return launchFetch(
        `${deploymentsPath}/sdk-status`,
        "deployment SDK status",
      );
    },

    upgradeSdk(input: {
      platform?: string;
      appSourceId: number;
    }): Promise<SourceSdkUpgradeResult> {
      return postJson(
        `${deploymentsPath}/sdk-upgrade`,
        "source SDK upgrade",
        input,
      );
    },

    sdkUpgradeStatus(input: {
      platform?: string;
      appSourceId: number;
    }): Promise<SourceSdkUpgradeStatusResult> {
      return launchFetch(
        `${deploymentsPath}/sdk-upgrade-status?${sourceQuery(input.appSourceId, input.platform)}`,
        "source SDK upgrade status",
      );
    },

    history(input: {
      platform?: string;
      appSourceId: number;
      limit?: number;
    }): Promise<DeploymentHistoryResult> {
      const params = new URLSearchParams({
        appSourceId: String(input.appSourceId),
      });
      if (input.limit) params.set("limit", String(input.limit));
      if (input.platform) params.set("platform", input.platform);
      return launchFetch(
        `${deploymentsPath}/history?${params}`,
        "deployment history",
      );
    },

    feed(input: {
      limit?: number;
      cursor?: DeploymentFeedResult["nextCursor"];
    }): Promise<DeploymentFeedResult> {
      const params = new URLSearchParams({
        limit: String(input.limit ?? 50),
      });
      if (input.cursor) {
        params.set("cursorCreatedAt", String(input.cursor.createdAt));
        params.set("cursorId", String(input.cursor.id));
      }
      return launchFetch(`${deploymentsPath}/feed?${params}`, "deployment feed");
    },

    secrets(input: {
      platform?: string;
      appSourceId: number;
    }): Promise<DeploymentSecretsResult> {
      return launchFetch(
        `${deploymentsPath}/secrets?${sourceQuery(input.appSourceId, input.platform)}`,
        "deployment secrets",
      );
    },

    requiredSecrets(input: {
      platform?: string;
      appSourceId: number;
    }): Promise<RequiredSecretsResult> {
      return launchFetch(
        `${deploymentsPath}/required-secrets?${sourceQuery(input.appSourceId, input.platform)}`,
        "required secrets",
      );
    },

    setSecrets(input: {
      platform?: string;
      app: string;
      appSourceId: number;
      secrets: Record<string, string>;
    }): Promise<{ ok: boolean; keys: string[] }> {
      return postJson(
        `${deploymentsPath}/secrets?${sourceQuery(input.appSourceId, input.platform)}`,
        "set environment variables",
        input,
      );
    },

    deleteSecret(input: {
      platform?: string;
      app: string;
      appSourceId: number;
      name: string;
    }): Promise<{ ok: boolean; removed: boolean }> {
      return launchFetch(
        `${deploymentsPath}/secrets?${sourceQuery(input.appSourceId, input.platform)}`,
        "delete environment variable",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        },
      );
    },

    records(input: {
      platform?: string;
      app: string;
      appSourceId?: number;
    }): Promise<ListDeploymentRecordsResult> {
      const params = new URLSearchParams({ app: input.app });
      if (input.appSourceId != null)
        params.set("appSourceId", String(input.appSourceId));
      if (input.platform) params.set("platform", input.platform);
      return launchFetch(
        `${deploymentsPath}/records?${params}`,
        "deployment records",
      );
    },

    promote(input: {
      platform?: string;
      deploymentId: string;
      appSourceId: number;
      apps?: string[];
      actor?: string;
    }): Promise<DeploymentPromoteResult> {
      return postJson(
        `${deploymentsPath}/promote`,
        "deployment promote",
        input,
      );
    },

    deactivate(input: {
      platform?: string;
      appSourceId: number;
      apps: string[];
    }): Promise<{ ok: boolean; apps: string[] }> {
      return postJson(
        `${deploymentsPath}/deactivate`,
        "deployment deactivate",
        input,
      );
    },

    /**
     * Ask the backend for the GitHub App install (or authorize) URL. Reaches
     * the backend through `backendFetch` — same-origin widget proxy by default.
     */
    async githubAppInstallUrl(args: {
      platform?: string;
      repo?: string;
      mode?: "install" | "authorize";
      app?: number;
      /** Validated Aomi Build page the OAuth callback should land back on. */
      returnTo?: string;
    }): Promise<string> {
      const params = new URLSearchParams();
      const platform = args.platform?.trim();
      if (platform) params.set("platform", platform);
      const repo = args.repo ? normalizeRepo(args.repo) : null;
      if (repo) params.set("repo", repo);
      if (args.mode === "authorize") params.set("mode", "authorize");
      if (args.app && args.app !== 1) params.set("app", String(args.app));
      const returnTo = args.returnTo?.trim();
      if (returnTo) params.set("return_to", returnTo);
      const query = params.toString();
      const result = await backendFetch<GithubAppOAuthStartResponse>(
        `/api/integrations/github-app/oauth/start${query ? `?${query}` : ""}`,
      );
      if (!result.install_url) {
        throw new Error(
          "GitHub App install URL was not returned by the backend.",
        );
      }
      return result.install_url;
    },
  };
}

// =============================================================================
// createLaunchClient — the browser seam of the launch flow.
//
// Talks only to the host's same-origin BFF (`createLaunchRoutes` +
// `createGitHubAuthRoutes` mounts); the GitHub session cookie and the
// activation/service bearer stay server-side.
// =============================================================================

import type {
  LaunchActivateResult,
  LaunchAppStatus,
  LaunchCreateRepoResult,
  LaunchDeployInput,
  LaunchDeployResult,
  LaunchPreflightInput,
  LaunchRedeployResult,
  LaunchStatus,
} from "./contracts";
import { normalizeRepo } from "./state";
import type { UserSource } from "../types";

export type { UserSource };

export const DEFAULT_LAUNCH_BASE_PATH = "/api/bff/launch";
export const DEFAULT_GITHUB_AUTH_BASE_PATH = "/api/bff/auth/github";

export interface GitHubSessionInfo {
  signedIn: boolean;
  githubLogin: string | null;
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
      throw new Error(json.error || `${label} failed (${res.status})`);
    }
    return json;
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
      installationId: string;
      repoName?: string;
    }): Promise<LaunchCreateRepoResult> {
      return postJson(`${basePath}/create`, "launch repo creation", input);
    },

    status(deploymentId: string): Promise<LaunchStatus> {
      return launchFetch(
        `${basePath}/status?deploymentId=${encodeURIComponent(deploymentId)}`,
        "launch status",
      );
    },

    activate(input: {
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

    /**
     * Ask the backend for the GitHub App install (or authorize) URL. Reaches
     * the backend through `backendFetch` — same-origin widget proxy by default.
     */
    async githubAppInstallUrl(args: {
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

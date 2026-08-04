// =============================================================================
// createLaunchClient — the browser seam of the launch flow.
//
// Talks only to the host's same-origin BFF (`createLaunchRoutes` +
// `createGitHubAuthRoutes` mounts); the GitHub session cookie and the
// activation/service bearer stay server-side.
//
// Two mounts, two shapes: the launch flow (`/api/bff/launch/*`) sits on the
// client itself, the project console (`/api/bff/deployments/*`) under
// `.deployments`. They are different handlers, not aliases, so the namespace
// says which one you are calling instead of a `deployment` name prefix.
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
  DeploymentProgressEvent,
  ListDeploymentRecordsResult,
  SourceSdkUpgradeResult,
  SourceSdkUpgradeStatusResult,
} from "../types";
import { normalizeRepo } from "./state";
import { watchDeploymentLoop, type WatchLoopOptions } from "./watch";
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
   * The platform every call targets. A partner integration binds its exact
   * platform here once instead of threading it through every call — omitting
   * it on a single call would otherwise fall back to the BFF's *default*
   * platform, which is a silent wrong-platform write, not an error.
   *
   * Individual calls may still pass `platform` to override. Omit both and the
   * BFF picks its configured default.
   */
  platform?: string;
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

function createBaseClient(options: LaunchClientOptions) {
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
  const boundPlatform = options.platform?.trim() || undefined;

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

  /** A call's own platform wins; otherwise the client's bound one. */
  function platformOf(explicit?: string): string | undefined {
    return explicit?.trim() || boundPlatform;
  }

  /** Same, for a request body that carries `platform` to the BFF. */
  function withPlatform<T extends { platform?: string }>(input: T): T {
    const platform = platformOf(input.platform);
    return platform ? { ...input, platform } : input;
  }

  function query(
    parts: Record<string, string | number | undefined>,
    platform?: string,
  ): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(parts)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const resolved = platformOf(platform);
    if (resolved) params.set("platform", resolved);
    const search = `${params}`;
    return search ? `?${search}` : "";
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

  function status(input: {
    deploymentId: string;
    platform?: string;
  }): Promise<LaunchStatus> {
    return launchFetch(
      `${basePath}/status${query({ deploymentId: input.deploymentId }, input.platform)}`,
      "launch status",
    );
  }

  /** The project console — `/api/bff/deployments/*`. */
  const deployments = {
    sources(
      input: { platform?: string; appSourceId?: number } = {},
    ): Promise<DeploymentSourcesResult> {
      return launchFetch(
        `${deploymentsPath}/sources${query({ appSourceId: input.appSourceId }, input.platform)}`,
        "deployment sources",
      );
    },

    status(input: {
      deploymentId: string;
      platform?: string;
    }): Promise<LaunchStatus> {
      return launchFetch(
        `${deploymentsPath}/status${query({ deploymentId: input.deploymentId }, input.platform)}`,
        "deployment status",
      );
    },

    upgradeSdk(input: {
      platform?: string;
      appSourceId: number;
    }): Promise<SourceSdkUpgradeResult> {
      return postJson(
        `${deploymentsPath}/sdk-upgrade`,
        "source SDK upgrade",
        withPlatform(input),
      );
    },

    sdkUpgradeStatus(input: {
      platform?: string;
      appSourceId: number;
    }): Promise<SourceSdkUpgradeStatusResult> {
      return launchFetch(
        `${deploymentsPath}/sdk-upgrade-status${query({ appSourceId: input.appSourceId }, input.platform)}`,
        "source SDK upgrade status",
      );
    },

    history(input: {
      platform?: string;
      appSourceId: number;
      limit?: number;
    }): Promise<DeploymentHistoryResult> {
      return launchFetch(
        `${deploymentsPath}/history${query({ appSourceId: input.appSourceId, limit: input.limit }, input.platform)}`,
        "deployment history",
      );
    },

    /** Cross-source activity feed — not platform-scoped. */
    feed(
      input: {
        limit?: number;
        cursor?: DeploymentFeedResult["nextCursor"];
      } = {},
    ): Promise<DeploymentFeedResult> {
      const params = new URLSearchParams({ limit: String(input.limit ?? 50) });
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
        `${deploymentsPath}/secrets${query({ appSourceId: input.appSourceId }, input.platform)}`,
        "deployment secrets",
      );
    },

    requiredSecrets(input: {
      platform?: string;
      appSourceId: number;
    }): Promise<RequiredSecretsResult> {
      return launchFetch(
        `${deploymentsPath}/required-secrets${query({ appSourceId: input.appSourceId }, input.platform)}`,
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
        `${deploymentsPath}/secrets${query({ appSourceId: input.appSourceId }, input.platform)}`,
        "set environment variables",
        withPlatform(input),
      );
    },

    deleteSecret(input: {
      platform?: string;
      app: string;
      appSourceId: number;
      name: string;
    }): Promise<{ ok: boolean; removed: boolean }> {
      return launchFetch(
        `${deploymentsPath}/secrets${query({ appSourceId: input.appSourceId }, input.platform)}`,
        "delete environment variable",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withPlatform(input)),
        },
      );
    },

    records(input: {
      platform?: string;
      app: string;
      appSourceId?: number;
    }): Promise<ListDeploymentRecordsResult> {
      return launchFetch(
        `${deploymentsPath}/records${query({ app: input.app, appSourceId: input.appSourceId }, input.platform)}`,
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
        withPlatform(input),
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
        withPlatform(input),
      );
    },
  };

  return {
    /** Where the "Sign in with GitHub" button points. */
    githubSigninUrl: `${authBasePath}/login`,

    /** The platform bound at construction, if any. */
    platform: boundPlatform,

    preflight(input: LaunchPreflightInput): Promise<LaunchDeployResult> {
      return postJson(
        `${basePath}/preflight`,
        "launch preflight",
        withPlatform(input),
      );
    },

    deploy(input: LaunchDeployInput): Promise<LaunchDeployResult> {
      return postJson(`${basePath}/deploy`, "launch deploy", withPlatform(input));
    },

    redeploy(input: {
      appSourceId: number;
      platform?: string;
    }): Promise<LaunchRedeployResult> {
      return postJson(
        `${basePath}/redeploy`,
        "launch redeploy",
        withPlatform(input),
      );
    },

    createRepo(input: {
      platform?: string;
      installationId: string;
      repoName?: string;
    }): Promise<LaunchCreateRepoResult> {
      return postJson(
        `${basePath}/create`,
        "launch repo creation",
        withPlatform(input),
      );
    },

    status,

    /**
     * Poll a deployment to completion, reporting every tick.
     *
     * Never throws: a failure arrives as an `error` event, so a render loop
     * has one code path. Backs off 3s → 30s, treats a 4xx as fatal, and
     * cancels via `options.signal`.
     */
    watch(
      input: { deploymentId: string; platform?: string },
      onEvent: (event: DeploymentProgressEvent) => void,
      watchOptions: WatchLoopOptions = {},
    ): Promise<void> {
      return watchDeploymentLoop(() => status(input), onEvent, {
        isFatal: (err) =>
          err instanceof LaunchRequestError &&
          err.status >= 400 &&
          err.status < 500,
        ...watchOptions,
      });
    },

    /**
     * SDK version status. The launch and deployments mounts serve this from
     * the same handler, so there is one method.
     */
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
      return postJson(
        `${basePath}/activate`,
        "launch activation",
        withPlatform(input),
      );
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

    /** The signed-in user's sources on the launch mount. */
    async sources(): Promise<UserSourcesResult> {
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

    deployments,

    /**
     * Ask the backend for the GitHub entry URL. The backend picks the
     * ceremony — OAuth consent when an installation already covers the repo,
     * the install flow otherwise — so callers never choose a mode. Reaches
     * the backend through `backendFetch` — same-origin widget proxy by default.
     */
    async githubAppInstallUrl(args: {
      platform?: string;
      repo?: string;
      app?: number;
      /** Validated Aomi Build page the OAuth callback should land back on. */
      returnTo?: string;
    }): Promise<string> {
      const params = new URLSearchParams();
      const platform = platformOf(args.platform);
      if (platform) params.set("platform", platform);
      const repo = args.repo ? normalizeRepo(args.repo) : null;
      if (repo) params.set("repo", repo);
      if (args.app && args.app !== 1) params.set("app", String(args.app));
      const returnTo = args.returnTo?.trim();
      if (returnTo) params.set("return_to", returnTo);
      const search = params.toString();
      const result = await backendFetch<GithubAppOAuthStartResponse>(
        `/api/integrations/github-app/oauth/start${search ? `?${search}` : ""}`,
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

type LaunchClientBase = ReturnType<typeof createBaseClient>;

export interface LaunchClient extends LaunchClientBase {
  /**
   * The same client scoped to a different platform. Cheap — switching
   * platforms is an explicit, greppable act rather than a parameter you might
   * forget on one call out of fifteen.
   */
  forPlatform(platform: string): LaunchClient;
}

export function createLaunchClient(
  options: LaunchClientOptions = {},
): LaunchClient {
  return {
    ...createBaseClient(options),
    forPlatform: (platform: string) =>
      createLaunchClient({ ...options, platform }),
  };
}

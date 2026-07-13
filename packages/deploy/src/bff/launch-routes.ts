// =============================================================================
// createLaunchRoutes — the one-shot deploy BFF as drop-in route handlers.
//
// Every handler is a plain `(Request) => Promise<Response>`, so a Next.js host
// mounts them directly as App Router route exports:
//
//   // app/api/bff/launch/deploy/route.ts
//   import { launchRoutes } from "@/server/launch";
//   export const POST = launchRoutes.deploy;
//
// The host injects the privileged pieces; nothing here reads a framework:
//   - `client`   — a DeploymentClient carrying the activation/service bearer
//   - `session`  — the signed-in GitHub user for a request (see
//                  `createGitHubSessionCodec` for the batteries-included one)
//   - `guards`   — rate-limit/CSRF (defaults provided)
//   - `githubToken` — optional; CI status enrichment + rerun
// =============================================================================

import type { DeploymentClient } from "../client";
import type { UserSource } from "../types";
import { assertServerOnly } from "../client";
import { resolveLaunchConfig, type LaunchConfig } from "./config";
import { launchErrorResponse } from "./errors";
import { appNamesFromDeployment, releaseTagsFromDeployment } from "./mappers";
import { createDefaultGuards, jsonResponse, type LaunchGuards } from "./guards";
import { missingSecretsForActivation } from "./release-manifest";
import { randomHex } from "./cookies";
import type { GitHubSession } from "./github-session";
import {
  isValidAppSourceId,
  isValidDeploymentId,
  isValidInstallationId,
  isValidReleaseTags,
  isValidRepo,
} from "./validate";

export type LaunchRouteHandler = (req: Request) => Promise<Response>;

export type LaunchRoutes = {
  /** POST — dry-run deploy; resolves a repo into a source row when needed. */
  preflight: LaunchRouteHandler;
  /** POST — the apply step against a resolved source row. */
  deploy: LaunchRouteHandler;
  /** POST — one-shot: scaffold a repo from the template for the signed-in user. */
  create: LaunchRouteHandler;
  /** POST — promote built release tags to live. */
  activate: LaunchRouteHandler;
  /** GET `?deploymentId=` — deployment status, CI-enriched when a token is set. */
  status: LaunchRouteHandler;
  /** GET `?name=&releaseTag=` — one app's live/pending state. */
  app: LaunchRouteHandler;
  /** POST — re-run the recorded CI run for a source's latest deployment. */
  redeploy: LaunchRouteHandler;
  /** GET — the signed-in user's source repos + their apps. */
  sources: LaunchRouteHandler;
};

export type LaunchRoutesOptions = {
  /** Deployment client per request — holds the activation/service bearer. */
  client: () => DeploymentClient | Promise<DeploymentClient>;
  /** The signed-in GitHub session for a request, or null. */
  session: (
    req: Request,
  ) => GitHubSession | null | Promise<GitHubSession | null>;
  /** Platform/template config. Defaults from `APP_DEPLOY_*` env. */
  config?: Partial<LaunchConfig>;
  /** Read/write request guards. Defaults: per-IP rate limit + same-origin. */
  guards?: Partial<LaunchGuards>;
  /**
   * GitHub API token used to enrich pending CI status and re-run CI.
   * Defaults to `process.env.GITHUB_TOKEN`.
   */
  githubToken?: string;
  /** Prefix for generated one-shot repo names. Default `my-playground`. */
  createdRepoPrefix?: string;
};

function sourceRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().toLowerCase();
  return /^[0-9a-f]{7,40}$/.test(clean) ? clean : null;
}

function sourceRefFromSource(source: {
  sourceRef?: string | null;
  commitHash?: string | null;
}): string | null {
  return sourceRef(source.sourceRef) ?? sourceRef(source.commitHash);
}

function branchFromActionsQuery(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const query = parsed.searchParams.get("query") ?? "";
    const match = query.match(/(?:^|\s)branch:([^\s]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function ciRunIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/actions\/runs\/(\d+)(?:\/|$)/);
  return match?.[1] ?? null;
}

type OwnedSource = Awaited<
  ReturnType<DeploymentClient["listUserSources"]>
>[number];
type ActivationPair = { app: string; releaseTag: string };

function releaseTagForApp(app: {
  releaseTag?: string | null;
  appReleaseTag?: string | null;
}): string | null {
  return app.releaseTag?.trim() || app.appReleaseTag?.trim() || null;
}

function deploymentContainsPair(
  deployment: NonNullable<UserSource["latestDeployment"]>,
  pair: ActivationPair,
): boolean {
  return deployment.apps.some(
    (app) => app.name === pair.app && releaseTagForApp(app) === pair.releaseTag,
  );
}

function sourceContainsCurrentPair(
  source: OwnedSource,
  pair: ActivationPair,
): boolean {
  return (
    (source.latestDeployment
      ? deploymentContainsPair(source.latestDeployment, pair)
      : false) ||
    source.apps.some(
      (app) =>
        app.name === pair.app && releaseTagForApp(app) === pair.releaseTag,
    )
  );
}

async function activationPairsBelongToSource(
  client: DeploymentClient,
  githubUserId: string,
  platform: string,
  source: OwnedSource,
  pairs: ActivationPair[],
): Promise<boolean> {
  const deployments = await client.listUserSourceDeployments({
    githubUserId,
    platform,
    appSourceId: source.id,
    limit: 100,
  });
  return pairs.every(
    (pair) =>
      deployments.some((deployment) =>
        deploymentContainsPair(deployment, pair),
      ) || sourceContainsCurrentPair(source, pair),
  );
}

export function createLaunchRoutes(options: LaunchRoutesOptions): LaunchRoutes {
  assertServerOnly();

  const defaults = createDefaultGuards();
  const checkRead = options.guards?.read ?? defaults.read;
  const checkWrite = options.guards?.write ?? defaults.write;
  const getClient = options.client;
  const getSession = options.session;
  const createdRepoPrefix = options.createdRepoPrefix ?? "my-playground";
  const config = () => resolveLaunchConfig(options.config);
  const githubToken = () =>
    options.githubToken ?? process.env.GITHUB_TOKEN?.trim() ?? "";

  async function defaultRepoName(): Promise<string> {
    const normalized = createdRepoPrefix
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${normalized}-${await randomHex(4)}`;
  }

  type LaunchStatusPayload = Awaited<ReturnType<DeploymentClient["status"]>>;

  // When the platform CI is still "pending", ask GitHub Actions directly
  // whether the run for the recorded commit has in fact completed — the
  // backend's poll can lag, and a completed-but-stale run must fail loudly.
  async function enrichPendingCiStatus(
    status: LaunchStatusPayload,
  ): Promise<LaunchStatusPayload> {
    const platform = status.deployment?.platform;
    const ciStatus = status.ci?.status ?? platform?.ciStatus;
    const ciUrl = status.ci?.url ?? platform?.ciUrl;
    const repo = platform?.repository;
    const branch = branchFromActionsQuery(ciUrl);
    const targetCommit = platform?.commitHash ?? status.ci?.commitHash;
    if (ciStatus !== "pending" || !repo || !branch || !isValidRepo(repo)) {
      return status;
    }

    const token = githubToken();
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "aomi-launch-bff",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const params = new URLSearchParams({
      branch,
      event: "push",
      per_page: "10",
    });
    const res = await fetch(
      `https://api.github.com/repos/${repo}/actions/runs?${params}`,
      { headers },
    );
    if (!res.ok) return status;
    const body = (await res.json().catch(() => ({}))) as {
      workflow_runs?: Array<Record<string, unknown>>;
    };
    const runs = (body.workflow_runs ?? []).filter(
      (candidate) => candidate.head_branch === branch,
    );
    const run =
      (targetCommit
        ? runs.find((candidate) => candidate.head_sha === targetCommit)
        : undefined) ?? runs[0];
    if (!run || run.status !== "completed") return status;

    const conclusion = String(run.conclusion ?? "unknown");
    const runSha = String(run.head_sha ?? "");
    const runUrl = String(run.html_url ?? ciUrl ?? "");
    const title = String(run.display_title ?? run.name ?? "GitHub Actions run");
    if (targetCommit && runSha && runSha !== targetCommit) {
      return {
        ...status,
        state: "failed",
        ci: {
          ...status.ci,
          status: "stale",
          url: runUrl,
          commitHash: runSha,
        },
        message: `${title} completed with conclusion "${conclusion}" on stale commit ${runSha.slice(
          0,
          12,
        )}; deployment commit ${targetCommit.slice(
          0,
          12,
        )} has no matching Aomi CI run. ${runUrl}`,
      };
    }

    if (conclusion === "success") {
      return {
        ...status,
        ci: {
          ...status.ci,
          status: "passed",
          url: runUrl,
          commitHash: runSha || status.ci?.commitHash || undefined,
        },
      };
    }

    return {
      ...status,
      state: "failed",
      ci: {
        ...status.ci,
        status: conclusion === "skipped" ? "skipped" : "failed",
        url: runUrl,
        commitHash: String(run.head_sha ?? "") || status.ci?.commitHash,
      },
      message: `${title} completed with conclusion "${conclusion}" on ${branch}. ${runUrl}`,
    };
  }

  function deployRoute(preflight: boolean): LaunchRouteHandler {
    return async function POST(req: Request): Promise<Response> {
      const blocked = checkWrite(req);
      if (blocked) return blocked;

      const body = (await req.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (
        body.appSourceId !== undefined &&
        !isValidAppSourceId(body.appSourceId)
      ) {
        return jsonResponse({ error: "invalid `appSourceId`" }, 400);
      }
      if (body.repo !== undefined && !isValidRepo(body.repo)) {
        return jsonResponse({ error: "invalid `repo`" }, 400);
      }
      const repo = isValidRepo(body.repo) ? body.repo : undefined;
      let syncGithubUserId: string | null | undefined;
      async function githubUserIdForSync(): Promise<string | null> {
        if (syncGithubUserId !== undefined) return syncGithubUserId;
        syncGithubUserId = (await getSession(req))?.githubUserId ?? null;
        return syncGithubUserId;
      }

      try {
        const cfg = config();
        const client = await getClient();

        // Deploy uses a stable source row plus an immutable source commit. When
        // the host only has a repo, sync-installed resolves both from GitHub.
        let appSourceId: number;
        let deploySourceRef = sourceRef(body.sourceRef);
        if (isValidAppSourceId(body.appSourceId)) {
          appSourceId = body.appSourceId;
        } else if (preflight && repo) {
          const githubUserId = await githubUserIdForSync();
          if (!githubUserId) {
            return jsonResponse({ error: "not signed in with GitHub" }, 401);
          }
          const synced = await client.syncSource({
            platform: cfg.platform,
            repo,
            githubUserId,
          });
          if (!isValidAppSourceId(synced.id)) {
            throw new Error("backend did not return a valid app source id");
          }
          appSourceId = synced.id;
          deploySourceRef = sourceRefFromSource(synced);
        } else {
          return jsonResponse(
            {
              error: preflight
                ? "missing `appSourceId` or `repo`"
                : "missing `appSourceId`",
            },
            400,
          );
        }

        if (!deploySourceRef && repo) {
          const githubUserId = await githubUserIdForSync();
          if (!githubUserId) {
            return jsonResponse({ error: "not signed in with GitHub" }, 401);
          }
          const synced = await client.syncSource({
            platform: cfg.platform,
            repo,
            githubUserId,
          });
          if (synced.id !== appSourceId) {
            return jsonResponse(
              { error: "repo does not match `appSourceId`" },
              409,
            );
          }
          deploySourceRef = sourceRefFromSource(synced);
        }
        if (!deploySourceRef) {
          return jsonResponse(
            {
              error:
                "missing source commit for deploy; sync the source repo and retry",
            },
            400,
          );
        }

        const deployInput = {
          platform: cfg.platform,
          appSourceId,
          sourceRef: deploySourceRef,
          aomiTomlPaths: [],
          actor: typeof body.actor === "string" ? body.actor : undefined,
        };
        const { deployment } = preflight
          ? await client.preflight(deployInput)
          : await client.deploy(deployInput);
        return jsonResponse(
          {
            ok: true,
            repo: deployment.source.repositoryLink ?? repo,
            installationId: deployment.source.installationId
              ? String(deployment.source.installationId)
              : undefined,
            appSourceId,
            sourceRef: deploySourceRef,
            deployment,
            releaseTags: releaseTagsFromDeployment(deployment),
            apps: appNamesFromDeployment(deployment),
          },
          preflight ? 200 : 202,
        );
      } catch (err) {
        return launchErrorResponse(err);
      }
    };
  }

  const create: LaunchRouteHandler = async (req) => {
    const blocked = checkWrite(req);
    if (blocked) return blocked;

    // The created source is owned by the signed-in GitHub user — taken from
    // the server-side session, never trusted from the client body.
    const session = await getSession(req);
    if (!session) {
      return jsonResponse({ error: "not signed in with GitHub" }, 401);
    }

    try {
      const body = (await req.json().catch(() => ({}))) as {
        installationId?: unknown;
        repoName?: string;
      };
      if (!isValidInstallationId(body.installationId)) {
        return jsonResponse(
          { error: "missing or invalid `installationId`" },
          400,
        );
      }

      const cfg = config();
      const client = await getClient();
      const source = await client.scaffold({
        platform: cfg.platform,
        installationId: Number(body.installationId),
        templateRepo: cfg.templateRepo,
        repoName: body.repoName?.trim() || (await defaultRepoName()),
        githubUserId: session.githubUserId,
        private: cfg.createdRepoPrivate,
      });
      if (!source.repositoryLink || !source.installationId) {
        return jsonResponse(
          { error: "backend did not return a created source repo" },
          502,
        );
      }
      return jsonResponse(
        {
          ok: true,
          repo: source.repositoryLink,
          installationId: String(source.installationId),
          appSourceId: source.id,
          sourceRef: source.sourceRef ?? source.commitHash ?? undefined,
          source,
        },
        200,
      );
    } catch (err) {
      return launchErrorResponse(err);
    }
  };

  const status: LaunchRouteHandler = async (req) => {
    const blocked = checkRead(req);
    if (blocked) return blocked;

    const deploymentId = new URL(req.url).searchParams.get("deploymentId");
    if (!isValidDeploymentId(deploymentId)) {
      return jsonResponse({ error: "missing or invalid `deploymentId`" }, 400);
    }

    try {
      const cfg = config();
      const client = await getClient();
      const result = await client.status({
        platform: cfg.platform,
        deploymentId,
      });
      const enriched = await enrichPendingCiStatus(result);
      return jsonResponse(
        {
          ...enriched,
          releaseTags: releaseTagsFromDeployment(enriched.deployment),
        },
        200,
      );
    } catch (err) {
      return launchErrorResponse(err);
    }
  };

  const activate: LaunchRouteHandler = async (req) => {
    const blocked = checkWrite(req);
    if (blocked) return blocked;

    const session = await getSession(req);
    if (!session) {
      return jsonResponse({ error: "not signed in with GitHub" }, 401);
    }

    try {
      const body = (await req.json().catch(() => ({}))) as {
        releaseTags?: unknown;
        appSourceId?: unknown;
        apps?: unknown;
        actor?: string;
      };
      if (!isValidReleaseTags(body.releaseTags)) {
        return jsonResponse({ error: "missing or invalid `releaseTags`" }, 400);
      }
      if (!isValidAppSourceId(body.appSourceId)) {
        return jsonResponse({ error: "missing or invalid `appSourceId`" }, 400);
      }
      if (
        !Array.isArray(body.apps) ||
        !body.apps.every((app) => typeof app === "string")
      ) {
        return jsonResponse({ error: "missing or invalid `apps`" }, 400);
      }

      const releaseTags = body.releaseTags;
      const apps = body.apps.map((app) => app.trim()).filter(Boolean);
      if (apps.length === 0 || apps.length !== releaseTags.length) {
        return jsonResponse(
          { error: "`apps` must match `releaseTags` length" },
          400,
        );
      }

      const cfg = config();
      const client = await getClient();
      const sources = await client.listUserSources({
        githubUserId: session.githubUserId,
        platform: cfg.platform,
      });
      const source =
        sources.find((candidate) => candidate.id === body.appSourceId) ?? null;
      if (!source) {
        return jsonResponse(
          { error: "app source not found for this user" },
          404,
        );
      }
      const pairs = apps.map((app, index) => ({
        app,
        releaseTag: releaseTags[index],
      }));
      const authorized = await activationPairsBelongToSource(
        client,
        session.githubUserId,
        cfg.platform,
        source,
        pairs,
      );
      if (!authorized) {
        return jsonResponse({ error: "release not found for this user" }, 404);
      }
      const missingByApp = await missingSecretsForActivation({
        client,
        githubUserId: session.githubUserId,
        platform: cfg.platform,
        source,
        pairs,
      });
      if (Object.keys(missingByApp).length > 0) {
        return jsonResponse(
          { error: "missing required secrets", missing: missingByApp },
          409,
        );
      }
      const result = await client.activate({
        platform: cfg.platform,
        target: { kind: "release_tags", value: releaseTags },
        apps,
        targetTags: cfg.targetTags,
        actor: typeof body.actor === "string" ? body.actor : undefined,
      });
      return jsonResponse(result, 200);
    } catch (err) {
      return launchErrorResponse(err);
    }
  };

  const app: LaunchRouteHandler = async (req) => {
    const blocked = checkRead(req);
    if (blocked) return blocked;

    const session = await getSession(req);
    if (!session) {
      return jsonResponse({ error: "not signed in with GitHub" }, 401);
    }

    const params = new URL(req.url).searchParams;
    const name = params.get("name")?.trim();
    const releaseTag = params.get("releaseTag")?.trim();
    if (!name) {
      return jsonResponse({ error: "missing `name`" }, 400);
    }

    try {
      const cfg = config();
      const client = await getClient();
      const sources = await client.listUserSources({
        githubUserId: session.githubUserId,
        platform: cfg.platform,
      });
      const owned = sources.some((source) =>
        source.apps.some(
          (app) =>
            app.name === name &&
            (!releaseTag || app.appReleaseTag === releaseTag),
        ),
      );
      if (!owned) {
        return jsonResponse({ error: "app not found for this user" }, 404);
      }
      const result = await client.getApp({
        platform: cfg.platform,
        app: name,
        releaseTag: releaseTag || undefined,
      });
      const live = result.isActive && result.loaded;
      return jsonResponse(
        {
          ok: true,
          state: live ? "live" : "pending",
          app: {
            id: result.id,
            name: result.name,
            is_active: result.isActive,
            loaded: result.loaded,
            app_release_tag: result.appReleaseTag,
          },
        },
        200,
      );
    } catch (err) {
      return launchErrorResponse(err);
    }
  };

  const redeploy: LaunchRouteHandler = async (req) => {
    const blocked = checkWrite(req);
    if (blocked) return blocked;

    const session = await getSession(req);
    if (!session) {
      return jsonResponse({ error: "not signed in with GitHub" }, 401);
    }

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!isValidAppSourceId(body.appSourceId)) {
      return jsonResponse({ error: "missing or invalid `appSourceId`" }, 400);
    }

    try {
      const cfg = config();
      const client = await getClient();
      const latest = await client.getUserSourceLatestDeployment({
        githubUserId: session.githubUserId,
        platform: cfg.platform,
        appSourceId: body.appSourceId,
      });
      const platformRepo = latest?.platformRepo;
      const ciRunId =
        latest?.ciRunId === null || latest?.ciRunId === undefined
          ? ciRunIdFromUrl(latest?.ciUrl)
          : String(latest.ciRunId);

      if (!platformRepo || !isValidRepo(platformRepo) || !ciRunId) {
        return jsonResponse(
          {
            error:
              "No backend-owned CI run is available for this source yet; refusing to reuse Deploy because GitHub can skip tree-identical pushes.",
          },
          409,
        );
      }

      const token = githubToken();
      if (!token) {
        return jsonResponse(
          { error: "GitHub rerun token is not configured" },
          503,
        );
      }

      const res = await fetch(
        `https://api.github.com/repos/${platformRepo}/actions/runs/${ciRunId}/rerun`,
        {
          method: "POST",
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token}`,
            "User-Agent": "aomi-launch-bff",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return jsonResponse(
          {
            error: `GitHub CI rerun failed (${res.status})${text ? `: ${text}` : ""}`,
          },
          502,
        );
      }

      return jsonResponse(
        {
          ok: true,
          appSourceId: body.appSourceId,
          platformRepo,
          ciRunId,
          ciUrl:
            latest?.ciUrl ??
            `https://github.com/${platformRepo}/actions/runs/${ciRunId}`,
        },
        200,
      );
    } catch (err) {
      return launchErrorResponse(err);
    }
  };

  // The signed-in user's source repos + their apps, merged across
  // installations. Scoped to the github_user_id in the session — a client can
  // never request someone else's sources.
  const sources: LaunchRouteHandler = async (req) => {
    const blocked = checkRead(req);
    if (blocked) return blocked;

    const session = await getSession(req);
    if (!session) {
      return jsonResponse({ error: "not signed in with GitHub" }, 401);
    }

    try {
      const cfg = config();
      const client = await getClient();
      const result = await client.listUserSources({
        githubUserId: session.githubUserId,
        platform: cfg.platform,
      });
      return jsonResponse(
        { sources: result, githubLogin: session.githubLogin },
        200,
      );
    } catch (err) {
      return launchErrorResponse(err);
    }
  };

  return {
    preflight: deployRoute(true),
    deploy: deployRoute(false),
    create,
    activate,
    status,
    app,
    redeploy,
    sources,
  };
}

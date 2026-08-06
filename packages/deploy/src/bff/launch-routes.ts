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
//   - `client`   — a BackendClient carrying the activation/service bearer
//   - `session`  — the signed-in GitHub user for a request (see
//                  `createGitHubSessionCodec` for the batteries-included one)
//   - `guards`   — rate-limit/CSRF (defaults provided)
//
// No GitHub credential is configured here: CI status and rerun go through the
// Aomi backend, whose GitHub App installation token makes every GitHub call.
//
// Also owns launch config resolution (env → LaunchConfig) and deployment
// payload → client summary mappers.
// =============================================================================

import type { BackendClient } from "../backend";
import type { DeployPayload, UserProject } from "../types";
import { assertServerOnly } from "../backend";
import { DEFAULT_TEMPLATE_REPO } from "../launch/contracts";
import { launchErrorResponse } from "./errors";
import {
  createDefaultGuards,
  isValidDeploymentId,
  isValidInstallationId,
  isValidProjectId,
  isValidReleaseTags,
  isValidRepo,
  jsonResponse,
  randomHex,
  type LaunchGuards,
} from "./http";
import type { GitHubSession } from "./auth";
import { missingSecretsForActivation } from "./release-manifest";

export const DEFAULT_DEPLOY_PLATFORM = "community";
export { DEFAULT_TEMPLATE_REPO };

export type LaunchConfig = {
  /** Platform every launch route operates on (first of `platforms`). */
  platform: string;
  /** All deployable platforms, first is the default. */
  platforms: string[];
  /** Platforms whose apps show in the catalog (optional). */
  catalogPlatforms: string[];
  /** Template `owner/repo` the one-shot flow forks. */
  templateRepo: string;
  /** Create scaffolded repos as private. */
  createdRepoPrivate: boolean;
  /** Target tags applied on activation (e.g. ["staging"]). */
  targetTags: string[];
};

function envString(name: string, fallback: string): string {
  return process.env[name]?.trim() || fallback;
}

function envBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return value === "1" || value === "true" || value === "yes";
}

function envList(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function envJsonOrCommaList(name: string): string[] {
  const raw = process.env[name]?.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return dedupe(
        parsed
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter(Boolean),
      );
    }
  } catch {
    // Fall through to comma-separated parsing for Vercel/plain .env ergonomics.
  }

  return dedupe(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function deployPlatformsFromEnv(): string[] {
  for (const name of [
    "APP_DEPLOY_PLATFORMS",
    "NEXT_PUBLIC_APP_DEPLOY_PLATFORMS",
    "APP_DEPLOY_PLATFORM",
    "NEXT_PUBLIC_APP_DEPLOY_PLATFORM",
  ]) {
    const platforms = envJsonOrCommaList(name);
    if (platforms.length > 0) return platforms;
  }

  return [DEFAULT_DEPLOY_PLATFORM];
}

function catalogPlatformsFromEnv(): string[] {
  for (const name of [
    "APP_CATALOG_PLATFORMS",
    "NEXT_PUBLIC_APP_CATALOG_PLATFORMS",
  ]) {
    const platforms = envJsonOrCommaList(name);
    if (platforms.length > 0) return platforms;
  }

  return [];
}

/** Resolve the launch config: explicit overrides win, then env, then defaults. */
export function resolveLaunchConfig(
  overrides?: Partial<LaunchConfig>,
): LaunchConfig {
  const platforms =
    overrides?.platforms ??
    (overrides?.platform ? [overrides.platform] : deployPlatformsFromEnv());

  return {
    platform: overrides?.platform ?? platforms[0],
    platforms,
    catalogPlatforms: overrides?.catalogPlatforms ?? catalogPlatformsFromEnv(),
    templateRepo:
      overrides?.templateRepo ??
      (process.env.APP_DEPLOY_TEMPLATE_REPO?.trim() ||
        envString("NEXT_PUBLIC_APP_DEPLOY_TEMPLATE_REPO", DEFAULT_TEMPLATE_REPO)),
    createdRepoPrivate:
      overrides?.createdRepoPrivate ??
      envBoolean("APP_DEPLOY_CREATED_REPO_PRIVATE", false),
    targetTags: overrides?.targetTags ?? envList("APP_DEPLOY_TARGET_TAGS"),
  };
}

// Tolerant of both snake_case (raw backend) and camelCase (BackendClient)
// app records, since status payloads have carried both shapes.
type AppsLike = { platform?: { apps?: Array<Record<string, unknown>> } };

export function releaseTagsFromDeployment(
  deployment?: DeployPayload | AppsLike,
): string[] {
  const apps = (deployment as AppsLike | undefined)?.platform?.apps ?? [];
  return apps
    .map((app) => (app.release_tag ?? app.releaseTag) as string | undefined)
    .map((tag) => tag?.trim())
    .filter((tag): tag is string => Boolean(tag));
}

export function appNamesFromDeployment(
  deployment?: DeployPayload | AppsLike,
): string[] {
  const apps = (deployment as AppsLike | undefined)?.platform?.apps ?? [];
  return apps
    .map((app) => (app.name as string | undefined)?.trim())
    .filter((name): name is string => Boolean(name));
}

export type LaunchRouteHandler = (req: Request) => Promise<Response>;

export type LaunchRoutes = {
  /** POST — dry-run deploy; creates a project from a repo when needed. */
  preflight: LaunchRouteHandler;
  /** POST — the apply step against a resolved project. */
  deploy: LaunchRouteHandler;
  /** POST — one-shot: scaffold a repo from the template for the signed-in user. */
  create: LaunchRouteHandler;
  /** POST — promote built release tags to live. */
  activate: LaunchRouteHandler;
  /** GET `?deploymentId=` — deployment status; CI resolved by the backend. */
  status: LaunchRouteHandler;
  /** GET `?name=&releaseTag=` — one app's live/pending state. */
  app: LaunchRouteHandler;
  /** POST — re-run the recorded CI run for a project's latest deployment. */
  redeploy: LaunchRouteHandler;
  /** GET — the signed-in user's projects + their apps. */
  projects: LaunchRouteHandler;
};

export type LaunchRoutesOptions = {
  /** Deployment client per request — holds the activation/service bearer. */
  client: () => BackendClient | Promise<BackendClient>;
  /** The signed-in GitHub session for a request, or null. */
  session: (
    req: Request,
  ) => GitHubSession | null | Promise<GitHubSession | null>;
  /** Platform/template config. Defaults from `APP_DEPLOY_*` env. */
  config?: Partial<LaunchConfig>;
  /** Read/write request guards. Defaults: per-IP rate limit + same-origin. */
  guards?: Partial<LaunchGuards>;
  /** Prefix for generated one-shot repo names. Default `my-playground`. */
  createdRepoPrefix?: string;
};

function sourceRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().toLowerCase();
  return /^[0-9a-f]{7,40}$/.test(clean) ? clean : null;
}

type OwnedProject = Awaited<
  ReturnType<BackendClient["listUserProjects"]>
>[number];
type ActivationPair = { app: string; releaseTag: string };

function releaseTagForApp(app: {
  releaseTag?: string | null;
  appReleaseTag?: string | null;
}): string | null {
  return app.releaseTag?.trim() || app.appReleaseTag?.trim() || null;
}

function deploymentContainsPair(
  deployment: NonNullable<UserProject["latestDeployment"]>,
  pair: ActivationPair,
): boolean {
  return deployment.apps.some(
    (app) => app.name === pair.app && releaseTagForApp(app) === pair.releaseTag,
  );
}

function projectContainsCurrentPair(
  project: OwnedProject,
  pair: ActivationPair,
): boolean {
  return (
    (project.latestDeployment
      ? deploymentContainsPair(project.latestDeployment, pair)
      : false) ||
    project.apps.some(
      (app) =>
        app.name === pair.app && releaseTagForApp(app) === pair.releaseTag,
    )
  );
}

async function activationPairsBelongToProject(
  client: BackendClient,
  githubUserId: string,
  project: OwnedProject,
  pairs: ActivationPair[],
): Promise<boolean> {
  const deployments = await client.listUserProjectDeployments({
    githubUserId,
    projectId: project.id,
    limit: 100,
  });
  return pairs.every(
    (pair) =>
      deployments.some((deployment) =>
        deploymentContainsPair(deployment, pair),
      ) || projectContainsCurrentPair(project, pair),
  );
}

/**
 * Prove the signed-in user owns `projectId` and return the project row. The
 * lookup is account-wide — partner-bound projects included — so ownership
 * never depends on a platform parameter.
 */
async function ownedProject(
  client: BackendClient,
  githubUserId: string,
  projectId: number,
): Promise<OwnedProject | null> {
  const projects = await client.listUserProjects({ githubUserId });
  return projects.find((candidate) => candidate.id === projectId) ?? null;
}

/**
 * The platform every downstream platform-addressed call must use once a
 * project is known: the project's bound platform. The host default applies
 * only before a project exists (creation) or on legacy rows with no binding.
 */
function platformOf(project: OwnedProject, fallback: string): string {
  return project.platformName?.trim() || fallback;
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

  async function defaultRepoName(): Promise<string> {
    const normalized = createdRepoPrefix
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${normalized}-${await randomHex(4)}`;
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
        body.projectId !== undefined &&
        !isValidProjectId(body.projectId)
      ) {
        return jsonResponse({ error: "invalid `projectId`" }, 400);
      }
      if (body.repo !== undefined && !isValidRepo(body.repo)) {
        return jsonResponse({ error: "invalid `repo`" }, 400);
      }
      const repo = isValidRepo(body.repo) ? body.repo : undefined;

      try {
        const session = await getSession(req);
        if (!session) {
          return jsonResponse({ error: "not signed in with GitHub" }, 401);
        }
        const cfg = config();
        const client = await getClient();

        // Preflight may create a project from a repo and resolve its default
        // head. Apply always reuses the immutable commit returned by preflight.
        // Once a project is known its bound platform wins; the host default
        // applies only at creation time.
        let projectId: number;
        let platform: string;
        let deploySourceRef = sourceRef(body.sourceRef);
        if (isValidProjectId(body.projectId)) {
          const project = await ownedProject(
            client,
            session.githubUserId,
            body.projectId,
          );
          if (!project) {
            return jsonResponse(
              { error: "project not found for this user" },
              404,
            );
          }
          projectId = project.id;
          platform = platformOf(project, cfg.platform);
        } else if (preflight && repo) {
          const project = await client.createProject({
            platform: cfg.platform,
            repo,
            githubUserId: session.githubUserId,
          });
          if (!isValidProjectId(project.id)) {
            throw new Error("backend did not return a valid project id");
          }
          projectId = project.id;
          platform = cfg.platform;
        } else {
          return jsonResponse(
            {
              error: preflight
                ? "missing `projectId` or `repo`"
                : "missing `projectId`",
            },
            400,
          );
        }

        if (!preflight && !deploySourceRef) {
          return jsonResponse(
            {
              error: "missing source commit from preflight",
            },
            400,
          );
        }

        const actor = typeof body.actor === "string" ? body.actor : undefined;
        const { deployment } = preflight
          ? await client.preflight({
              platform,
              projectId,
              sourceRef: deploySourceRef ?? undefined,
              actor,
            })
          : await client.deploy({
              platform,
              projectId,
              sourceRef: deploySourceRef!,
              actor,
            });
        return jsonResponse(
          {
            ok: true,
            repo: deployment.source.repositoryLink ?? repo,
            installationId: deployment.source.installationId
              ? String(deployment.source.installationId)
              : undefined,
            projectId,
            sourceRef: deployment.source.commitHash,
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

    // The created project is owned by the signed-in GitHub user — taken from
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
      const project = await client.scaffold({
        platform: cfg.platform,
        installationId: Number(body.installationId),
        templateRepo: cfg.templateRepo,
        repoName: body.repoName?.trim() || (await defaultRepoName()),
        githubUserId: session.githubUserId,
        private: cfg.createdRepoPrivate,
      });
      if (!project.repositoryLink || !project.installationId) {
        return jsonResponse(
          { error: "backend did not return a created project" },
          502,
        );
      }
      return jsonResponse(
        {
          ok: true,
          repo: project.repositoryLink,
          installationId: String(project.installationId),
          projectId: project.id,
          project,
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
      // The backend resolves CI live per poll (by the deployment's recorded
      // commit, on its App installation token) and deep-links the run URL.
      const result = await client.status({
        platform: cfg.platform,
        deploymentId,
      });
      return jsonResponse(
        {
          ...result,
          releaseTags: releaseTagsFromDeployment(result.deployment),
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
        projectId?: unknown;
        apps?: unknown;
        actor?: string;
      };
      if (!isValidReleaseTags(body.releaseTags)) {
        return jsonResponse({ error: "missing or invalid `releaseTags`" }, 400);
      }
      if (!isValidProjectId(body.projectId)) {
        return jsonResponse({ error: "missing or invalid `projectId`" }, 400);
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
      const project = await ownedProject(
        client,
        session.githubUserId,
        body.projectId,
      );
      if (!project) {
        return jsonResponse(
          { error: "project not found for this user" },
          404,
        );
      }
      const platform = platformOf(project, cfg.platform);
      const pairs = apps.map((app, index) => ({
        app,
        releaseTag: releaseTags[index],
      }));
      const authorized = await activationPairsBelongToProject(
        client,
        session.githubUserId,
        project,
        pairs,
      );
      if (!authorized) {
        return jsonResponse({ error: "release not found for this user" }, 404);
      }
      const missingByApp = await missingSecretsForActivation({
        client,
        githubUserId: session.githubUserId,
        project,
        pairs,
      });
      if (Object.keys(missingByApp).length > 0) {
        return jsonResponse(
          { error: "missing required secrets", missing: missingByApp },
          409,
        );
      }
      const result = await client.activate({
        platform,
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
      const projects = await client.listUserProjects({
        githubUserId: session.githubUserId,
      });
      const owner = projects.find((project) =>
        project.apps.some(
          (app) =>
            app.name === name &&
            (!releaseTag || app.appReleaseTag === releaseTag),
        ),
      );
      if (!owner) {
        return jsonResponse({ error: "app not found for this user" }, 404);
      }
      const result = await client.getApp({
        platform: platformOf(owner, cfg.platform),
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
    if (!isValidProjectId(body.projectId)) {
      return jsonResponse({ error: "missing or invalid `projectId`" }, 400);
    }

    try {
      const cfg = config();
      const client = await getClient();
      const project = await ownedProject(
        client,
        session.githubUserId,
        body.projectId,
      );
      if (!project) {
        return jsonResponse({ error: "project not found for this user" }, 404);
      }
      const latest = await client.getUserProjectLatestDeployment({
        githubUserId: session.githubUserId,
        projectId: body.projectId,
      });
      const deploymentId = latest?.deploymentId ?? null;
      if (!deploymentId) {
        return jsonResponse(
          {
            error:
              "No backend-owned deployment is available for this project yet; refusing to reuse Deploy because GitHub can skip tree-identical pushes.",
          },
          409,
        );
      }

      // The backend re-runs the Actions run behind the deployment's recorded
      // commit on its App installation token; no GitHub token in this layer.
      const rerun = await client.rerunDeployment({
        platform: platformOf(project, cfg.platform),
        deploymentId,
        githubUserId: session.githubUserId,
      });
      return jsonResponse(
        {
          ok: rerun.ok,
          projectId: body.projectId,
          platformRepo: latest?.platformRepo ?? null,
          ciRunId: rerun.runId === null ? null : String(rerun.runId),
          ciUrl: rerun.ciUrl ?? latest?.ciUrl ?? null,
        },
        200,
      );
    } catch (err) {
      return launchErrorResponse(err);
    }
  };

  // The signed-in user's projects across every bound platform. Scoped to the
  // github_user_id in the session — a client can never request someone else's
  // projects. `?platform=` is an explicit narrowing filter, never a default.
  const projects: LaunchRouteHandler = async (req) => {
    const blocked = checkRead(req);
    if (blocked) return blocked;

    const session = await getSession(req);
    if (!session) {
      return jsonResponse({ error: "not signed in with GitHub" }, 401);
    }

    try {
      const client = await getClient();
      const platform =
        new URL(req.url).searchParams.get("platform")?.trim() || undefined;
      const result = await client.listUserProjects({
        githubUserId: session.githubUserId,
        platform,
      });
      return jsonResponse(
        { projects: result, githubLogin: session.githubLogin },
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
    projects,
  };
}

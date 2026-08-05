import "server-only";

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { deploymentClient } from "@build/server/bff/backend";
import { TimedPromiseCache } from "@build/server/bff/timed-promise-cache";
import { configuredBackendUrl } from "@build/server/backend-url";
import { buildFailures } from "@build/server/bff/failures";
import { launchConfig, resolveLaunchPlatform } from "./config";
import { appNamesFromDeployment, releaseTagsFromDeployment } from "./mappers";
import {
  missingSecretsForActivation,
  RequiredSecretsCheckError,
} from "@aomi-labs/deploy/bff";
import {
  BackendError,
  missingRequiredSecrets,
} from "@aomi-labs/deploy";
import {
  isValidDeploymentId,
  isValidInstallationId,
  isValidReleaseTags,
  isValidRepo,
} from "@build/lib/validate-input";
import { authorize } from "@build/server/bff/auth";

const CREATED_REPO_PREFIX = "my-playground";

// Server-side timing for the manager reads on the project page's critical
// path. Read these off a staging load to tell a heavy manager query from a
// fat payload or pool contention — they want different fixes.
async function timedManagerRead<T>(
  label: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = performance.now();
  try {
    return await run();
  } finally {
    console.info(
      `launch bff: ${label} took ${Math.round(performance.now() - startedAt)}ms`,
    );
  }
}

type DeploymentClientInstance = Awaited<ReturnType<typeof deploymentClient>>;

function launchErrorContext(req: Request, operation: string) {
  return {
    routeFamily: new URL(req.url).pathname,
    operation,
    method: req.method,
  };
}

type OwnedProject = Awaited<
  ReturnType<DeploymentClientInstance["listUserProjects"]>
>[number];

/** The signed-in user's projects. Ownership checks always read the
 *  account-wide list (platform undefined) so partner-bound projects are never
 *  invisible; an explicit platform is only a Projects-page narrowing filter. */
function cachedUserProjects(
  client: DeploymentClientInstance,
  githubUserId: string,
  platform?: string,
): Promise<OwnedProject[]> {
  return readCache.projects.get([githubUserId, platform ?? null], () =>
    client.listUserProjects({ githubUserId, platform }),
  );
}

/** The platform every downstream platform-addressed call must use once a
 *  project is known: the project's bound platform. The configured default
 *  applies only before a project exists (creation) or on unbound legacy rows. */
function projectPlatform(
  project: OwnedProject,
  config: ReturnType<typeof launchConfig>,
): string {
  return project.platformName?.trim() || config.platform;
}

// Read cache for the hot project-page GETs. Same 15s TTL as operate's, and it
// coalesces concurrent mounts onto one manager call — but unlike operate's
// read-only routes, launch mutations CHANGE what these reads return (preflight
// re-syncs the source and can register apps; activate/promote/deactivate move
// the live release), so every source-mutating route clears it. Without that,
// the redeploy flow's `reload()` after preflight would read a stale list and
// the required-secrets gate could fail for an app the UI has no row for.
const READ_CACHE_TTL_MS = 15_000;

const readCache = {
  projects: new TimedPromiseCache<OwnedProject[]>(READ_CACHE_TTL_MS),
  serverTags: new TimedPromiseCache<
    Awaited<ReturnType<DeploymentClientInstance["serverTags"]>>
  >(READ_CACHE_TTL_MS),
};

export function clearLaunchReadCache() {
  Object.values(readCache).forEach((cache) => cache.clear());
}

/** The signed-in user's project with `projectId`, or null if not theirs.
 *  Account-wide: the backend scopes listUserProjects to the session's GitHub
 *  user id, so an id absent from the result is not owned by the caller. */
async function findOwnedProject(
  client: DeploymentClientInstance,
  githubUserId: string,
  projectId: number,
): Promise<OwnedProject | null> {
  const projects = await cachedUserProjects(client, githubUserId);
  return projects.find((project) => project.id === projectId) ?? null;
}

/** Every deployment id in the source's DB promotion records (all its apps).
 *  This is the same timeline the console lists, so promote authorization and
 *  what the user sees never diverge. */
async function projectDeploymentIds(
  client: DeploymentClientInstance,
  platform: string,
  project: OwnedProject,
): Promise<Set<string>> {
  const ids = new Set<string>();
  await Promise.all(
    project.apps.map(async (app) => {
      const { records } = await client
        .listDeploymentRecords({
          platform,
          app: app.name,
          projectId: project.id,
        })
        .catch((error: unknown) => {
          buildFailures.handle({
            source: "launch",
            error,
            context: {
              routeFamily: "/api/bff/deployments/promote",
              operation: "deployment.ownership_records",
              method: "POST",
            },
          });
          return { records: [] };
        });
      for (const record of records) ids.add(record.deploymentId);
    }),
  );
  return ids;
}

/** The (app, releaseTag) pairs for `deploymentId`, derived from the SAME DB
 *  promotion records used for ownership (`projectDeploymentIds`) rather than
 *  the size-limited `listUserProjectDeployments` listing — so the secret gate
 *  can never see an emptier set than the authorization check just proved. */
async function projectDeploymentPairs(
  client: DeploymentClientInstance,
  platform: string,
  project: OwnedProject,
  deploymentId: string,
  appsFilter: string[] | undefined,
): Promise<{ app: string; releaseTag: string }[]> {
  const pairs: { app: string; releaseTag: string }[] = [];
  await Promise.all(
    project.apps.map(async (app) => {
      if (appsFilter && !appsFilter.includes(app.name)) return;
      const { records } = await client
        .listDeploymentRecords({
          platform,
          app: app.name,
          projectId: project.id,
        })
        .catch((error: unknown) => {
          buildFailures.handle({
            source: "launch",
            error,
            context: {
              routeFamily: "/api/bff/deployments/promote",
              operation: "deployment.activation_records",
              method: "POST",
            },
          });
          return {
            records: [] as { deploymentId: string; releaseTag: string }[],
          };
        });
      const record = records.find((r) => r.deploymentId === deploymentId);
      if (record?.releaseTag) {
        pairs.push({ app: app.name, releaseTag: record.releaseTag });
      }
    }),
  );
  return pairs;
}

type ActivationPair = { app: string; releaseTag: string };

function releaseTagForApp(app: {
  releaseTag?: string | null;
  appReleaseTag?: string | null;
}): string | null {
  return app.releaseTag?.trim() || app.appReleaseTag?.trim() || null;
}

function deploymentContainsPair(
  deployment: NonNullable<OwnedProject["latestDeployment"]>,
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
  client: DeploymentClientInstance,
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

function defaultRepoName() {
  const normalized = CREATED_REPO_PREFIX.trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalized}-${randomBytes(4).toString("hex")}`;
}

function isValidProjectId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function sourceRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().toLowerCase();
  return /^[0-9a-f]{7,40}$/.test(clean) ? clean : null;
}

function requestedPlatformFromUrl(
  req: Request,
  configured: ReturnType<typeof launchConfig>,
): string | null {
  return resolveLaunchPlatform(
    new URL(req.url).searchParams.get("platform") ?? undefined,
    configured,
  );
}

function invalidPlatformResponse(): NextResponse {
  return NextResponse.json(
    { error: "unknown or unavailable `platform`" },
    { status: 400 },
  );
}

export function launchDeployRoute(preflight: boolean) {
  return async function POST(req: Request): Promise<Response> {
    const auth = await authorize(req, { write: true, cliScope: "deploy" });
    if ("response" in auth) return auth.response;
    const { session } = auth;

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (
      body.projectId !== undefined &&
      !isValidProjectId(body.projectId)
    ) {
      return NextResponse.json(
        { error: "invalid `projectId`" },
        { status: 400 },
      );
    }
    if (body.repo !== undefined && !isValidRepo(body.repo)) {
      return NextResponse.json({ error: "invalid `repo`" }, { status: 400 });
    }
    const repo = isValidRepo(body.repo) ? body.repo : undefined;

    try {
      const config = launchConfig();
      const client = await deploymentClient();

      // Preflight may create a project from a repository and resolve its
      // default head. Apply always reuses preflight's immutable commit.
      // Once a project is known its bound platform wins; the requested
      // platform only applies at creation time.
      let projectId: number;
      let platform: string;
      let deploySourceRef = sourceRef(body.sourceRef);
      if (isValidProjectId(body.projectId)) {
        // An explicit project id must belong to the signed-in user.
        const project = await findOwnedProject(
          client,
          session.githubUserId,
          body.projectId,
        );
        if (!project) {
          return NextResponse.json(
            { error: "project not found for this user" },
            { status: 404 },
          );
        }
        projectId = project.id;
        platform = projectPlatform(project, config);
      } else if (preflight && repo) {
        const createPlatform = resolveLaunchPlatform(body.platform, config);
        if (!createPlatform) return invalidPlatformResponse();
        const project = await client.createProject({
          platform: createPlatform,
          repo,
          githubUserId: session.githubUserId,
        });
        if (!isValidProjectId(project.id)) {
          throw new Error("backend did not return a valid project id");
        }
        projectId = project.id;
        platform = createPlatform;
      } else {
        return NextResponse.json(
          {
            error: preflight
              ? "missing `projectId` or `repo`"
              : "missing `projectId`",
          },
          { status: 400 },
        );
      }

      if (!preflight && !deploySourceRef) {
        return NextResponse.json(
          { error: "missing source commit from preflight" },
          { status: 400 },
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
      // Preflight re-syncs the source (and can register new apps); deploy
      // records a new deployment. The next projects read must see it.
      clearLaunchReadCache();
      const projectUrl = new URL(`/projects/${projectId}`, req.url);
      projectUrl.searchParams.set("tab", "deployments");
      return NextResponse.json(
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
          projectUrl: projectUrl.toString(),
        },
        { status: preflight ? 200 : 202 },
      );
    } catch (err) {
      return buildFailures.handle({
        source: "launch",
        error: err,
        context: launchErrorContext(
          req,
          preflight ? "launch.preflight" : "launch.deploy",
        ),
      }).response;
    }
  };
}

export async function createLaunchRepoRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      platform?: unknown;
      installationId?: unknown;
      repoName?: string;
    };
    if (!isValidInstallationId(body.installationId)) {
      return NextResponse.json(
        { error: "missing or invalid `installationId`" },
        { status: 400 },
      );
    }

    const config = launchConfig();
    const platform = resolveLaunchPlatform(body.platform, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    const project = await client.scaffold({
      platform,
      installationId: Number(body.installationId),
      templateRepo: config.templateRepo,
      repoName: body.repoName?.trim() || defaultRepoName(),
      githubUserId: session.githubUserId,
      private: config.createdRepoPrivate,
    });
    clearLaunchReadCache();
    if (!project.repositoryLink || !project.installationId) {
      return NextResponse.json(
        { error: "backend did not return a created project" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      repo: project.repositoryLink,
      installationId: String(project.installationId),
      projectId: project.id,
      project,
    });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "launch.create_repo"),
    }).response;
  }
}

export async function launchStatusRoute(req: Request) {
  const auth = await authorize(req, { cliScope: "deployment:read" });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const deploymentId = new URL(req.url).searchParams.get("deploymentId");
  if (!isValidDeploymentId(deploymentId)) {
    return NextResponse.json(
      { error: "missing or invalid `deploymentId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const platform = resolveLaunchPlatform(
      new URL(req.url).searchParams.get("platform") ?? undefined,
      config,
    );
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    // The backend resolves CI live per poll (by the deployment's recorded
    // commit, on the App installation token) and deep-links the run URL —
    // no client-side GitHub enrichment on top.
    const result = await client.status({
      platform,
      deploymentId,
      githubUserId: session.githubUserId,
    });
    return NextResponse.json({
      ...result,
      releaseTags: releaseTagsFromDeployment(result.deployment),
    });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "launch.status"),
    }).response;
  }
}

export async function activateLaunchRoute(req: Request) {
  const auth = await authorize(req, { write: true, cliScope: "activate" });
  if ("response" in auth) return auth.response;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      releaseTags?: unknown;
      projectId?: unknown;
      apps?: unknown;
      actor?: string;
      platform?: unknown;
    };
    if (!isValidReleaseTags(body.releaseTags)) {
      return NextResponse.json(
        { error: "missing or invalid `releaseTags`" },
        { status: 400 },
      );
    }
    if (!isValidProjectId(body.projectId)) {
      return NextResponse.json(
        { error: "missing or invalid `projectId`" },
        { status: 400 },
      );
    }
    if (
      !Array.isArray(body.apps) ||
      !body.apps.every((app) => typeof app === "string")
    ) {
      return NextResponse.json(
        { error: "missing or invalid `apps`" },
        { status: 400 },
      );
    }

    const releaseTags = body.releaseTags;
    const apps = body.apps.map((app) => app.trim()).filter(Boolean);
    if (apps.length === 0 || apps.length !== releaseTags.length) {
      return NextResponse.json(
        { error: "`apps` must match `releaseTags` length" },
        { status: 400 },
      );
    }

    const config = launchConfig();
    const client = await deploymentClient();
    const { session } = auth;
    const project = await findOwnedProject(
      client,
      session.githubUserId,
      body.projectId,
    );
    if (!project) {
      return NextResponse.json(
        { error: "project not found for this user" },
        { status: 404 },
      );
    }
    const platform = projectPlatform(project, config);
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
      return NextResponse.json(
        { error: "release not found for this user" },
        { status: 404 },
      );
    }
    const missingByApp = await missingSecretsForActivation({
      client,
      githubUserId: session.githubUserId,
      project,
      pairs,
    });
    if (Object.keys(missingByApp).length > 0) {
      return NextResponse.json(
        { error: "missing required secrets", missing: missingByApp },
        { status: 409 },
      );
    }
    const result = await client.activate({
      platform,
      target: { kind: "release_tags", value: releaseTags },
      apps,
      targetTags: config.targetTags,
      actor: typeof body.actor === "string" ? body.actor : undefined,
    });
    clearLaunchReadCache();
    return NextResponse.json(result);
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "launch.activate"),
    }).response;
  }
}

export async function launchAppRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  const releaseTag = params.get("releaseTag")?.trim();
  if (!name) {
    return NextResponse.json({ error: "missing `name`" }, { status: 400 });
  }

  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const projects = await cachedUserProjects(client, session.githubUserId);
    const owner = projects.find((project) =>
      project.apps.some(
        (app) =>
          app.name === name &&
          (!releaseTag || app.appReleaseTag === releaseTag),
      ),
    );
    if (!owner) {
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
    const app = await client.getApp({
      platform: projectPlatform(owner, config),
      app: name,
      releaseTag: releaseTag || undefined,
    });
    const live = app.isActive && app.loaded;
    return NextResponse.json({
      ok: true,
      state: live ? "live" : "pending",
      app: {
        id: app.id,
        name: app.name,
        is_active: app.isActive,
        loaded: app.loaded,
        app_release_tag: app.appReleaseTag,
      },
    });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "launch.app"),
    }).response;
  }
}

export async function launchSdkStatusRoute(req: Request) {
  try {
    const client = await deploymentClient();
    const status = await readCache.serverTags.get(["server_tags"], () =>
      timedManagerRead("server_tags", () => client.serverTags()),
    );
    const requiredVersion = status.sdkVersion;
    return NextResponse.json({
      ok: true,
      serverTags: status.serverTags,
      sdkStatus: {
        requiredVersion,
        status: requiredVersion ? "unknown" : "missing",
        fixCommand: requiredVersion
          ? `aomi-build sdk fix --backend ${configuredBackendUrl()}`
          : null,
      },
    });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "launch.sdk_status"),
    }).response;
  }
}

export const deploymentProjectsRoute = userProjectsRoute;
export const deploymentStatusRoute = launchStatusRoute;
export const deploymentDeployRoute = launchDeployRoute;
export const deploymentRedeployRoute = redeployLaunchRoute;

export async function deploymentHistoryRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;
  const params = new URL(req.url).searchParams;
  const projectId = Number(params.get("projectId"));
  if (!isValidProjectId(projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }
  const limit = Number(params.get("limit") ?? "20");

  try {
    const client = await deploymentClient();
    const deployments = await client.listUserProjectDeployments({
      githubUserId: session.githubUserId,
      projectId,
      limit: Number.isSafeInteger(limit) && limit > 0 ? limit : undefined,
    });
    return NextResponse.json({ deployments });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.history"),
    }).response;
  }
}

export async function deploymentFeedRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;
  const params = new URL(req.url).searchParams;
  const limit = Number(params.get("limit") ?? "50");
  const cursorCreatedAt = params.get("cursorCreatedAt");
  const cursorId = params.get("cursorId");
  if (
    !Number.isSafeInteger(limit) ||
    limit <= 0 ||
    limit > 100 ||
    (cursorCreatedAt === null) !== (cursorId === null)
  ) {
    return NextResponse.json(
      { error: "invalid deployment feed pagination" },
      { status: 400 },
    );
  }
  const cursor =
    cursorCreatedAt !== null && cursorId !== null
      ? { createdAt: Number(cursorCreatedAt), id: Number(cursorId) }
      : null;
  if (
    cursor &&
    (!Number.isSafeInteger(cursor.createdAt) ||
      !Number.isSafeInteger(cursor.id))
  ) {
    return NextResponse.json(
      { error: "invalid deployment feed cursor" },
      { status: 400 },
    );
  }

  try {
    const client = await deploymentClient();
    const page = await client.listUserDeployments({
      githubUserId: session.githubUserId,
      limit,
      cursor,
    });
    return NextResponse.json(page);
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.feed"),
    }).response;
  }
}

export async function deploymentSecretsRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;
  const params = new URL(req.url).searchParams;
  const projectId = Number(params.get("projectId"));
  if (!isValidProjectId(projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }

  try {
    const client = await deploymentClient();
    const project = await findOwnedProject(
      client,
      session.githubUserId,
      projectId,
    );
    if (!project) {
      return NextResponse.json(
        { error: "project not found for this user" },
        { status: 404 },
      );
    }
    const { byApp } = await client.listAppSecrets({
      githubUserId: session.githubUserId,
      projectId: String(projectId),
    });
    return NextResponse.json({ byApp });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.secrets_read"),
    }).response;
  }
}

export async function deploymentSecretsWriteRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    app?: unknown;
    projectId?: unknown;
    platform?: unknown;
    secrets?: unknown;
  };
  const app = typeof body.app === "string" ? body.app.trim() : "";
  if (!app) {
    return NextResponse.json({ error: "missing `app`" }, { status: 400 });
  }
  if (!isValidProjectId(body.projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }
  // Accept a { KEY: value } map of non-empty string values.
  const secrets: Record<string, string> = {};
  if (body.secrets && typeof body.secrets === "object") {
    for (const [k, v] of Object.entries(
      body.secrets as Record<string, unknown>,
    )) {
      const key = k.trim();
      if (key && typeof v === "string" && v.length > 0) secrets[key] = v;
    }
  }
  if (Object.keys(secrets).length === 0) {
    return NextResponse.json(
      { error: "no valid secrets provided" },
      { status: 400 },
    );
  }

  try {
    const client = await deploymentClient();
    // The app must belong to a project the signed-in user owns.
    const project = await findOwnedProject(
      client,
      session.githubUserId,
      body.projectId,
    );
    if (!project || !project.apps.some((a) => a.name === app)) {
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
    // Vault key is the GitHub user id, matching the read side.
    const { handles } = await client.ingestSecrets({
      githubUserId: session.githubUserId,
      app,
      projectId: String(body.projectId),
      secrets,
    });
    return NextResponse.json(
      { ok: true, keys: Object.keys(handles) },
      { status: 202 },
    );
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.secrets_write"),
    }).response;
  }
}

export async function deploymentSecretsDeleteRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    app?: unknown;
    projectId?: unknown;
    name?: unknown;
    platform?: unknown;
  };
  const app = typeof body.app === "string" ? body.app.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!app || !name) {
    return NextResponse.json(
      { error: "missing `app` or `name`" },
      { status: 400 },
    );
  }
  if (!isValidProjectId(body.projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }

  try {
    const client = await deploymentClient();
    const project = await findOwnedProject(
      client,
      session.githubUserId,
      body.projectId,
    );
    if (!project || !project.apps.some((a) => a.name === app)) {
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
    const removed = await client.removeAppSecret({
      githubUserId: session.githubUserId,
      app,
      projectId: String(body.projectId),
      name,
    });
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.secrets_delete"),
    }).response;
  }
}

export async function deploymentRecordsRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;
  const params = new URL(req.url).searchParams;
  const app = params.get("app")?.trim();
  if (!app) {
    return NextResponse.json({ error: "missing `app`" }, { status: 400 });
  }
  const projectId = Number(params.get("projectId"));
  if (!isValidProjectId(projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const project = await findOwnedProject(
      client,
      session.githubUserId,
      projectId,
    );
    if (!project || !project.apps.some((candidate) => candidate.name === app)) {
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
    const result = await client.listDeploymentRecords({
      platform: projectPlatform(project, config),
      app,
      projectId,
    });
    return NextResponse.json(result);
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.records"),
    }).response;
  }
}

export async function deploymentPromoteRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    deploymentId?: unknown;
    projectId?: unknown;
    apps?: unknown;
    actor?: string;
    platform?: unknown;
  };
  if (!isValidDeploymentId(body.deploymentId)) {
    return NextResponse.json(
      { error: "missing or invalid `deploymentId`" },
      { status: 400 },
    );
  }
  if (!isValidProjectId(body.projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }
  const deploymentId = body.deploymentId;
  const projectId = body.projectId;
  const apps =
    Array.isArray(body.apps) &&
    body.apps.every((app) => typeof app === "string")
      ? body.apps.map((app) => app.trim()).filter(Boolean)
      : undefined;

  try {
    const config = launchConfig();
    const client = await deploymentClient();

    // Authorize the promote target against the signed-in user: the project
    // must be theirs, and the deployment must appear in that project's DB
    // promotion records — the same timeline the console lists. (Authorizing
    // against the GitHub history fanout instead falsely rejected deployments
    // that are in the DB but not on a live GitHub branch.)
    const project = await findOwnedProject(
      client,
      session.githubUserId,
      projectId,
    );
    if (!project) {
      return NextResponse.json(
        { error: "project not found for this user" },
        { status: 404 },
      );
    }
    const platform = projectPlatform(project, config);
    const known = await projectDeploymentIds(client, platform, project);
    if (!known.has(deploymentId)) {
      return NextResponse.json(
        { error: "deployment does not belong to this project" },
        { status: 404 },
      );
    }

    // Gate promotion on required secrets, exactly as activate does — promote
    // runs the same backend activation machinery. The gate reads the TARGET
    // deployment's release tag from the DB promotion records (the same
    // records used for ownership above), which may differ from the
    // current-release manifest the UI / requiredSecretsRoute reads — this
    // backend gate is authoritative for what's about to go live.
    const pairs = await projectDeploymentPairs(
      client,
      platform,
      project,
      deploymentId,
      apps,
    );
    const missingByApp = await missingSecretsForActivation({
      client,
      githubUserId: session.githubUserId,
      project,
      pairs,
    });
    if (Object.keys(missingByApp).length > 0) {
      return NextResponse.json(
        { error: "missing required secrets", missing: missingByApp },
        { status: 409 },
      );
    }

    // Default the promotion actor to the signed-in GitHub user so Aomi Build
    // promotions are attributable without the client threading it.
    const actor =
      typeof body.actor === "string" && body.actor.trim()
        ? body.actor
        : session.githubLogin;
    const result = await client.promote({
      platform,
      deploymentId,
      apps,
      targetTags: config.targetTags,
      actor,
    });
    clearLaunchReadCache();
    return NextResponse.json(result, { status: result.ok ? 202 : 409 });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.promote"),
    }).response;
  }
}

export async function deploymentDeactivateRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: unknown;
    apps?: unknown;
    actor?: string;
    platform?: unknown;
  };
  if (!isValidProjectId(body.projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }
  const apps =
    Array.isArray(body.apps) && body.apps.every((a) => typeof a === "string")
      ? body.apps.map((a) => a.trim()).filter(Boolean)
      : [];
  if (apps.length === 0) {
    return NextResponse.json(
      { error: "missing or invalid `apps`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const project = await findOwnedProject(
      client,
      session.githubUserId,
      body.projectId,
    );
    if (!project) {
      return NextResponse.json(
        { error: "project not found for this user" },
        { status: 404 },
      );
    }
    const platform = projectPlatform(project, config);
    const actor =
      typeof body.actor === "string" && body.actor.trim()
        ? body.actor
        : session.githubLogin;
    for (const app of apps) {
      await client.deactivateApp({
        platform,
        app,
        projectId: body.projectId,
        actor,
      });
    }
    clearLaunchReadCache();
    return NextResponse.json({ ok: true, apps }, { status: 202 });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.deactivate"),
    }).response;
  }
}

export async function redeployLaunchRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isValidProjectId(body.projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const project = await findOwnedProject(
      client,
      session.githubUserId,
      body.projectId,
    );
    if (!project) {
      return NextResponse.json(
        { error: "project not found for this user" },
        { status: 404 },
      );
    }
    const latest = await client.getUserProjectLatestDeployment({
      githubUserId: session.githubUserId,
      projectId: body.projectId,
    });
    const deploymentId = latest?.deploymentId ?? null;
    if (!deploymentId) {
      return NextResponse.json(
        {
          error:
            "No backend-owned deployment is available for this project yet; refusing to reuse Deploy because GitHub can skip tree-identical pushes.",
        },
        { status: 409 },
      );
    }

    // The backend re-runs the Actions run behind the deployment's recorded
    // commit on its App installation token; no GitHub token in this layer.
    const rerun = await client.rerunDeployment({
      platform: projectPlatform(project, config),
      deploymentId,
      githubUserId: session.githubUserId,
    });
    clearLaunchReadCache();
    return NextResponse.json({
      ok: rerun.ok,
      projectId: body.projectId,
      platformRepo: latest?.platformRepo ?? null,
      ciRunId: rerun.runId === null ? null : String(rerun.runId),
      ciUrl: rerun.ciUrl ?? latest?.ciUrl ?? null,
    });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.redeploy"),
    }).response;
  }
}

// GET /api/bff/launch/projects — the signed-in user's projects + their apps,
// merged across installations and platforms unless `platform` is explicit.
// Scoped to the github_user_id in the session cookie; a client can never
// request someone else's projects. `projectId` narrows the response to one
// project — the manager has no single-project read, so the filter happens
// here, off the cached list: a project page stops transferring the whole
// account.
export async function userProjectsRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;

  try {
    const config = launchConfig();
    const params = new URL(req.url).searchParams;
    const requestedPlatform = params.get("platform");
    const platform =
      requestedPlatform === null
        ? undefined
        : resolveLaunchPlatform(requestedPlatform, config);
    if (requestedPlatform !== null && !platform) {
      return invalidPlatformResponse();
    }
    const requestedProjectId = params.get("projectId");
    const projectId =
      requestedProjectId === null ? undefined : Number(requestedProjectId);
    if (projectId !== undefined && !isValidProjectId(projectId)) {
      return NextResponse.json(
        { error: "invalid `projectId`" },
        { status: 400 },
      );
    }
    const client = await deploymentClient();
    const projects = await readCache.projects.get(
      [session.githubUserId, platform ?? null],
      () =>
        timedManagerRead("list_user_projects", () =>
          client.listUserProjects({
            githubUserId: session.githubUserId,
            platform: platform ?? undefined,
          }),
        ),
    );
    return NextResponse.json({
      projects:
        projectId === undefined
          ? projects
          : projects.filter((project) => project.id === projectId),
      githubLogin: session.githubLogin,
    });
  } catch (err) {
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.projects"),
    }).response;
  }
}

// GET /api/bff/deployments/required-secrets?projectId=<n> — the Manager's
// DB-backed secret declarations for each live release plus which required slots
// are still unfilled in the vault. Never returns secret VALUES.
export async function requiredSecretsRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const projectId = Number(new URL(req.url).searchParams.get("projectId"));
  if (!isValidProjectId(projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }

  try {
    const client = await deploymentClient();
    const [declared, configured] = await Promise.all([
      client.getUserProjectRequiredSecrets({
        githubUserId: session.githubUserId,
        projectId,
      }),
      client.listAppSecrets({
        githubUserId: session.githubUserId,
        projectId: String(projectId),
      }),
    ]);
    const entries = Object.entries(declared.byApp).map(([app, { slots }]) => {
      const configuredKeys = (configured.byApp[app] ?? []).map(
        (handle) => handle.split("::").pop() ?? handle,
      );
      return [
        app,
        {
          slots,
          missing: missingRequiredSecrets(slots, configuredKeys).map(
            (slot) => slot.name,
          ),
        },
      ] as const;
    });

    return NextResponse.json({ byApp: Object.fromEntries(entries) });
  } catch (err) {
    if (err instanceof BackendError) {
      if (err.status === 404) {
        return NextResponse.json(
          { error: "project not found for this user" },
          { status: 404 },
        );
      }
      return buildFailures.handle({
        source: "launch",
        error: new RequiredSecretsCheckError({
          cause: err,
          upstream: "rust",
          upstreamStatus: err.status,
        }),
        context: launchErrorContext(req, "deployment.required_secrets"),
      }).response;
    }
    return buildFailures.handle({
      source: "launch",
      error: err,
      context: launchErrorContext(req, "deployment.required_secrets"),
    }).response;
  }
}

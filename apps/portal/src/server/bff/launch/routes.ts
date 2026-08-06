import "server-only";

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { backendClient } from "@portal/server/bff/backend";
import { configuredBackendUrl } from "@portal/server/backend-url";
import type { FailureContext as LaunchFailureContext } from "@aomi-labs/bff-observability";
import { portalFailures } from "@portal/server/bff/failures";
import { launchConfig } from "./config";
import { appNamesFromDeployment, releaseTagsFromDeployment } from "./mappers";
import { validateOrigin } from "@portal/lib/csrf";
import { getGitHubSession } from "@portal/server/cookies/github";
import { missingSecretsForActivation } from "@aomi-labs/deploy/bff";
import {
  isValidDeploymentId,
  isValidInstallationId,
  isValidReleaseTags,
  isValidRepo,
} from "@portal/lib/validate-input";

const CREATED_REPO_PREFIX = "my-playground";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function checkWrite(req: Request): NextResponse | null {
  return validateOrigin(req) ? null : forbidden();
}

type GitHubSession = NonNullable<Awaited<ReturnType<typeof getGitHubSession>>>;
type BackendClientInstance = Awaited<ReturnType<typeof backendClient>>;

function launchFailureContext(
  req: Request,
  operation: string,
): LaunchFailureContext {
  return {
    routeFamily: new URL(req.url).pathname,
    operation,
    method: req.method,
  };
}

/** Require a signed-in GitHub session; the credentials backing these writes
 *  are server-held, so origin validation alone must not authorize them. */
async function requireSession(): Promise<
  { session: GitHubSession } | { response: NextResponse }
> {
  const session = await getGitHubSession();
  if (!session) {
    return {
      response: NextResponse.json(
        { error: "not signed in with GitHub" },
        { status: 401 },
      ),
    };
  }
  return { session };
}

type OwnedProject = Awaited<
  ReturnType<BackendClientInstance["listUserProjects"]>
>[number];

/** The signed-in user's project with `projectId`, or null if not theirs.
 *  Account-wide: the backend scopes listUserProjects to the session's GitHub
 *  user id, so an id absent from the result is not owned by the caller —
 *  and partner-bound projects are never invisible to the check. */
async function findOwnedProject(
  client: BackendClientInstance,
  githubUserId: string,
  projectId: number,
): Promise<OwnedProject | null> {
  const projects = await client.listUserProjects({ githubUserId });
  return projects.find((project) => project.id === projectId) ?? null;
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

/** Every deployment id in the source's DB promotion records (all its apps).
 *  This is the same timeline the console lists, so promote authorization and
 *  what the user sees never diverge. */
async function projectDeploymentIds(
  client: BackendClientInstance,
  platform: string,
  project: OwnedProject,
  failureContext: LaunchFailureContext,
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
          portalFailures.handle({
            source: "launch",
            error,
            context: failureContext,
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
  client: BackendClientInstance,
  platform: string,
  project: OwnedProject,
  deploymentId: string,
  appsFilter: string[] | undefined,
  failureContext: LaunchFailureContext,
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
          portalFailures.handle({
            source: "launch",
            error,
            context: failureContext,
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
  client: BackendClientInstance,
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

export function launchDeployRoute(preflight: boolean) {
  return async function POST(req: Request): Promise<Response> {
    const blocked = checkWrite(req);
    if (blocked) return blocked;

    const auth = await requireSession();
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
      const client = await backendClient();

      // Preflight may create a project and asks the backend to resolve its
      // immutable default-head commit. Apply must reuse that returned commit.
      // Once a project is known its bound platform wins; the configured
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
        const project = await client.createProject({
          platform: config.platform,
          repo,
          githubUserId: session.githubUserId,
        });
        if (!isValidProjectId(project.id)) {
          throw new Error("backend did not return a valid project id");
        }
        projectId = project.id;
        platform = config.platform;
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
        },
        { status: preflight ? 200 : 202 },
      );
    } catch (err) {
      return portalFailures.handle({
        source: "launch",
        error: err,
        context: launchFailureContext(
          req,
          preflight ? "launch.preflight" : "launch.deploy",
        ),
      }).response;
    }
  };
}

export async function createLaunchRepoRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

  // The created source is owned by the signed-in GitHub user — taken from the
  // server-side session, never trusted from the client body.
  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
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
    const client = await backendClient();
    const project = await client.scaffold({
      platform: config.platform,
      installationId: Number(body.installationId),
      templateRepo: config.templateRepo,
      repoName: body.repoName?.trim() || defaultRepoName(),
      githubUserId: session.githubUserId,
      private: config.createdRepoPrivate,
    });
    if (!project.repositoryLink || !project.installationId) {
      throw new Error("backend did not return a created project");
    }
    return NextResponse.json({
      ok: true,
      repo: project.repositoryLink,
      installationId: String(project.installationId),
      projectId: project.id,
      project,
    });
  } catch (err) {
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "launch.create_repo"),
    }).response;
  }
}

export async function launchStatusRoute(req: Request) {
  const auth = await requireSession();
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
    const client = await backendClient();
    // The backend resolves CI live per poll (by the deployment's recorded
    // commit, on the App installation token) and deep-links the run URL —
    // no client-side GitHub enrichment on top.
    const result = await client.status({
      platform: config.platform,
      deploymentId,
      githubUserId: session.githubUserId,
    });
    return NextResponse.json({
      ...result,
      releaseTags: releaseTagsFromDeployment(result.deployment),
    });
  } catch (err) {
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "launch.status"),
    }).response;
  }
}

export async function activateLaunchRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

  const auth = await requireSession();
  if ("response" in auth) return auth.response;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      releaseTags?: unknown;
      projectId?: unknown;
      apps?: unknown;
      actor?: string;
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
    const client = await backendClient();
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
    return NextResponse.json(result);
  } catch (err) {
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "launch.activate"),
    }).response;
  }
}

export async function launchAppRoute(req: Request) {
  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  const releaseTag = params.get("releaseTag")?.trim();
  if (!name) {
    return NextResponse.json({ error: "missing `name`" }, { status: 400 });
  }

  try {
    const client = await backendClient();
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
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
    // Fresh per-project read — the project-scoped replacement for the
    // retired platform-door `GET /:platform/apps/:app`.
    const { apps } = await client.listUserProjectApps({
      githubUserId: session.githubUserId,
      projectId: owner.id,
    });
    const app = apps.find(
      (candidate) =>
        candidate.name === name &&
        (!releaseTag || candidate.appReleaseTag === releaseTag),
    );
    if (!app) {
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
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
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "launch.app"),
    }).response;
  }
}

export async function launchSdkStatusRoute(req: Request) {
  try {
    const client = await backendClient();
    const status = await client.serverTags();
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
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "launch.sdk_status"),
    }).response;
  }
}

export const deploymentProjectsRoute = userProjectsRoute;
export const deploymentStatusRoute = launchStatusRoute;
export const deploymentDeployRoute = launchDeployRoute;
export const deploymentRedeployRoute = redeployLaunchRoute;

export async function deploymentHistoryRoute(req: Request) {
  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }
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
    const client = await backendClient();
    const deployments = await client.listUserProjectDeployments({
      githubUserId: session.githubUserId,
      projectId,
      limit: Number.isSafeInteger(limit) && limit > 0 ? limit : undefined,
    });
    return NextResponse.json({ deployments });
  } catch (err) {
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "deployment.history"),
    }).response;
  }
}

export async function deploymentSecretsRoute(req: Request) {
  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }
  const params = new URL(req.url).searchParams;
  const projectId = Number(params.get("projectId"));
  if (!isValidProjectId(projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }

  try {
    const client = await backendClient();
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
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "deployment.secrets_read"),
    }).response;
  }
}

export async function deploymentSecretsWriteRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    app?: unknown;
    projectId?: unknown;
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
    const client = await backendClient();
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
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "deployment.secrets_write"),
    }).response;
  }
}

export async function deploymentSecretsDeleteRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    app?: unknown;
    projectId?: unknown;
    name?: unknown;
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
    const client = await backendClient();
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
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "deployment.secrets_delete"),
    }).response;
  }
}

export async function deploymentRecordsRoute(req: Request) {
  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }
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
    const client = await backendClient();
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
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "deployment.records"),
    }).response;
  }
}

export async function deploymentPromoteRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    deploymentId?: unknown;
    projectId?: unknown;
    apps?: unknown;
    actor?: string;
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
    const client = await backendClient();

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
    const recordsFailureContext = launchFailureContext(
      req,
      "deployment.records_lookup",
    );
    const known = await projectDeploymentIds(
      client,
      platform,
      project,
      recordsFailureContext,
    );
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
      recordsFailureContext,
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

    // Default the promotion actor to the signed-in GitHub user so portal
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
    return NextResponse.json(result, { status: result.ok ? 202 : 409 });
  } catch (err) {
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "deployment.promote"),
    }).response;
  }
}

export async function deploymentDeactivateRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

  const auth = await requireSession();
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    projectId?: unknown;
    apps?: unknown;
    actor?: string;
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
    const client = await backendClient();
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
    return NextResponse.json({ ok: true, apps }, { status: 202 });
  } catch (err) {
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "deployment.deactivate"),
    }).response;
  }
}

export async function redeployLaunchRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isValidProjectId(body.projectId)) {
    return NextResponse.json(
      { error: "missing or invalid `projectId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const client = await backendClient();
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
    return NextResponse.json({
      ok: rerun.ok,
      projectId: body.projectId,
      platformRepo: latest?.platformRepo ?? null,
      ciRunId: rerun.runId === null ? null : String(rerun.runId),
      ciUrl: rerun.ciUrl ?? latest?.ciUrl ?? null,
    });
  } catch (err) {
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "deployment.redeploy"),
    }).response;
  }
}

// GET /api/bff/launch/projects — the signed-in user's projects + their apps,
// across every bound platform. Scoped to the github_user_id in the session
// cookie; a client can never request someone else's projects. `?platform=`
// is an explicit narrowing filter, never a default.
export async function userProjectsRoute(req: Request) {
  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }

  try {
    const client = await backendClient();
    const platform =
      new URL(req.url).searchParams.get("platform")?.trim() || undefined;
    const projects = await client.listUserProjects({
      githubUserId: session.githubUserId,
      platform,
    });
    return NextResponse.json({ projects, githubLogin: session.githubLogin });
  } catch (err) {
    return portalFailures.handle({
      source: "launch",
      error: err,
      context: launchFailureContext(req, "deployment.projects"),
    }).response;
  }
}

import "server-only";

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { deploymentClient } from "@build/server/bff/backend";
import { configuredBackendUrl } from "@build/server/backend-url";
import { launchErrorResponse } from "./errors";
import { launchConfig, resolveLaunchPlatform } from "./config";
import { appNamesFromDeployment, releaseTagsFromDeployment } from "./mappers";
import {
  fetchReleaseSecretSlots,
  missingSecretsForActivation,
  RequiredSecretsCheckError,
} from "@aomi-labs/deploy/bff";
import { missingRequiredSecrets, type SecretSlot } from "@aomi-labs/deploy";
import {
  isValidDeploymentId,
  isValidInstallationId,
  isValidReleaseTags,
  isValidRepo,
} from "@build/lib/validate-input";
import { authorize, rateLimit } from "@build/server/bff/auth";

const CREATED_REPO_PREFIX = "my-playground";

type DeploymentClientInstance = Awaited<ReturnType<typeof deploymentClient>>;

/** Whether `appSourceId` belongs to the signed-in user. The backend scopes
 *  listUserSources to the session's GitHub user id, so a source id absent from
 *  the result is not owned by the caller. */
async function ownsAppSource(
  client: DeploymentClientInstance,
  githubUserId: string,
  platform: string,
  appSourceId: number,
): Promise<boolean> {
  const sources = await client.listUserSources({ githubUserId, platform });
  return sources.some((source) => source.id === appSourceId);
}

type OwnedSource = Awaited<
  ReturnType<DeploymentClientInstance["listUserSources"]>
>[number];

/** The signed-in user's source with `appSourceId`, or null if not theirs. */
async function findOwnedSource(
  client: DeploymentClientInstance,
  githubUserId: string,
  platform: string,
  appSourceId: number,
): Promise<OwnedSource | null> {
  const sources = await client.listUserSources({ githubUserId, platform });
  return sources.find((source) => source.id === appSourceId) ?? null;
}

/** Every deployment id in the source's DB promotion records (all its apps).
 *  This is the same timeline the console lists, so promote authorization and
 *  what the user sees never diverge. */
async function sourceDeploymentIds(
  client: DeploymentClientInstance,
  platform: string,
  source: OwnedSource,
): Promise<Set<string>> {
  const ids = new Set<string>();
  await Promise.all(
    source.apps.map(async (app) => {
      const { records } = await client
        .listDeploymentRecords({
          platform,
          app: app.name,
          appSourceId: source.id,
        })
        .catch(() => ({ records: [] }));
      for (const record of records) ids.add(record.deploymentId);
    }),
  );
  return ids;
}

/** The (app, releaseTag) pairs for `deploymentId`, derived from the SAME DB
 *  promotion records used for ownership (`sourceDeploymentIds`) rather than
 *  the size-limited `listUserSourceDeployments` listing — so the secret gate
 *  can never see an emptier set than the authorization check just proved. */
async function sourceDeploymentPairs(
  client: DeploymentClientInstance,
  platform: string,
  source: OwnedSource,
  deploymentId: string,
  appsFilter: string[] | undefined,
): Promise<{ app: string; releaseTag: string }[]> {
  const pairs: { app: string; releaseTag: string }[] = [];
  await Promise.all(
    source.apps.map(async (app) => {
      if (appsFilter && !appsFilter.includes(app.name)) return;
      const { records } = await client
        .listDeploymentRecords({
          platform,
          app: app.name,
          appSourceId: source.id,
        })
        .catch(() => ({
          records: [] as { deploymentId: string; releaseTag: string }[],
        }));
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
  deployment: NonNullable<OwnedSource["latestDeployment"]>,
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
  client: DeploymentClientInstance,
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

function defaultRepoName() {
  const normalized = CREATED_REPO_PREFIX.trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalized}-${randomBytes(4).toString("hex")}`;
}

function isValidAppSourceId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function sourceRef(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim().toLowerCase();
  return /^[0-9a-f]{7,40}$/.test(clean) ? clean : null;
}

function aomiTomlPaths(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some(
      (path) =>
        typeof path !== "string" ||
        !path.trim() ||
        path.startsWith("/") ||
        path.split("/").includes(".."),
    )
  ) {
    return null;
  }
  return value.map((path) => path.trim());
}

function sourceRefFromSource(source: {
  sourceRef?: string | null;
  commitHash?: string | null;
}): string | null {
  return sourceRef(source.sourceRef) ?? sourceRef(source.commitHash);
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
  return async function POST(req: Request): Promise<NextResponse> {
    const auth = await authorize(req, { write: true, cliScope: "deploy" });
    if ("response" in auth) return auth.response;
    const { session } = auth;

    const body = (await req.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (
      body.appSourceId !== undefined &&
      !isValidAppSourceId(body.appSourceId)
    ) {
      return NextResponse.json(
        { error: "invalid `appSourceId`" },
        { status: 400 },
      );
    }
    if (body.repo !== undefined && !isValidRepo(body.repo)) {
      return NextResponse.json({ error: "invalid `repo`" }, { status: 400 });
    }
    const requestedAomiTomlPaths = aomiTomlPaths(body.aomiTomlPaths);
    if (!requestedAomiTomlPaths) {
      return NextResponse.json(
        { error: "invalid `aomiTomlPaths`" },
        { status: 400 },
      );
    }
    const repo = isValidRepo(body.repo) ? body.repo : undefined;
    let syncGithubUserId: string | null | undefined;
    async function githubUserIdForSync(): Promise<string | null> {
      if (syncGithubUserId !== undefined) return syncGithubUserId;
      syncGithubUserId = session.githubUserId;
      return syncGithubUserId;
    }

    try {
      const config = launchConfig();
      const platform = resolveLaunchPlatform(body.platform, config);
      if (!platform) return invalidPlatformResponse();
      const client = await deploymentClient();

      // An explicit source id must belong to the signed-in user; the
      // repo-based preflight path resolves/creates a source scoped to the
      // installation instead.
      if (
        isValidAppSourceId(body.appSourceId) &&
        !(await ownsAppSource(
          client,
          session.githubUserId,
          platform,
          body.appSourceId,
        ))
      ) {
        return NextResponse.json(
          { error: "app source not found for this user" },
          { status: 404 },
        );
      }

      // Deploy uses a stable source row plus an immutable source commit. When
      // Aomi Build only has a repo, sync-installed resolves both from GitHub.
      let appSourceId: number;
      let deploySourceRef = sourceRef(body.sourceRef);
      if (isValidAppSourceId(body.appSourceId)) {
        appSourceId = body.appSourceId;
      } else if (preflight && repo) {
        const githubUserId = await githubUserIdForSync();
        if (!githubUserId) {
          return NextResponse.json(
            { error: "not signed in with GitHub" },
            { status: 401 },
          );
        }
        const synced = await client.syncSource({
          platform,
          repo,
          githubUserId,
        });
        if (!isValidAppSourceId(synced.id)) {
          throw new Error("backend did not return a valid app source id");
        }
        appSourceId = synced.id;
        deploySourceRef = sourceRefFromSource(synced);
      } else {
        return NextResponse.json(
          {
            error: preflight
              ? "missing `appSourceId` or `repo`"
              : "missing `appSourceId`",
          },
          { status: 400 },
        );
      }

      if (!deploySourceRef && repo) {
        const githubUserId = await githubUserIdForSync();
        if (!githubUserId) {
          return NextResponse.json(
            { error: "not signed in with GitHub" },
            { status: 401 },
          );
        }
        const synced = await client.syncSource({
          platform,
          repo,
          githubUserId,
        });
        if (synced.id !== appSourceId) {
          return NextResponse.json(
            { error: "repo does not match `appSourceId`" },
            { status: 409 },
          );
        }
        deploySourceRef = sourceRefFromSource(synced);
      }
      if (!deploySourceRef) {
        return NextResponse.json(
          {
            error:
              "missing source commit for deploy; sync the source repo and retry",
          },
          { status: 400 },
        );
      }

      const deployInput = {
        platform,
        appSourceId,
        sourceRef: deploySourceRef,
        aomiTomlPaths: requestedAomiTomlPaths,
        actor: typeof body.actor === "string" ? body.actor : undefined,
      };
      const { deployment } = preflight
        ? await client.preflight(deployInput)
        : await client.deploy(deployInput);
      const projectUrl = new URL(`/projects/${appSourceId}`, req.url);
      projectUrl.searchParams.set("platform", platform);
      projectUrl.searchParams.set("tab", "deployments");
      return NextResponse.json(
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
          projectUrl: projectUrl.toString(),
        },
        { status: preflight ? 200 : 202 },
      );
    } catch (err) {
      return launchErrorResponse(err);
    }
  };
}

export async function createLaunchRepoRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

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
    const client = await deploymentClient();
    const source = await client.scaffold({
      platform: config.platform,
      installationId: Number(body.installationId),
      templateRepo: config.templateRepo,
      repoName: body.repoName?.trim() || defaultRepoName(),
      githubUserId: session.githubUserId,
      private: config.createdRepoPrivate,
    });
    if (!source.repositoryLink || !source.installationId) {
      return NextResponse.json(
        { error: "backend did not return a created source repo" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      repo: source.repositoryLink,
      installationId: String(source.installationId),
      appSourceId: source.id,
      sourceRef: source.sourceRef ?? source.commitHash ?? undefined,
      source,
    });
  } catch (err) {
    return launchErrorResponse(err);
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
    return launchErrorResponse(err);
  }
}

export async function activateLaunchRoute(req: Request) {
  const auth = await authorize(req, { write: true, cliScope: "activate" });
  if ("response" in auth) return auth.response;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      releaseTags?: unknown;
      appSourceId?: unknown;
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
    if (!isValidAppSourceId(body.appSourceId)) {
      return NextResponse.json(
        { error: "missing or invalid `appSourceId`" },
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
    const platform = resolveLaunchPlatform(body.platform, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    const { session } = auth;
    const source = await findOwnedSource(
      client,
      session.githubUserId,
      platform,
      body.appSourceId,
    );
    if (!source) {
      return NextResponse.json(
        { error: "app source not found for this user" },
        { status: 404 },
      );
    }
    const pairs = apps.map((app, index) => ({
      app,
      releaseTag: releaseTags[index],
    }));
    const authorized = await activationPairsBelongToSource(
      client,
      session.githubUserId,
      platform,
      source,
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
      platform,
      source,
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
    return launchErrorResponse(err);
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
    const sources = await client.listUserSources({
      githubUserId: session.githubUserId,
      platform: config.platform,
    });
    const owned = sources.some((source) =>
      source.apps.some(
        (app) =>
          app.name === name &&
          (!releaseTag || app.appReleaseTag === releaseTag),
      ),
    );
    if (!owned) {
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
    const app = await client.getApp({
      platform: config.platform,
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
    return launchErrorResponse(err);
  }
}

export async function launchSdkStatusRoute(req: Request) {
  const blocked = rateLimit(req);
  if (blocked) return blocked;

  try {
    const client = await deploymentClient();
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
    return launchErrorResponse(err);
  }
}

export const deploymentSourcesRoute = userSourcesRoute;
export const deploymentStatusRoute = launchStatusRoute;
export const deploymentDeployRoute = launchDeployRoute;
export const deploymentRedeployRoute = redeployLaunchRoute;

export async function deploymentHistoryRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;
  const params = new URL(req.url).searchParams;
  const appSourceId = Number(params.get("appSourceId"));
  if (!isValidAppSourceId(appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }
  const limit = Number(params.get("limit") ?? "20");

  try {
    const config = launchConfig();
    const platform = requestedPlatformFromUrl(req, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    const deployments = await client.listUserSourceDeployments({
      githubUserId: session.githubUserId,
      platform,
      appSourceId,
      limit: Number.isSafeInteger(limit) && limit > 0 ? limit : undefined,
    });
    return NextResponse.json({ deployments });
  } catch (err) {
    return launchErrorResponse(err);
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
    const config = launchConfig();
    const client = await deploymentClient();
    const page = await client.listUserDeployments({
      githubUserId: session.githubUserId,
      platform: config.platform,
      limit,
      cursor,
    });
    return NextResponse.json(page);
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function deploymentSecretsRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;
  const params = new URL(req.url).searchParams;
  const appSourceId = Number(params.get("appSourceId"));
  if (!isValidAppSourceId(appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const platform = requestedPlatformFromUrl(req, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    const source = await findOwnedSource(
      client,
      session.githubUserId,
      platform,
      appSourceId,
    );
    if (!source) {
      return NextResponse.json(
        { error: "source not found for this user" },
        { status: 404 },
      );
    }
    const { byApp } = await client.listAppSecrets({
      githubUserId: session.githubUserId,
      sourceId: String(appSourceId),
    });
    return NextResponse.json({ byApp });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function deploymentSecretsWriteRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    app?: unknown;
    appSourceId?: unknown;
    platform?: unknown;
    secrets?: unknown;
  };
  const app = typeof body.app === "string" ? body.app.trim() : "";
  if (!app) {
    return NextResponse.json({ error: "missing `app`" }, { status: 400 });
  }
  if (!isValidAppSourceId(body.appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
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
    const config = launchConfig();
    const platform = resolveLaunchPlatform(body.platform, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    // The app must belong to a source the signed-in user owns.
    const source = await findOwnedSource(
      client,
      session.githubUserId,
      platform,
      body.appSourceId,
    );
    if (!source || !source.apps.some((a) => a.name === app)) {
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
    // Vault key is the GitHub user id, matching the read side.
    const { handles } = await client.ingestSecrets({
      githubUserId: session.githubUserId,
      app,
      sourceId: String(body.appSourceId),
      secrets,
    });
    return NextResponse.json(
      { ok: true, keys: Object.keys(handles) },
      { status: 202 },
    );
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function deploymentSecretsDeleteRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    app?: unknown;
    appSourceId?: unknown;
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
  if (!isValidAppSourceId(body.appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const platform = resolveLaunchPlatform(body.platform, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    const source = await findOwnedSource(
      client,
      session.githubUserId,
      platform,
      body.appSourceId,
    );
    if (!source || !source.apps.some((a) => a.name === app)) {
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
    const removed = await client.removeAppSecret({
      githubUserId: session.githubUserId,
      app,
      sourceId: String(body.appSourceId),
      name,
    });
    return NextResponse.json({ ok: true, removed });
  } catch (err) {
    return launchErrorResponse(err);
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
  const appSourceId = Number(params.get("appSourceId"));
  if (!isValidAppSourceId(appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const platform = requestedPlatformFromUrl(req, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    const source = await findOwnedSource(
      client,
      session.githubUserId,
      platform,
      appSourceId,
    );
    if (!source || !source.apps.some((candidate) => candidate.name === app)) {
      return NextResponse.json(
        { error: "app not found for this user" },
        { status: 404 },
      );
    }
    const result = await client.listDeploymentRecords({
      platform,
      app,
      appSourceId,
    });
    return NextResponse.json(result);
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function deploymentPromoteRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    deploymentId?: unknown;
    appSourceId?: unknown;
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
  if (!isValidAppSourceId(body.appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }
  const deploymentId = body.deploymentId;
  const appSourceId = body.appSourceId;
  const apps =
    Array.isArray(body.apps) &&
    body.apps.every((app) => typeof app === "string")
      ? body.apps.map((app) => app.trim()).filter(Boolean)
      : undefined;

  try {
    const config = launchConfig();
    const platform = resolveLaunchPlatform(body.platform, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();

    // Authorize the promote target against the signed-in user: the source
    // must be theirs, and the deployment must appear in that source's DB
    // promotion records — the same timeline the console lists. (Authorizing
    // against the GitHub history fanout instead falsely rejected deployments
    // that are in the DB but not on a live GitHub branch.)
    const source = await findOwnedSource(
      client,
      session.githubUserId,
      platform,
      appSourceId,
    );
    if (!source) {
      return NextResponse.json(
        { error: "app source not found for this user" },
        { status: 404 },
      );
    }
    const known = await sourceDeploymentIds(client, platform, source);
    if (!known.has(deploymentId)) {
      return NextResponse.json(
        { error: "deployment does not belong to this source" },
        { status: 404 },
      );
    }

    // Gate promotion on required secrets, exactly as activate does — promote
    // runs the same backend activation machinery. The gate reads the TARGET
    // deployment's release tag from the DB promotion records (the same
    // records used for ownership above), which may differ from the
    // current-release manifest the UI / requiredSecretsRoute reads — this
    // backend gate is authoritative for what's about to go live.
    const pairs = await sourceDeploymentPairs(
      client,
      platform,
      source,
      deploymentId,
      apps,
    );
    const missingByApp = await missingSecretsForActivation({
      client,
      githubUserId: session.githubUserId,
      platform,
      source,
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
    return NextResponse.json(result, { status: result.ok ? 202 : 409 });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function deploymentDeactivateRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as {
    appSourceId?: unknown;
    apps?: unknown;
    actor?: string;
    platform?: unknown;
  };
  if (!isValidAppSourceId(body.appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
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
    const platform = resolveLaunchPlatform(body.platform, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    if (
      !(await ownsAppSource(
        client,
        session.githubUserId,
        platform,
        body.appSourceId,
      ))
    ) {
      return NextResponse.json(
        { error: "app source not found for this user" },
        { status: 404 },
      );
    }
    const actor =
      typeof body.actor === "string" && body.actor.trim()
        ? body.actor
        : session.githubLogin;
    for (const app of apps) {
      await client.deactivateApp({
        platform,
        app,
        appSourceId: body.appSourceId,
        actor,
      });
    }
    return NextResponse.json({ ok: true, apps }, { status: 202 });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function redeployLaunchRoute(req: Request) {
  const auth = await authorize(req, { write: true });
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isValidAppSourceId(body.appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const platform = resolveLaunchPlatform(body.platform, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    const latest = await client.getUserSourceLatestDeployment({
      githubUserId: session.githubUserId,
      platform,
      appSourceId: body.appSourceId,
    });
    const deploymentId = latest?.deploymentId ?? null;
    if (!deploymentId) {
      return NextResponse.json(
        {
          error:
            "No backend-owned deployment is available for this source yet; refusing to reuse Deploy because GitHub can skip tree-identical pushes.",
        },
        { status: 409 },
      );
    }

    // The backend re-runs the Actions run behind the deployment's recorded
    // commit on its App installation token; no GitHub token in this layer.
    const rerun = await client.rerunDeployment({
      platform,
      deploymentId,
      githubUserId: session.githubUserId,
    });
    return NextResponse.json({
      ok: rerun.ok,
      appSourceId: body.appSourceId,
      platformRepo: latest?.platformRepo ?? null,
      ciRunId: rerun.runId === null ? null : String(rerun.runId),
      ciUrl: rerun.ciUrl ?? latest?.ciUrl ?? null,
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

// GET /api/bff/launch/sources — the signed-in user's source repos + their apps,
// merged across installations. Scoped to the github_user_id in the session
// cookie; a client can never request someone else's sources.
export async function userSourcesRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;

  try {
    const config = launchConfig();
    const platform = requestedPlatformFromUrl(req, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    const sources = await client.listUserSources({
      githubUserId: session.githubUserId,
      platform,
    });
    return NextResponse.json({ sources, githubLogin: session.githubLogin });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

// GET /api/bff/deployments/required-secrets?appSourceId=<n> — the declared
// secret slots per app (from the release manifest) plus which required slots
// are still unfilled in the vault. Read-only twin of the 409 backstop on
// activate: lets the UI disable Activate and explain why before the user
// clicks it, instead of only rejecting after the fact. Never returns secret
// VALUES — only key names, descriptions, and the `required` flag.
export async function requiredSecretsRoute(req: Request) {
  const auth = await authorize(req);
  if ("response" in auth) return auth.response;
  const { session } = auth;

  const appSourceId = Number(new URL(req.url).searchParams.get("appSourceId"));
  if (!isValidAppSourceId(appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const platform = requestedPlatformFromUrl(req, config);
    if (!platform) return invalidPlatformResponse();
    const client = await deploymentClient();
    const source = await findOwnedSource(
      client,
      session.githubUserId,
      platform,
      appSourceId,
    );
    if (!source) {
      return NextResponse.json(
        { error: "app source not found for this user" },
        { status: 404 },
      );
    }

    // Required-secret metadata must be verified before the UI can show an
    // activation path. An empty slot list is only valid when GitHub confirms
    // that the release predates manifest secret declarations.
    // `source` comes from `findOwnedSource` -> `listUserSources`, and the
    // backend deliberately returns `latest_deployment: null` there (it's lazy
    // for the list); resolve the real value from the per-source
    // latest-deployment detail endpoint instead, same as the redeploy route.
    const githubToken = process.env.GITHUB_TOKEN?.trim();
    if (!githubToken) throw new RequiredSecretsCheckError();
    let platformRepo = source.latestDeployment?.platformRepo ?? undefined;
    if (!platformRepo) {
      try {
        const latest = await client.getUserSourceLatestDeployment({
          githubUserId: session.githubUserId,
          platform,
          appSourceId: source.id,
        });
        platformRepo = latest?.platformRepo ?? undefined;
      } catch {
        throw new RequiredSecretsCheckError();
      }
    }
    if (!platformRepo) throw new RequiredSecretsCheckError();
    const configured = await client.listAppSecrets({
      githubUserId: session.githubUserId,
      sourceId: String(source.id),
    });

    const byApp: Record<string, { slots: SecretSlot[]; missing: string[] }> =
      {};
    for (const app of source.apps) {
      const releaseTag = app.appReleaseTag;
      const slots =
        githubToken && platformRepo && releaseTag
          ? ((
              await fetchReleaseSecretSlots({
                platformRepo,
                releaseTag,
                githubToken,
              })
            )[app.name] ?? [])
          : [];
      const configuredKeys = (configured.byApp[app.name] ?? []).map(
        (handle) => handle.split("::").pop() ?? handle,
      );
      byApp[app.name] = {
        slots,
        missing: missingRequiredSecrets(slots, configuredKeys).map(
          (slot) => slot.name,
        ),
      };
    }

    return NextResponse.json({ byApp });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

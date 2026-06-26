import "server-only";

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { deploymentClient } from "@portal/server/bff/backend";
import { BackendError, launchErrorResponse } from "./errors";
import { launchConfig, launchDeploySourceRef } from "./config";
import { appNamesFromDeployment, releaseTagsFromDeployment } from "./mappers";
import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";
import { validateOrigin } from "@portal/lib/csrf";
import { getGitHubSession } from "@portal/server/cookies/github";
import {
  isValidDeploymentId,
  isValidInstallationId,
  isValidReleaseTags,
  isValidRepo,
} from "@portal/lib/validate-input";

const CREATED_REPO_PREFIX = "my-playground";

function tooManyRequests() {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function checkRead(req: Request): NextResponse | null {
  return checkRateLimit(getClientIp(req)).allowed ? null : tooManyRequests();
}

function checkWrite(req: Request): NextResponse | null {
  return checkRead(req) ?? (validateOrigin(req) ? null : forbidden());
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

export function launchDeployRoute(preflight: boolean) {
  return async function POST(req: Request): Promise<NextResponse> {
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
      return NextResponse.json(
        { error: "invalid `appSourceId`" },
        { status: 400 },
      );
    }
    if (body.repo !== undefined && !isValidRepo(body.repo)) {
      return NextResponse.json({ error: "invalid `repo`" }, { status: 400 });
    }

    try {
      const config = launchConfig();
      const client = await deploymentClient();

      // A deploy always commits against a stable source row id. Resolving (or
      // minting) that row from a repo is a separate concern: it happens here
      // only for a preflight — the preview that materializes the row — or via the
      // dedicated /sync-installed route. The committing deploy never silently
      // creates or re-resolves a source by repo.
      let appSourceId: number;
      if (isValidAppSourceId(body.appSourceId)) {
        appSourceId = body.appSourceId;
      } else if (preflight && isValidRepo(body.repo)) {
        const synced = await client.syncSource({
          platform: config.platform,
          repo: body.repo as string,
        });
        if (!isValidAppSourceId(synced.id)) {
          throw new Error("backend did not return a valid app source id");
        }
        appSourceId = synced.id;
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

      const { deployment } = await client.deploy({
        platform: config.platform,
        appSourceId,
        sourceRef: launchDeploySourceRef(),
        aomiTomlPaths: config.aomiTomlPaths,
        preflight,
        actor: typeof body.actor === "string" ? body.actor : undefined,
      });
      return NextResponse.json(
        {
          ok: true,
          repo:
            deployment.source.repositoryLink ??
            (body.repo as string | undefined),
          installationId: deployment.source.installationId
            ? String(deployment.source.installationId)
            : undefined,
          appSourceId,
          deployment,
          releaseTags: releaseTagsFromDeployment(deployment),
          apps: appNamesFromDeployment(deployment),
        },
        { status: preflight ? 200 : 202 },
      );
    } catch (err) {
      return launchErrorResponse(err);
    }
  };
}

export async function createLaunchRepoRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

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
      source,
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function launchStatusRoute(req: Request) {
  const blocked = checkRead(req);
  if (blocked) return blocked;

  const deploymentId = new URL(req.url).searchParams.get("deploymentId");
  if (!isValidDeploymentId(deploymentId)) {
    return NextResponse.json(
      { error: "missing or invalid `deploymentId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const result = await client.status({
      platform: config.platform,
      deploymentId,
    });
    const enriched = await enrichPendingCiStatus(result);
    return NextResponse.json({
      ...enriched,
      releaseTags: releaseTagsFromDeployment(enriched.deployment),
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

type LaunchStatusPayload = Awaited<
  ReturnType<Awaited<ReturnType<typeof deploymentClient>>["status"]>
>;

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

  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "aomi-portal",
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

export async function activateLaunchRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      releaseTags?: unknown;
      apps?: string[];
      actor?: string;
    };
    if (!isValidReleaseTags(body.releaseTags)) {
      return NextResponse.json(
        { error: "missing or invalid `releaseTags`" },
        { status: 400 },
      );
    }

    const releaseTags = body.releaseTags;
    const apps = (body.apps ?? []).map((app) => app.trim()).filter(Boolean);
    if (apps.length > 0 && apps.length !== releaseTags.length) {
      return NextResponse.json(
        { error: "`apps` must match `releaseTags` length" },
        { status: 400 },
      );
    }

    const config = launchConfig();
    const client = await deploymentClient();
    const result = await client.activate({
      platform: config.platform,
      target: { kind: "release_tags", value: releaseTags },
      apps: apps.length ? apps : undefined,
      targetTags: config.targetTags,
      actor: typeof body.actor === "string" ? body.actor : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    return launchErrorResponse(err);
  }
}

export async function launchAppRoute(req: Request) {
  const blocked = checkRead(req);
  if (blocked) return blocked;

  const params = new URL(req.url).searchParams;
  const name = params.get("name")?.trim();
  const releaseTag = params.get("releaseTag")?.trim();
  if (!name) {
    return NextResponse.json({ error: "missing `name`" }, { status: 400 });
  }

  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const app = await client.getApp({
      platform: config.platform,
      app: name,
      releaseTag: releaseTag || undefined,
    });
    const live = app.isActive && app.loaded;
    return NextResponse.json({
      ok: Boolean(live),
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

export async function checkLaunchRepoRoute(req: Request) {
  const blocked = checkRead(req);
  if (blocked) return blocked;

  const repo = new URL(req.url).searchParams.get("repo");
  if (!isValidRepo(repo)) {
    return NextResponse.json(
      { error: "missing or invalid `repo`" },
      { status: 400 },
    );
  }

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "aomi-portal",
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com/repos/${repo}`, {
      headers,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ exists: false, fromTemplate: false });
      }
      return NextResponse.json(
        { error: `GitHub API error (${res.status})` },
        { status: 502 },
      );
    }

    const templateFullName = (
      (body as Record<string, unknown>)?.template_repository as
        | Record<string, unknown>
        | undefined
    )?.full_name as string | undefined;
    const fromTemplate =
      typeof templateFullName === "string" &&
      templateFullName.toLowerCase().startsWith("aomi-labs/");

    return NextResponse.json({ exists: true, fromTemplate });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

export async function syncInstalledLaunchRoute(req: Request) {
  const blocked = checkWrite(req);
  if (blocked) return blocked;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      repo?: unknown;
    };
    if (!isValidRepo(body.repo)) {
      return NextResponse.json(
        { error: "missing or invalid `repo`" },
        { status: 400 },
      );
    }

    const repo = body.repo as string;
    const config = launchConfig();
    const client = await deploymentClient();
    const source = await client.syncSource({ platform: config.platform, repo });
    if (!source.installationId) {
      return NextResponse.json(
        { error: "backend did not return an installation id" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      repo: source.repositoryLink ?? repo,
      installationId: String(source.installationId),
      appSourceId: source.id,
      source,
    });
  } catch (err) {
    if (err instanceof BackendError && err.status === 404) {
      return NextResponse.json(
        {
          error:
            "GitHub install not found. Make sure the GitHub App is installed on this repository.",
        },
        { status: 404 },
      );
    }
    return launchErrorResponse(err);
  }
}

function ciRunIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/actions\/runs\/(\d+)(?:\/|$)/);
  return match?.[1] ?? null;
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
  if (!isValidAppSourceId(body.appSourceId)) {
    return NextResponse.json(
      { error: "missing or invalid `appSourceId`" },
      { status: 400 },
    );
  }

  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const latest = await client.getUserSourceLatestDeployment({
      githubUserId: session.githubUserId,
      platform: config.platform,
      appSourceId: body.appSourceId,
    });
    const platformRepo = latest?.platformRepo;
    const ciRunId =
      latest?.ciRunId === null || latest?.ciRunId === undefined
        ? ciRunIdFromUrl(latest?.ciUrl)
        : String(latest.ciRunId);

    if (!platformRepo || !isValidRepo(platformRepo) || !ciRunId) {
      return NextResponse.json(
        {
          error:
            "No backend-owned CI run is available for this source yet; refusing to reuse Deploy because GitHub can skip tree-identical pushes.",
        },
        { status: 409 },
      );
    }

    const token = process.env.GITHUB_TOKEN?.trim();
    if (!token) {
      return NextResponse.json(
        { error: "GitHub rerun token is not configured" },
        { status: 503 },
      );
    }

    const res = await fetch(
      `https://api.github.com/repos/${platformRepo}/actions/runs/${ciRunId}/rerun`,
      {
        method: "POST",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "aomi-portal",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: `GitHub CI rerun failed (${res.status})${text ? `: ${text}` : ""}`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      appSourceId: body.appSourceId,
      platformRepo,
      ciRunId,
      ciUrl:
        latest?.ciUrl ??
        `https://github.com/${platformRepo}/actions/runs/${ciRunId}`,
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

// GET /api/bff/launch/sources — the signed-in user's source repos + their apps,
// merged across installations. Scoped to the github_user_id in the session
// cookie; a client can never request someone else's sources.
export async function userSourcesRoute(req: Request) {
  const blocked = checkRead(req);
  if (blocked) return blocked;

  const session = await getGitHubSession();
  if (!session) {
    return NextResponse.json(
      { error: "not signed in with GitHub" },
      { status: 401 },
    );
  }

  try {
    const config = launchConfig();
    const client = await deploymentClient();
    const sources = await client.listUserSources({
      githubUserId: session.githubUserId,
      platform: config.platform,
    });
    return NextResponse.json({ sources, githubLogin: session.githubLogin });
  } catch (err) {
    return launchErrorResponse(err);
  }
}

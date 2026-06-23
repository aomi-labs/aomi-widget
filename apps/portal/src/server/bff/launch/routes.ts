import "server-only";

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { deploymentClient } from "@portal/server/bff/backend";
import { BackendError, launchErrorResponse } from "./errors";
import { launchConfig } from "./config";
import {
  appNamesFromDeployment,
  releaseTagsFromDeployment,
} from "./mappers";
import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";
import { validateOrigin } from "@portal/lib/csrf";
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
  const normalized = CREATED_REPO_PREFIX
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalized}-${randomBytes(4).toString("hex")}`;
}

async function resolveAppSourceId(args: {
  client: Awaited<ReturnType<typeof deploymentClient>>;
  platform: string;
  installationId: string;
  repo?: string;
}): Promise<number> {
  const source = await args.client.resolveSource({
    platform: args.platform,
    installationId: Number(args.installationId),
    repo: args.repo,
  });
  if (!Number.isSafeInteger(source.id) || source.id <= 0) {
    throw new Error("backend did not return a valid app source id");
  }
  return source.id;
}

export function launchDeployRoute(dryRun: boolean) {
  return async function POST(req: Request): Promise<NextResponse> {
    const blocked = checkWrite(req);
    if (blocked) return blocked;

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (!isValidInstallationId(body.installationId)) {
      return NextResponse.json(
        { error: "invalid `installationId`" },
        { status: 400 },
      );
    }
    if (body.repo !== undefined && !isValidRepo(body.repo)) {
      return NextResponse.json({ error: "invalid `repo`" }, { status: 400 });
    }

    try {
      const config = launchConfig();
      const client = await deploymentClient();
      const appSourceId = await resolveAppSourceId({
        client,
        platform: config.platform,
        installationId: body.installationId as string,
        repo: body.repo as string | undefined,
      });
      const { deployment } = await client.deploy({
        platform: config.platform,
        appSourceId,
        sourceRef: config.sourceRef,
        aomiTomlPaths: config.aomiTomlPaths,
        dryRun,
        actor: typeof body.actor === "string" ? body.actor : undefined,
      });
      return NextResponse.json(
        {
          ok: true,
          repo:
            (body.repo as string | undefined) ??
            deployment.source.repositoryLink,
          deployment,
          releaseTags: releaseTagsFromDeployment(deployment),
          apps: appNamesFromDeployment(deployment),
        },
        { status: dryRun ? 200 : 202 },
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
    return NextResponse.json({
      ...result,
      releaseTags: releaseTagsFromDeployment(result.deployment),
    });
  } catch (err) {
    return launchErrorResponse(err);
  }
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

    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers });
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

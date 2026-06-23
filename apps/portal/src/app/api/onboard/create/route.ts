import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  getDeploymentClient,
  onboardConfig,
  onboardErrorResponse,
} from "@portal/lib/onboard-deploy";
import { checkRateLimit, getClientIp } from "@portal/lib/rate-limit";
import { validateOrigin } from "@portal/lib/csrf";
import { isValidInstallationId } from "@portal/lib/validate-input";

const CREATED_REPO_PREFIX = "my-playground";

function defaultRepoName() {
  const normalized = CREATED_REPO_PREFIX
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalized}-${randomBytes(4).toString("hex")}`;
}

export async function POST(req: Request) {
  const ip = getClientIp(req);
  if (!checkRateLimit(ip).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!validateOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const config = onboardConfig();
    const client = await getDeploymentClient();
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
    return onboardErrorResponse(err);
  }
}

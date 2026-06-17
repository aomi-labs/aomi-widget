import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  type BackendAppSourceResult,
  backendRequest,
  readOnboardDeployEnv,
} from "@portal/lib/onboard-deploy";

function defaultRepoName() {
  const prefix = process.env.APP_DEPLOY_CREATED_REPO_PREFIX || "my-playground";
  const normalized = prefix
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalized || "my-playground"}-${randomBytes(4).toString("hex")}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      installationId?: string;
      repoName?: string;
    };
    const installationId = Number(body.installationId);
    if (!Number.isSafeInteger(installationId) || installationId <= 0) {
      return NextResponse.json(
        { error: "missing `installationId`" },
        { status: 400 },
      );
    }

    const env = readOnboardDeployEnv();
    const result = await backendRequest<BackendAppSourceResult>(
      env,
      `/api/integrations/github-app/platforms/${encodeURIComponent(env.platform)}/sources/create-from-template`,
      {
        method: "POST",
        body: {
          installation_id: installationId,
          template_repo: env.templateRepo,
          repo_name: body.repoName?.trim() || defaultRepoName(),
          private: env.createdRepoPrivate,
        },
      },
    );
    const source = result.source;
    if (!source?.repository_link || !source.installation_id) {
      return NextResponse.json(
        { error: "backend did not return a created source repo" },
        { status: 502 },
      );
    }
    return NextResponse.json({
      ok: true,
      repo: source.repository_link,
      installationId: String(source.installation_id),
      appSourceId: source.id,
      source,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";

import {
  appNamesFromDeployment,
  type BackendDeployResult,
  backendRequest,
  deployRequestBody,
  readOnboardDeployEnv,
  releaseTagsFromDeployment,
  resolveAppSourceId,
} from "@portal/lib/onboard-deploy";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      installationId?: string;
      repo?: string;
    };

    if (!body.installationId) {
      return NextResponse.json(
        { error: "missing `installationId`" },
        { status: 400 },
      );
    }
    const env = readOnboardDeployEnv();
    const appSourceId = await resolveAppSourceId({
      env,
      installationId: body.installationId,
      repo: body.repo,
    });
    const result = await backendRequest<BackendDeployResult>(
      env,
      `/api/platforms/${encodeURIComponent(env.platform)}/deploy`,
      {
        method: "POST",
        body: deployRequestBody(env, appSourceId, false),
      },
    );
    return NextResponse.json(
      {
        ok: true,
        repo: body.repo ?? result.deployment?.source?.repository_link,
        deployment: result.deployment,
        releaseTags: releaseTagsFromDeployment(result.deployment),
        apps: appNamesFromDeployment(result.deployment),
      },
      { status: 202 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

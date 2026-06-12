import { NextResponse } from "next/server";

export const runtime = "nodejs";

import {
  type BackendDeploymentStatusResult,
  backendRequest,
  readOnboardDeployEnv,
  releaseTagsFromDeployment,
} from "@portal/lib/onboard-deploy";

export async function GET(req: Request) {
  const deploymentId = new URL(req.url).searchParams.get("deploymentId");
  if (!deploymentId) {
    return NextResponse.json(
      { error: "missing `deploymentId`" },
      { status: 400 },
    );
  }

  try {
    const env = readOnboardDeployEnv();
    const result = await backendRequest<BackendDeploymentStatusResult>(
      env,
      `/api/platforms/${encodeURIComponent(env.platform)}/deployments/${encodeURIComponent(
        deploymentId,
      )}/status`,
    );
    return NextResponse.json({
      ...result,
      releaseTags: releaseTagsFromDeployment(result.deployment),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

import { NextResponse } from "next/server";

import {
  EXAMPLE_REPO,
  EXAMPLE_REPO_URL,
  appSlug,
  deployInput,
  getDeploymentClient,
  legacyDeployResult,
  readDeployEnv,
} from "@portal/lib/deploy";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string; actor?: string };
    const env = readDeployEnv();
    const slug = appSlug(body.name);
    if (!slug) {
      return NextResponse.json({ error: "app name is required" }, { status: 400 });
    }

    const result = await getDeploymentClient(env).deploy(deployInput(env, true, body.actor ?? slug));
    const legacy = legacyDeployResult(result);
    return NextResponse.json({
      source: { repo: EXAMPLE_REPO, url: EXAMPLE_REPO_URL },
      slug,
      releaseTag: legacy.releaseTag,
      appPath: legacy.appPath,
      targetRepo: result.deployment.platform.repository,
      files: result.deployment.platform.apps.map((app) => ({ path: app.path, bytes: 0 })),
      manifest: result.deployment,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

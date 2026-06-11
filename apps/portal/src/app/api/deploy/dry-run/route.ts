import { NextResponse } from "next/server";

import {
  EXAMPLE_REPO,
  EXAMPLE_REPO_URL,
  appSlug,
  deployInput,
  getDeploymentClient,
  readDeployEnv,
} from "@portal/lib/deploy";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      actor?: string;
    };
    const env = readDeployEnv();
    const actor = body.actor || appSlug(body.name) || "portal-demo";

    const result = await getDeploymentClient(env).deploy(
      deployInput(env, true, actor),
    );
    const app = result.deployment.platform.apps[0];
    return NextResponse.json({
      source: { repo: EXAMPLE_REPO, url: EXAMPLE_REPO_URL },
      slug: app?.name ?? appSlug(body.name),
      targetRepo: result.deployment.platform.repository,
      files: result.deployment.platform.apps.map((app) => ({
        path: app.path,
        bytes: 0,
      })),
      deployment: result.deployment,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

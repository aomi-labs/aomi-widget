import { NextResponse } from "next/server";

import {
  appSlug,
  deployInput,
  getDeploymentClient,
  readDeployEnv,
} from "@portal/lib/deploy";

// Commit the example app to the target publish branch. Does NOT activate.
// CI then builds + cuts the release (poll /api/deploy/status).
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      actor?: string;
    };
    const env = readDeployEnv();
    const actor = body.actor || appSlug(body.name) || "portal-demo";

    const client = getDeploymentClient(env);
    const result = await client.deploy(deployInput(env, false, actor));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

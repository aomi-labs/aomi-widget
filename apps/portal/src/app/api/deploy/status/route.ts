import { NextResponse } from "next/server";

import { getDeploymentClient, readDeployEnv } from "@portal/lib/deploy";

// Poll CI build + release readiness for a slug. Drives the UI stepper.
export async function GET(req: Request) {
  try {
    const slug = new URL(req.url).searchParams.get("slug");
    if (!slug) {
      return NextResponse.json({ error: "missing `slug`" }, { status: 400 });
    }
    const env = readDeployEnv();
    const client = getDeploymentClient(env);
    const status = await client.status({ platform: env.platform });
    return NextResponse.json(status);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

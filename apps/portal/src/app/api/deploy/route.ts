import { NextResponse } from "next/server";

import { appSlug, fetchExampleBundle, getDeploymentClient, readDeployEnv } from "@portal/lib/deploy";

// Commit the example app to the target publish branch. Does NOT activate.
// CI then builds + cuts the release (poll /api/deploy/status).
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string; actor?: string };
    const env = readDeployEnv();
    const slug = appSlug(body.name);
    if (!slug) {
      return NextResponse.json({ error: "app name is required" }, { status: 400 });
    }

    const { files, displayName } = await fetchExampleBundle(slug, env);
    const client = getDeploymentClient(env);
    const result = await client.deploy({
      slug,
      displayName,
      files,
      serverTags: ["staging"],
      isPublic: true,
      actor: body.actor ?? slug,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }
}

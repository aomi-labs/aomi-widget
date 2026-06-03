import { NextResponse } from "next/server";

import {
  buildDeploymentManifest,
  deriveSourceCommit,
  stageFiles,
} from "@aomi-labs/deploy";

import {
  EXAMPLE_REPO,
  EXAMPLE_REPO_URL,
  appSlug,
  fetchExampleBundle,
  readDeployEnv,
  targetDescriptor,
} from "@portal/lib/deploy";

// Preview what a deploy would publish — no GitHub writes, no backend calls.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const env = readDeployEnv();
    const slug = appSlug(body.name);
    if (!slug) {
      return NextResponse.json({ error: "app name is required" }, { status: 400 });
    }

    const { files, displayName } = await fetchExampleBundle(slug, env);
    const staged = stageFiles(slug, files);
    const sourceCommit = deriveSourceCommit(staged);
    const manifest = buildDeploymentManifest({
      slug,
      displayName,
      descriptor: targetDescriptor(env),
      staged,
      sourceCommit,
      serverTags: ["staging"],
      isPublic: true,
    });

    return NextResponse.json({
      source: { repo: EXAMPLE_REPO, url: EXAMPLE_REPO_URL },
      slug,
      releaseTag: manifest.target.release_tag,
      appPath: manifest.target.app_path,
      targetRepo: env.targetRepo,
      files: staged.map((f) => ({ path: f.path, bytes: f.bytes })),
      manifest,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }
}

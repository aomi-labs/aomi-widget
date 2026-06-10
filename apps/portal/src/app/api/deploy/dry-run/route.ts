import { NextResponse } from "next/server";

import { deriveSourceCommit, releaseTag, stageFiles } from "@aomi-labs/deploy";

import {
  EXAMPLE_REPO,
  EXAMPLE_REPO_URL,
  appSlug,
  fetchExampleBundle,
  readDeployEnv,
  targetDescriptor,
} from "@portal/lib/deploy";

// Preview what a deploy would publish — no GitHub writes, no backend calls.
//
// Manifest assembly + commit moved server-side (the backend builds and commits
// the real deployment manifest on publish). For the preview we reconstruct the
// salient fields locally from the staged bundle, using the package's pure
// generators, so the UI can show the plan without any writes.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const env = readDeployEnv();
    const slug = appSlug(body.name);
    if (!slug) {
      return NextResponse.json({ error: "app name is required" }, { status: 400 });
    }

    const { files, displayName } = await fetchExampleBundle(slug, env);
    const descriptor = targetDescriptor(env);
    const staged = stageFiles(slug, files);
    const sourceCommit = deriveSourceCommit(staged);
    const tag = releaseTag(slug, sourceCommit, descriptor.release_tag_convention);
    const appPath = `${descriptor.app_path_prefix}/${slug}`;
    const serverTags = ["staging"];

    const manifest = {
      app: {
        name: slug,
        display_name: displayName,
        platform: descriptor.name,
        git: `https://github.com/${descriptor.source_repo}`,
        public: true,
        server_tags: serverTags,
      },
      source: { commit: sourceCommit },
      platform: { name: descriptor.name, github_repo: descriptor.source_repo },
      target: { app_path: appPath, release_tag: tag, server_tags: serverTags },
      files: staged,
    };

    return NextResponse.json({
      source: { repo: EXAMPLE_REPO, url: EXAMPLE_REPO_URL },
      slug,
      releaseTag: tag,
      appPath,
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

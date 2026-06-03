/**
 * Live E2E for @aomi-labs/deploy.
 *
 * Bundles a local Aomi app source dir and deploys it to a real platform publish
 * repo via the deploy client (GitHub Git Data API), then polls status.
 *
 * Usage (from the worktree root):
 *   APP_DIR=/Users/cecilia/Code/my-aomi-bots \
 *   SLUG=cecilia-test-2 \
 *   PUBLISH_REPO=aomi-labs/community-apps \
 *   PLATFORM=community \
 *   GITHUB_TOKEN="$(gh auth token)" \
 *   npx tsx packages/deploy/scripts/e2e-deploy.ts
 *
 * Optional: ACTIVATE=1 + AOMI_BACKEND_URL + AOMI_ACTIVATION_TOKEN to also try
 * the (502-gated) activate call.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { DeploymentClient, type SourceBundle, type PlatformDescriptor } from "../src/index";

function env(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

const APP_DIR = env("APP_DIR");
const SLUG = env("SLUG");
const PUBLISH_REPO = env("PUBLISH_REPO");
const PLATFORM = env("PLATFORM");
const TOKEN = env("GITHUB_TOKEN");

// community platform.json descriptor (captured 2026-06-01).
const DESCRIPTOR: PlatformDescriptor = {
  name: PLATFORM,
  source_repo: PUBLISH_REPO,
  publish_branch: "publish",
  app_path_prefix: "apps",
  release_tag_convention: "apps-{app_slug}-{short_commit}",
  visibility: "public",
};

function trackedFiles(dir: string): string[] {
  const out = execFileSync("git", ["-C", dir, "ls-files"], { encoding: "utf8" });
  return out.split("\n").map((s) => s.trim()).filter(Boolean);
}

function buildBundle(dir: string): SourceBundle {
  const bundle: SourceBundle = {};
  for (const rel of trackedFiles(dir)) {
    // .aomi/* is gitignored already; skip the manifest path defensively.
    if (rel.startsWith(".aomi/")) continue;
    bundle[rel] = readFileSync(join(dir, rel));
  }
  return bundle;
}

async function main() {
  const files = buildBundle(APP_DIR);
  console.log(`bundling ${Object.keys(files).length} files from ${APP_DIR}:`);
  for (const p of Object.keys(files).sort()) console.log(`  - ${p}`);

  const dc = new DeploymentClient({
    github: { repo: PUBLISH_REPO, branch: "publish", botPat: TOKEN },
    aomi: {
      backendUrl: process.env.AOMI_BACKEND_URL ?? "https://unused.invalid",
      platform: PLATFORM,
      activationToken: process.env.AOMI_ACTIVATION_TOKEN ?? "unused",
    },
    descriptor: DESCRIPTOR,
    onAudit: (e) => console.log("AUDIT", JSON.stringify(e)),
  });

  console.log(`\n=== deploy ${SLUG} → ${PUBLISH_REPO}:publish ===`);
  const result = await dc.deploy({
    slug: SLUG,
    displayName: "Cecilia Test 2",
    files,
    serverTags: ["staging"],
    isPublic: true,
    actor: "e2e-script",
  });
  console.log("DEPLOY RESULT:", JSON.stringify(result, null, 2));

  console.log(`\n=== status ${SLUG} ===`);
  const status = await dc.getStatus(SLUG);
  console.log("STATUS:", JSON.stringify(status, null, 2));

  if (process.env.ACTIVATE === "1") {
    console.log(`\n=== activate ${SLUG} (staging) ===`);
    try {
      const act = await dc.activate({
        slug: SLUG,
        targetEnv: "staging",
        releaseTag: result.releaseTag,
        sourceCommit: result.sourceCommit,
        isPublic: true,
        buildServerTags: result.serverTags,
        actor: "e2e-script",
      });
      console.log("ACTIVATE RESULT:", JSON.stringify(act, null, 2));
    } catch (err) {
      console.log("ACTIVATE ERROR:", err instanceof Error ? `${err.name}: ${err.message}` : String(err));
    }
  }
}

main().catch((err) => {
  console.error("E2E FAILED:", err);
  process.exit(1);
});

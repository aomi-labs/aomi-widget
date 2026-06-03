import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildDeploymentManifest, stageFiles } from "../src/deployment-json";
import type { DeploymentManifest, PlatformDescriptor, StagedFile } from "../src/contract";

// =============================================================================
// Contract-drift guard
// =============================================================================
//
// This test re-implements the publish CI validator (krexa-hosted-apps
// .github/scripts/publish_app.py :: validate_deployment_manifest) INDEPENDENTLY
// of our own `validateManifest`, then runs it against a freshly generated
// manifest. If our generator drifts from what CI accepts, this fails.
//
// Source of truth captured 2026-06-01 from platform.json + publish_app.py.
// If those change upstream, update the constants below.

const DESCRIPTOR: PlatformDescriptor = {
  name: "krexa",
  source_repo: "aomi-labs/krexa-hosted-apps",
  publish_branch: "publish",
  app_path_prefix: "apps",
  release_tag_convention: "apps-{app_slug}-{short_commit}",
  visibility: "private",
};

const COMMIT_RE = /^[0-9a-f]{12,40}$/;

function normalizeGithubRepo(repo: string): string {
  let r = repo.trim();
  for (const p of [
    "git@github.com:",
    "ssh://git@github.com/",
    "https://github.com/",
    "http://github.com/",
    "github.com/",
  ]) {
    if (r.startsWith(p)) {
      r = r.slice(p.length);
      break;
    }
  }
  if (r.endsWith(".git")) r = r.slice(0, -4);
  return r.replace(/^\/+|\/+$/g, "").toLowerCase();
}

/** Faithful re-implementation of publish_app.py validate_deployment_manifest. */
function ciValidate(
  manifest: DeploymentManifest,
  descriptor: PlatformDescriptor,
  fileContents: Record<string, Uint8Array>,
): void {
  const fail = (m: string): never => {
    throw new Error(`CI would reject: ${m}`);
  };

  if (typeof manifest.platform !== "object") fail("platform must be an object");
  if (manifest.platform.name !== descriptor.name) fail("platform.name mismatch");
  if (normalizeGithubRepo(manifest.platform.github_repo) !== normalizeGithubRepo(descriptor.source_repo)) {
    fail("platform.github_repo mismatch");
  }

  if (typeof manifest.source !== "object" || typeof manifest.target !== "object") {
    fail("source and target must be objects");
  }
  if (!Array.isArray(manifest.files) || manifest.files.length === 0) fail("files must be non-empty");

  const slug = manifest.app?.name;
  if (typeof slug !== "string" || slug.length === 0) fail("app.name must be non-empty string");

  if (typeof manifest.source.commit !== "string" || !COMMIT_RE.test(manifest.source.commit)) {
    fail("source.commit must be 12-40 lowercase hex");
  }

  const expectedAppPath = `${descriptor.app_path_prefix.replace(/^\/+|\/+$/g, "")}/${slug}`;
  if (manifest.target.app_path !== expectedAppPath) fail(`target.app_path must be ${expectedAppPath}`);

  const shortCommit = manifest.source.commit.slice(0, 12);
  const expectedTag = descriptor.release_tag_convention
    .replace("{app_slug}", slug)
    .replace("{short_commit}", shortCommit);
  if (manifest.target.release_tag !== expectedTag) fail(`release_tag must be ${expectedTag}`);

  // files[] entries: path sanity + sha256 + bytes against actual content
  const seen = new Set<string>();
  for (const entry of manifest.files as StagedFile[]) {
    const rel = entry.path;
    if (typeof rel !== "string" || rel.startsWith("/") || rel.split("/").includes("..")) {
      fail(`invalid staged file path: ${rel}`);
    }
    if (seen.has(rel)) fail(`duplicate staged file path: ${rel}`);
    seen.add(rel);
    const content = fileContents[rel];
    if (!content) fail(`staged file missing from app directory: ${rel}`);
    const expectedSha = `sha256:${createHash("sha256").update(content).digest("hex")}`;
    if (entry.sha256 !== expectedSha) fail(`sha256 mismatch for ${rel}`);
    if (entry.bytes !== content.length) fail(`byte count mismatch for ${rel}`);
  }
}

describe("contract drift vs publish CI", () => {
  it("a generated manifest passes the independently re-implemented CI validator", () => {
    const raw: Record<string, string> = {
      "index.html": "<html><body>krexa</body></html>",
      "aomi.toml": "[app]\nname = \"krexa-finance\"\nplatform = \"krexa\"\n",
      "src/main.rs": "fn main() {}\n",
    };
    const fileBytes: Record<string, Uint8Array> = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, Buffer.from(v, "utf8")]),
    );

    const staged = stageFiles("krexa-finance", raw);
    const manifest = buildDeploymentManifest({
      slug: "krexa-finance",
      displayName: "Krexa Finance",
      descriptor: DESCRIPTOR,
      staged,
      sourceCommit: "0123456789abcdef0123456789abcdef01234567",
      serverTags: ["staging"],
      isPublic: false,
      now: 1_700_000_000,
    });

    expect(() => ciValidate(manifest, DESCRIPTOR, fileBytes)).not.toThrow();
  });

  it("CI validator catches a tampered release tag (sanity check the guard works)", () => {
    const raw = { "a.txt": "x" };
    const staged = stageFiles("app", raw);
    const manifest = buildDeploymentManifest({
      slug: "app",
      descriptor: DESCRIPTOR,
      staged,
      sourceCommit: "0123456789abcdef0123456789abcdef01234567",
      serverTags: ["staging"],
      isPublic: false,
    });
    manifest.target.release_tag = "apps-app-deadbeefdead";
    const bytes = { "a.txt": Buffer.from("x", "utf8") };
    expect(() => ciValidate(manifest, DESCRIPTOR, bytes)).toThrow(/release_tag/);
  });
});

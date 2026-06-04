/**
 * Validation deploy: push the example app to aomi-playground via the SDK and
 * confirm CI builds it. Deploy half only (no backend activate).
 *
 *   GITHUB_TOKEN="$(gh auth token)" npx tsx packages/deploy/scripts/validate-playground.ts
 */
import { DeploymentClient, type SourceBundle, type PlatformDescriptor } from "../src/index";

const TOKEN = process.env.GITHUB_TOKEN!;
const EXAMPLE = "aomi-labs/aomi-app-example";
const SUBDIR = "app/";
const TARGET = "aomi-labs/aomi-playground";
const SLUG = "example-demo";

async function gh(path: string) {
  const r = await fetch(`https://api.github.com/${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "validate", Authorization: `Bearer ${TOKEN}` },
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

async function bundle(): Promise<SourceBundle> {
  const tree = (await gh(`repos/${EXAMPLE}/git/trees/HEAD?recursive=1`)) as { tree: { path: string; type: string; sha: string }[] };
  const files: SourceBundle = {};
  for (const e of tree.tree.filter((t) => t.type === "blob" && t.path.startsWith(SUBDIR))) {
    const blob = (await gh(`repos/${EXAMPLE}/git/blobs/${e.sha}`)) as { content: string; encoding: string };
    files[e.path.slice(SUBDIR.length)] = Buffer.from(blob.content, "base64");
  }
  if (typeof files["aomi.toml"] !== "undefined") {
    files["aomi.toml"] = files["aomi.toml"]
      .toString()
      .replace(/^\s*name\s*=\s*".*"/m, `name = "${SLUG}"`)
      .replace(/^\s*platform\s*=\s*".*"/m, `platform = "playground"`)
      .replace(/^\s*git\s*=\s*".*"/m, `git = "https://github.com/${TARGET}"`);
  }
  return files;
}

const descriptor: PlatformDescriptor = {
  name: "playground",
  source_repo: TARGET,
  publish_branch: "publish",
  app_path_prefix: "apps",
  release_tag_convention: "apps-{app_slug}-{short_commit}",
  visibility: "public",
};

(async () => {
  const files = await bundle();
  console.log("bundled:", Object.keys(files).join(", "));
  const dc = new DeploymentClient({
    github: { repo: TARGET, branch: "publish", botPat: TOKEN },
    aomi: { backendUrl: "https://unused.invalid", platform: "playground", activationToken: "unused" },
    descriptor,
    onAudit: (e) => console.log("AUDIT", JSON.stringify(e)),
  });
  const res = await dc.deploy({ slug: SLUG, displayName: "Example Demo", files, serverTags: ["staging"], isPublic: true });
  console.log("DEPLOY:", JSON.stringify(res, null, 2));
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});

import "server-only";

import {
  DeploymentClient,
  type PlatformDescriptor,
  type SourceBundle,
} from "@aomi-labs/deploy";

// =============================================================================
// Portal-side deploy proxy (ADR 0011) — server-only.
// =============================================================================
//
// The settings UI is browser React and CANNOT import @aomi-labs/deploy (it
// holds the bot PAT + activation token and throws in a browser). So all
// privileged work happens here, behind the portal's own API route handlers.
// Secrets come from portal server env and never reach the client bundle.

// =============================================================================
// Config — hard-coded. There is exactly one playground target + one example +
// one ops channel, so none of this is worth an env knob. The ONLY things that
// stay in env are the two real secrets (see readDeployEnv): a credential in
// source would be a leak.
// =============================================================================

export const EXAMPLE_REPO = "aomi-labs/aomi-app-example";
export const EXAMPLE_SUBDIR = "app";
export const EXAMPLE_REPO_URL = `https://github.com/${EXAMPLE_REPO}`;

const TARGET_REPO = "aomi-labs/aomi-playground";
const PLATFORM = "playground";

// Ops role mention (a Discord role id — not a secret, safe in source).
const OPS_MENTION = "<@&1510790865520693348>";
// The webhook URL IS a credential and this repo is public, so it stays in env
// (optional). Unset → access requests are built but not auto-posted.
const DISCORD_WEBHOOK = process.env.APP_DEPLOY_DISCORD_WEBHOOK || undefined;

/** Reuse the portal's existing backend URL — NOT a new env var. */
function resolveBackendUrl(): string {
  return (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:8080"
  );
}

export interface DeployEnv {
  /** Optional GitHub read token — only needed for a PRIVATE platform repo. */
  botPat?: string;
  activationToken: string;
  targetRepo: string;
  platform: string;
  backendUrl: string;
  discordWebhook?: string;
  opsMention?: string;
}

/**
 * Resolve config. The portal targets the **public** playground repo, so it
 * needs exactly ONE secret:
 *  - `APP_DEPLOY_ACTIVATION_TOKEN` (required) — the platform bearer. `deploy`
 *    authenticates to the backend's server-side publish endpoint with it (the
 *    backend does the GitHub commit via its own stored bot PAT), and `activate`
 *    uses it for the activation call.
 *
 * `APP_DEPLOY_BOT_PAT` is now **optional** and read-only: GitHub reads (status
 * polling, the example-source fetch, the activate-time release fetch) are
 * unauthenticated on a public repo. Set it only if you point the portal at a
 * PRIVATE platform repo. The write credential is NOT here — it lives in the
 * backend (Phase 6).
 */
export function readDeployEnv(): DeployEnv {
  const activationToken = process.env.APP_DEPLOY_ACTIVATION_TOKEN;
  if (!activationToken) {
    throw new Error(
      "deploy proxy is not configured: set APP_DEPLOY_ACTIVATION_TOKEN (the platform " +
        "activation bearer; deploy + activate authenticate to the backend with it)",
    );
  }
  return {
    // Optional: only a PRIVATE platform repo needs a read token.
    botPat: process.env.APP_DEPLOY_BOT_PAT || undefined,
    activationToken,
    targetRepo: TARGET_REPO,
    platform: PLATFORM,
    backendUrl: resolveBackendUrl(),
    discordWebhook: DISCORD_WEBHOOK,
    opsMention: OPS_MENTION,
  };
}

/**
 * The platform descriptor for the target repo. Mirrors the SDK's internal
 * default (standard `apps/<slug>` + `apps-{app_slug}-{short_commit}`
 * convention), so the dry-run plan and the real deploy agree on slug/tag/paths.
 */
export function targetDescriptor(env: DeployEnv): PlatformDescriptor {
  return {
    name: env.platform,
    source_repo: env.targetRepo,
    publish_branch: "publish",
    app_path_prefix: "apps",
    release_tag_convention: "apps-{app_slug}-{short_commit}",
    visibility: "public",
  };
}

/** Construct a DeploymentClient from server env. */
export function getDeploymentClient(env: DeployEnv = readDeployEnv()): DeploymentClient {
  return new DeploymentClient({
    github: { repo: env.targetRepo, branch: "publish", botPat: env.botPat },
    aomi: { backendUrl: env.backendUrl, platform: env.platform, activationToken: env.activationToken },
    descriptor: targetDescriptor(env),
    discord: env.discordWebhook
      ? { webhookUrl: env.discordWebhook, opsMention: env.opsMention }
      : undefined,
    onAudit: (e) => {
      // Attribution: the proxy is the only place per-user deploy history exists.
      console.log("[deploy-proxy] audit", JSON.stringify(e));
    },
  });
}

/**
 * Slugify a user-typed app name into a valid app slug (lowercase, alphanumeric +
 * hyphen). Each visitor names their own app (e.g. "alice-app-123"); the result
 * is the app's identity in the platform repo. Returns "" for empty/invalid
 * input so the caller can reject it.
 */
export function appSlug(name: string | undefined | null): string {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

// ----- example source fetch --------------------------------------------------

interface GitTreeEntry {
  path: string;
  type: string;
  sha: string;
}

async function gh(path: string, token?: string): Promise<Response> {
  return fetch(`https://api.github.com/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "aomi-portal-deploy",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // The example repo is public + small; no caching needed for a demo.
    cache: "no-store",
  });
}

/**
 * Fetch the example app source (the `app/` subtree of aomi-app-example) and
 * return it as a SourceBundle keyed relative to the app root. Rewrites the
 * app's `aomi.toml` so its `name`/`platform`/`git` match this deploy's slug +
 * target — keeping the committed source consistent with the generated
 * deployment.json.
 */
export async function fetchExampleBundle(
  slug: string,
  env: DeployEnv,
): Promise<{ files: SourceBundle; displayName: string }> {
  const token = env.botPat;
  const treeRes = await gh(`repos/${EXAMPLE_REPO}/git/trees/HEAD?recursive=1`, token);
  if (!treeRes.ok) {
    throw new Error(`failed to read ${EXAMPLE_REPO} tree: ${treeRes.status}`);
  }
  const tree = (await treeRes.json()) as { tree: GitTreeEntry[] };
  const prefix = `${EXAMPLE_SUBDIR}/`;
  const blobs = tree.tree.filter((e) => e.type === "blob" && e.path.startsWith(prefix));
  if (blobs.length === 0) {
    throw new Error(`no files under ${prefix} in ${EXAMPLE_REPO}`);
  }

  const files: SourceBundle = {};
  for (const entry of blobs) {
    const rel = entry.path.slice(prefix.length);
    const blobRes = await gh(`repos/${EXAMPLE_REPO}/git/blobs/${entry.sha}`, token);
    if (!blobRes.ok) throw new Error(`failed to read blob ${entry.path}: ${blobRes.status}`);
    const blob = (await blobRes.json()) as { content: string; encoding: string };
    files[rel] = Buffer.from(blob.content, blob.encoding === "base64" ? "base64" : "utf8");
  }

  const displayName = `Aomi Example (${slug})`;

  // The plugin's identity comes from the crate name (Cargo.toml) +
  // `dyn_aomi_app!(name = ...)` in lib.rs — NOT the app slug. Without renaming
  // those, every scaffold ships a plugin called `hyperliquid`, which collides
  // with the real hyperliquid app (and across users) → the backend rejects
  // "duplicate plugin" at activate. Rename them to the slug so each deploy is a
  // distinct plugin.
  const origName = readTomlName(files["aomi.toml"]?.toString() ?? "") ?? "hyperliquid";

  if (typeof files["aomi.toml"] !== "undefined") {
    files["aomi.toml"] = rewriteAomiToml(
      files["aomi.toml"].toString(),
      slug,
      displayName,
      env.platform,
      `https://github.com/${env.targetRepo}`,
    );
  }
  if (typeof files["Cargo.toml"] !== "undefined") {
    files["Cargo.toml"] = files["Cargo.toml"].toString().replace(/^\s*name\s*=\s*".*"/m, `name = "${slug}"`);
  }
  if (typeof files["src/lib.rs"] !== "undefined") {
    // The only quoted occurrence of the original name in lib.rs is the
    // dyn_aomi_app! plugin name; the Rust type (HyperliquidApp) is unquoted.
    files["src/lib.rs"] = files["src/lib.rs"].toString().split(`"${origName}"`).join(`"${slug}"`);
  }
  // Renaming the crate makes the committed lock stale — drop it so CI
  // regenerates a matching lock at build time.
  delete files["Cargo.lock"];

  return { files, displayName };
}

function readTomlName(toml: string): string | undefined {
  return toml.match(/^\s*name\s*=\s*"([^"]+)"/m)?.[1];
}

function rewriteAomiToml(
  toml: string,
  slug: string,
  displayName: string,
  platform: string,
  git: string,
): string {
  return toml
    .replace(/^\s*name\s*=\s*".*"/m, `name = "${slug}"`)
    .replace(/^\s*display_name\s*=\s*".*"/m, `display_name = "${displayName}"`)
    .replace(/^\s*platform\s*=\s*".*"/m, `platform = "${platform}"`)
    .replace(/^\s*git\s*=\s*".*"/m, `git = "${git}"`);
}

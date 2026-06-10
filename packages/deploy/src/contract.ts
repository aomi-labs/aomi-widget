// =============================================================================
// Wire contracts — mirrors of the Aomi backend + `aomi-git` artifacts
// =============================================================================
//
// These types are NOT free to change. They are pinned to:
//   - backend `ActivateAppReq`      (bin/backend/src/endpoint/admin_scope/activations.rs)
//   - `aomi-git` `deployment.json`  (sdk/bin/git/deployment_state.rs, ADR 0004/0009)
//   - publish CI validator          (.github/scripts/publish_app.py)
//
// NOTE: the backend activation layer was rewritten (HostedPlatform). The old
// `handler/activation.rs` + `ActivateAppRequest` were deleted; the request is
// now `ActivateAppReq` in the `admin_scope::activations` endpoint module. The
// wire field names + aliases below are unchanged (`app_slug`→`name`,
// `display_name`→`label`, `target_tags`), so this contract still holds.
//
// `test/contract-drift.test.ts` fixture-diffs the generated deployment.json
// against real `aomi-git deploy` output to catch drift.

/**
 * Body of `POST /api/admin/apps/activate`. Field names follow the backend
 * struct: `name` accepts aliases `app_slug` / `slug` / `application`; `label`
 * accepts alias `display_name`. `app_release_tag` is required. `source_repo`
 * is optional at the backend because existing platforms infer it from
 * `platforms.github_repo`; this client still sends the descriptor repo for
 * explicit provenance and private-release fetches.
 */
export interface ActivateAppRequest {
  /** App slug. Sent as `app_slug` (a backend-accepted alias of `name`). */
  app_slug: string;
  platform: string;
  source_repo?: string;
  app_release_tag: string;
  /** Provenance commit (12–40 lowercase hex). */
  source_commit: string;
  is_public: boolean;
  /** Narrow-only: must be a subset of the build's declared `server_tags`. */
  target_tags: string[];
  /** Transient one-shot read PAT — backend uses it to fetch the private release, never persists it. */
  github_token?: string;
  /** Optional display name (backend alias `display_name`). */
  display_name?: string;
}

// ----- deployment.json (the `.aomi/deployment.json` build contract) ----------

export interface DeploymentApp {
  name: string;
  display_name: string;
  platform: string;
  /** GitHub URL of the platform publish repo. */
  git: string;
  public: boolean;
  /** Required server tags for activation/load targeting. */
  server_tags: string[];
}

export interface DeploymentSource {
  /** Provenance commit (12–40 lowercase hex). CI enforces the format. */
  commit: string;
  /** Optional git tree id (provenance only). */
  tree?: string;
  /** Optional content digest (provenance only). */
  digest?: string;
}

export interface DeploymentPlatform {
  /** Must equal the platform descriptor `name` (e.g. "krexa"). */
  name: string;
  /** Must normalize to the descriptor `source_repo`. */
  github_repo: string;
  resolved_deploy_branch?: string | null;
}

export interface DeploymentTarget {
  /** `<app_path_prefix>/<slug>`, e.g. "apps/<slug>". */
  app_path: string;
  /** `apps-<slug>-<commit[:12]>`. */
  release_tag: string;
  server_tags: string[];
}

/** A staged file as recorded in `deployment.json` `files[]`. */
export interface StagedFile {
  /** Path relative to the app dir (`apps/<slug>/`), posix-style. */
  path: string;
  /** `sha256:<64 lowercase hex>` of the file bytes. */
  sha256: string;
  bytes: number;
}

export interface DeploymentStateFlags {
  pushed: boolean;
  deployed: boolean;
  activated: boolean;
}

/**
 * The `.aomi/deployment.json` artifact. We emit the fields CI reads plus the
 * descriptor echoes `aomi-git` writes; CLI-only `stages`/`errors` are omitted
 * (they are `#[serde(default)]` and purely preflight UI).
 */
export interface DeploymentManifest {
  app: DeploymentApp;
  source: DeploymentSource;
  platform: DeploymentPlatform;
  target: DeploymentTarget;
  state: DeploymentStateFlags;
  files: StagedFile[];
  /** Unix timestamp (seconds). */
  updated_at: number;
}

/**
 * Platform descriptor (`platform.json` at the publish-repo root). The deploy
 * client only needs these fields to build a contract-valid manifest.
 */
export interface PlatformDescriptor {
  name: string;
  source_repo: string;
  publish_branch: string;
  app_path_prefix: string;
  release_tag_convention: string;
  visibility?: string;
}

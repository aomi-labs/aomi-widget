import { DeployError } from "./errors";
import { DEPLOYMENT_DIR, DEPLOYMENT_FILE, toBytes } from "./deployment-json";
import type { DeploymentManifest, StagedFile } from "./contract";
import type { CiStatus, ReleaseStatus, SourceBundle, StatusResult } from "./types";

// =============================================================================
// GitHub Git Data API — commit a tree to the publish branch (no git binary)
// =============================================================================
//
// Narrow structural interface over the subset of `@octokit/rest` we use, so the
// committer is unit-testable with a fake (and decoupled from Octokit's overload
// types). A real Octokit instance satisfies this shape.

export interface GitHubRestClient {
  git: {
    getRef(p: { owner: string; repo: string; ref: string }): Promise<{ data: { object: { sha: string } } }>;
    getCommit(p: { owner: string; repo: string; commit_sha: string }): Promise<{ data: { tree: { sha: string } } }>;
    createBlob(p: { owner: string; repo: string; content: string; encoding: string }): Promise<{ data: { sha: string } }>;
    createTree(p: {
      owner: string;
      repo: string;
      base_tree?: string;
      tree: Array<{ path: string; mode: string; type: string; sha: string }>;
    }): Promise<{ data: { sha: string } }>;
    createCommit(p: {
      owner: string;
      repo: string;
      message: string;
      tree: string;
      parents: string[];
    }): Promise<{ data: { sha: string } }>;
    updateRef(p: { owner: string; repo: string; ref: string; sha: string; force?: boolean }): Promise<unknown>;
  };
  repos: {
    listReleases(p: { owner: string; repo: string; per_page?: number }): Promise<{
      data: Array<{ tag_name: string; draft: boolean; assets: Array<unknown> }>;
    }>;
  };
  actions: {
    listWorkflowRunsForRepo(p: { owner: string; repo: string; branch?: string; per_page?: number }): Promise<{
      data: { workflow_runs: Array<{ status: string | null; conclusion: string | null }> };
    }>;
  };
}

/** Regular file mode for tree entries. */
const BLOB_MODE = "100644";

function splitRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new DeployError("GITHUB_COMMIT", `github repo must be "owner/repo", got ${JSON.stringify(repo)}`);
  }
  return { owner, repo: name };
}

export class GitHubCommitter {
  private readonly api: GitHubRestClient;
  private readonly owner: string;
  private readonly repo: string;
  private readonly branch: string;

  constructor(api: GitHubRestClient, repo: string, branch: string) {
    this.api = api;
    const parts = splitRepo(repo);
    this.owner = parts.owner;
    this.repo = parts.repo;
    this.branch = branch;
  }

  /**
   * Commit the app source + generated manifest under `apps/<slug>/` to the
   * publish branch in a single commit. Returns the new commit SHA.
   */
  async commitApp(args: {
    slug: string;
    files: SourceBundle;
    staged: StagedFile[];
    manifest: DeploymentManifest;
    message: string;
  }): Promise<string> {
    const { owner, repo, branch } = this;
    const appPath = args.manifest.target.app_path; // apps/<slug>

    try {
      const ref = await this.api.git.getRef({ owner, repo, ref: `heads/${branch}` });
      const baseCommitSha = ref.data.object.sha;
      const baseCommit = await this.api.git.getCommit({ owner, repo, commit_sha: baseCommitSha });
      const baseTreeSha = baseCommit.data.tree.sha;

      // Build tree entries: every staged source file + the generated manifest.
      const tree: Array<{ path: string; mode: string; type: string; sha: string }> = [];

      for (const file of args.staged) {
        const content = args.files[file.path] ?? findOriginalKey(args.files, file.path);
        if (content === undefined) {
          throw new DeployError("GITHUB_COMMIT", `staged file missing from bundle: ${file.path}`);
        }
        const blob = await this.api.git.createBlob({
          owner,
          repo,
          content: Buffer.from(toBytes(content)).toString("base64"),
          encoding: "base64",
        });
        tree.push({ path: `${appPath}/${file.path}`, mode: BLOB_MODE, type: "blob", sha: blob.data.sha });
      }

      const manifestJson = JSON.stringify(args.manifest, null, 2) + "\n";
      const manifestBlob = await this.api.git.createBlob({
        owner,
        repo,
        content: Buffer.from(manifestJson, "utf8").toString("base64"),
        encoding: "base64",
      });
      tree.push({
        path: `${appPath}/${DEPLOYMENT_DIR}/${DEPLOYMENT_FILE}`,
        mode: BLOB_MODE,
        type: "blob",
        sha: manifestBlob.data.sha,
      });

      const newTree = await this.api.git.createTree({ owner, repo, base_tree: baseTreeSha, tree });
      const commit = await this.api.git.createCommit({
        owner,
        repo,
        message: args.message,
        tree: newTree.data.sha,
        parents: [baseCommitSha],
      });
      await this.api.git.updateRef({ owner, repo, ref: `heads/${branch}`, sha: commit.data.sha });

      return commit.data.sha;
    } catch (err) {
      if (err instanceof DeployError) throw err;
      throw new DeployError("GITHUB_COMMIT", `failed to commit app \`${args.slug}\` to ${branch}: ${errMsg(err)}`, err);
    }
  }

  /** CI + release readiness for a slug's latest matching release tag. */
  async status(slug: string, tagPrefix: string): Promise<StatusResult> {
    const { owner, repo, branch } = this;

    let release: ReleaseStatus = "absent";
    let releaseTag: string | null = null;
    try {
      const releases = await this.api.repos.listReleases({ owner, repo, per_page: 100 });
      const match = releases.data
        .filter((r) => !r.draft && r.tag_name.startsWith(`${tagPrefix}-${slug}-`))
        .at(0);
      if (match) {
        releaseTag = match.tag_name;
        release = match.assets.length > 0 ? "ready" : "building";
      }
    } catch (err) {
      throw new DeployError("GITHUB_COMMIT", `failed to read releases for \`${slug}\`: ${errMsg(err)}`, err);
    }

    let ci: CiStatus = "unknown";
    try {
      const runs = await this.api.actions.listWorkflowRunsForRepo({ owner, repo, branch, per_page: 1 });
      const run = runs.data.workflow_runs.at(0);
      if (run) ci = mapCiStatus(run.status, run.conclusion);
    } catch {
      ci = "unknown";
    }

    return { ci, release, releaseTag };
  }
}

/** Fallback lookup when bundle keys were not yet normalized to posix. */
function findOriginalKey(files: SourceBundle, posixPath: string): string | Uint8Array | undefined {
  for (const [k, v] of Object.entries(files)) {
    if (k.replace(/\\/g, "/").replace(/^\.\//, "") === posixPath) return v;
  }
  return undefined;
}

function mapCiStatus(status: string | null, conclusion: string | null): CiStatus {
  if (status === "completed") {
    return conclusion === "success" ? "success" : "failure";
  }
  if (status === "queued" || status === "pending" || status === "waiting") return "pending";
  if (status === "in_progress") return "running";
  return "unknown";
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

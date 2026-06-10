import { DeployError } from "./errors";
import type { CiStatus, ReleaseStatus, StatusResult } from "./types";

// =============================================================================
// GitHub read-only status — CI + release readiness for a published app.
// =============================================================================
//
// The commit/push moved server-side (the backend commits via the platform's bot
// PAT — Phase 6). This client no longer writes to GitHub; it only *reads* CI +
// release state to report deploy progress. Narrow structural interface over the
// `@octokit/rest` subset we use, so the reader is unit-testable with a fake.

export interface GitHubRestClient {
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

function splitRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split("/");
  if (!owner || !name) {
    throw new DeployError("GITHUB_COMMIT", `github repo must be "owner/repo", got ${JSON.stringify(repo)}`);
  }
  return { owner, repo: name };
}

/** Reads CI + release readiness for a slug's latest matching release tag. */
export class GitHubStatusReader {
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

import { ErrorBoundary } from "@build/components/shell/error-boundary";
import { ProjectIndex } from "@build/features/launch/components/deployments/project-index";
import type { RepositoryConnectionResult } from "@build/features/launch/components/deployments/repository-connector";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    platform?: string | string[];
    launch?: string | string[];
    repo?: string | string[];
    github_error?: string | string[];
  }>;
}) {
  const {
    platform: rawPlatform,
    launch: rawLaunch,
    repo: rawRepo,
    github_error: rawGithubError,
  } = await searchParams;
  const platform = typeof rawPlatform === "string" ? rawPlatform.trim() : "";
  const launch = typeof rawLaunch === "string" ? rawLaunch : "";
  const repo = typeof rawRepo === "string" ? rawRepo : undefined;
  const githubError =
    typeof rawGithubError === "string" ? rawGithubError : undefined;
  let connectionResult: RepositoryConnectionResult | undefined;
  if (githubError) {
    connectionResult = { status: "error", message: githubError };
  } else if (launch === "bound") {
    connectionResult = { status: "success", repo };
  } else if (launch) {
    connectionResult = {
      status: "error",
      message: "GitHub installation was not completed. Try connecting again.",
    };
  }
  return (
    <ErrorBoundary>
      <ProjectIndex
        platform={platform || undefined}
        connectionResult={connectionResult}
      />
    </ErrorBoundary>
  );
}

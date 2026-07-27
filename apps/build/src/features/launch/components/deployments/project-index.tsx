"use client";

import { EmptyState } from "@build/components/control-plane/empty-state";
import { useProjects } from "@build/features/launch/hooks/use-projects";
import { BUILD_GLOSSARY } from "@build/lib/glossary";
import { ProjectRow } from "./project-row";
import { SdkBadge } from "./ui/sdk-badge";
import { LoadingPanel, ErrorPanel, GitHubSignInPanel } from "./ui/state-panels";

export function ProjectIndex() {
  const { state, reload } = useProjects();
  const requiredSdk =
    state.status === "ready" || state.status === "signed_out"
      ? state.sdk?.sdkStatus.requiredVersion
      : null;
  const githubError =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("github_error")
      : null;

  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-normal tracking-tight">
              Projects
            </h1>
            <p className="text-dim mt-1 text-sm">
              {BUILD_GLOSSARY.project.meaning} Each project can contain apps,
              deployments, and an environment for keys.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={reload}
              className="border-border bg-surface-1 hover:bg-accent-hover inline-flex h-8 items-center justify-center rounded-md border px-3 text-sm font-medium"
            >
              Refresh
            </button>
            <a
              href="/operate/deployments/new"
              className="bg-primary text-primary-foreground inline-flex h-8 items-center justify-center rounded-md px-3 text-sm font-medium hover:opacity-90"
            >
              New app
            </a>
          </div>
        </div>

        {requiredSdk && (
          <div className="border-border bg-surface-1 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <span className="text-dim">Backend requires aomi-sdk</span>
            <SdkBadge stamped={requiredSdk} required={requiredSdk} />
          </div>
        )}

        <div className="border-border bg-surface-1 overflow-hidden rounded-lg border">
          <div className="border-border flex h-12 items-center justify-between border-b px-4">
            <div className="text-sm font-medium">Projects</div>
            <div className="text-dim text-xs">
              {state.status === "ready" ? state.sources.length : 0}
            </div>
          </div>
          {state.status === "loading" && (
            <LoadingPanel label="Loading projects…" />
          )}
          {state.status === "error" && <ErrorPanel message={state.error} />}
          {state.status === "signed_out" && (
            <GitHubSignInPanel error={githubError} />
          )}
          {state.status === "ready" && state.sources.length === 0 && (
            <EmptyState
              title="No projects yet"
              description="Import a GitHub repository to deploy your first app."
              actionHref="/operate/deployments/new"
              actionLabel="New app"
            />
          )}
          {state.status === "ready" &&
            state.sources.map((source) => (
              <ProjectRow
                key={source.id}
                source={source}
                requiredSdk={requiredSdk}
                href={`/projects/${source.id}`}
              />
            ))}
        </div>
      </div>
    </main>
  );
}

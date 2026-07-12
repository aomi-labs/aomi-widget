"use client";

import { useProjects } from "@build/features/launch/hooks/use-projects";
import { ProjectRow } from "./project-row";
import { SdkBadge } from "./ui/sdk-badge";
import {
  LoadingPanel,
  ErrorPanel,
  EmptyPanel,
  GitHubSignInPanel,
} from "./ui/state-panels";

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
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal">
              Projects
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              GitHub repositories connected as Aomi apps.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={reload}
              className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
            >
              Refresh
            </button>
            <a
              href="/operate/deployments/new"
              className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              New app
            </a>
          </div>
        </div>

        {requiredSdk && (
          <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm">
            <span className="text-zinc-500">Backend requires aomi-sdk</span>
            <SdkBadge stamped={requiredSdk} required={requiredSdk} />
          </div>
        )}

        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-4">
            <div className="text-sm font-medium">Projects</div>
            <div className="text-xs text-zinc-500">
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
            <EmptyPanel>
              <div className="flex flex-col items-center gap-3">
                <p>
                  No projects yet. Import a GitHub repository to deploy your
                  first app.
                </p>
                <a
                  href="/operate/deployments/new"
                  className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  New app
                </a>
              </div>
            </EmptyPanel>
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

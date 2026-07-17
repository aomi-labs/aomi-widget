"use client";

import Link from "next/link";
import { useProjects } from "@portal/features/launch/hooks/use-projects";
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
              Deployments
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Your connected projects and their latest deployments.
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
            <Link
              href="/deployments/new"
              className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              New app
            </Link>
          </div>
        </div>

        {requiredSdk && (
          <div className="aomi-card flex items-center gap-2 px-3 py-2 text-sm">
            <span className="text-zinc-500">Backend requires aomi-sdk</span>
            <SdkBadge stamped={requiredSdk} required={requiredSdk} />
          </div>
        )}

        <div className="aomi-card overflow-hidden bg-white">
          <div className="border-border/60 flex h-12 items-center justify-between border-b px-4">
            <div className="aomi-eyebrow">Projects</div>
            <div className="aomi-numeric text-xs text-zinc-500">
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
            <EmptyPanel>No projects yet.</EmptyPanel>
          )}
          {state.status === "ready" &&
            state.sources.map((source) => (
              <ProjectRow
                key={source.id}
                source={source}
                requiredSdk={requiredSdk}
              />
            ))}
        </div>
      </div>
    </main>
  );
}

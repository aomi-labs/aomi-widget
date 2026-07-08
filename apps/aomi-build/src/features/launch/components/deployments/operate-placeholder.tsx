"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useProjects } from "../../hooks/use-projects";
import {
  ErrorPanel,
  GitHubSignInPanel,
  LoadingPanel,
} from "./ui/state-panels";

export function OperatePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedProject = searchParams.get("project") ?? "all";
  const { state } = useProjects();

  if (state.status === "loading") return <LoadingPanel label="Loading projects…" />;
  if (state.status === "signed_out") return <GitHubSignInPanel error={null} />;
  if (state.status === "error") return <ErrorPanel message={state.error} />;

  const selectedSource =
    selectedProject === "all"
      ? null
      : state.sources.find((source) => String(source.id) === selectedProject);

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">{title}</h1>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
          <select
            value={selectedProject}
            onChange={(event) => {
              const value = event.target.value;
              router.push(
                value === "all"
                  ? `/operate/${title.toLowerCase()}`
                  : `/operate/${title.toLowerCase()}?project=${value}`,
              );
            }}
            className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm"
          >
            <option value="all">All projects</option>
            {state.sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.repositoryLink ?? `Project ${source.id}`}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500">
          {selectedSource
            ? `No backend-backed ${title.toLowerCase()} data source is wired for ${selectedSource.repositoryLink ?? `project ${selectedSource.id}`} yet.`
            : `No backend-backed global ${title.toLowerCase()} data source is wired here yet.`}
        </div>
      </div>
    </main>
  );
}

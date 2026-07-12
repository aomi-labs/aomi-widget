"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, RefreshCw } from "lucide-react";
import { useGlobalDeploymentRecords } from "./use-global-deployment-records";
import {
  EmptyPanel,
  ErrorPanel,
  GitHubSignInPanel,
  LoadingPanel,
} from "./ui/state-panels";

function formatDate(seconds: number) {
  return new Date(seconds * 1000).toLocaleString();
}

export function GlobalDeploymentsList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { projectsState, recordsState, sources, reload } =
    useGlobalDeploymentRecords();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "current" | "previous">("all");
  const projectParam = searchParams.get("project");
  const selectedDeploymentId = searchParams.get("deployment");
  const [sourceFilter, setSourceFilter] = useState(projectParam ?? "all");

  useEffect(() => {
    setSourceFilter(projectParam ?? "all");
  }, [projectParam]);

  const deployments = useMemo(
    () =>
      recordsState.status === "ready" || recordsState.status === "error"
        ? recordsState.deployments
        : [],
    [recordsState],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deployments.filter((deployment) => {
      if (
        sourceFilter !== "all" &&
        String(deployment.sourceId) !== sourceFilter
      ) {
        return false;
      }
      if (status === "current" && !deployment.current) return false;
      if (status === "previous" && deployment.current) return false;
      if (!q) return true;
      return [
        deployment.deploymentId,
        deployment.commit,
        deployment.repositoryLink,
        ...deployment.apps,
        ...deployment.releaseTags,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [deployments, query, sourceFilter, status]);

  const selectedDeployment = useMemo(
    () =>
      selectedDeploymentId
        ? deployments.find(
            (deployment) =>
              deployment.deploymentId === selectedDeploymentId &&
              (projectParam == null ||
                String(deployment.sourceId) === projectParam),
          )
        : null,
    [deployments, projectParam, selectedDeploymentId],
  );

  if (projectsState.status === "loading") {
    return <LoadingPanel label="Loading projects…" />;
  }
  if (projectsState.status === "signed_out") {
    return <GitHubSignInPanel error={null} />;
  }
  if (projectsState.status === "error") {
    return <ErrorPanel message={projectsState.error} />;
  }

  return (
    <main className="min-h-screen bg-white text-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-normal">
              Deployments
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Deployment history across all projects.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={reload}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
            >
              <RefreshCw className="size-3.5" aria-hidden />
              Refresh
            </button>
            <Link
              href="/operate/deployments/new"
              className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
            >
              New app
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 px-4 py-3">
            <Filter className="size-4 text-zinc-400" aria-hidden />
            <select
              value={sourceFilter}
              onChange={(event) => {
                const value = event.target.value;
                setSourceFilter(value);
                if (value !== "all") {
                  router.push(`/operate/deployments?project=${value}`);
                } else {
                  router.push("/operate/deployments");
                }
              }}
              className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm"
            >
              <option value="all">All projects</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.repositoryLink ?? `Project ${source.id}`}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as "all" | "current" | "previous")
              }
              className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="current">Current</option>
              <option value="previous">Previous</option>
            </select>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search deployment, app, commit, release tag"
              className="h-8 min-w-[260px] flex-1 rounded-md border border-zinc-300 px-2 text-sm"
            />
          </div>

          {selectedDeployment ? (
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                    Selected deployment
                  </div>
                  <div className="mt-1 truncate font-mono text-sm font-medium">
                    {selectedDeployment.deploymentId}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span>
                      {selectedDeployment.repositoryLink ?? "Unknown project"}
                    </span>
                    <span>
                      {selectedDeployment.apps.join(", ") || "no apps"}
                    </span>
                    <span>{selectedDeployment.current ? "Current" : "Previous"}</span>
                    <span>{formatDate(selectedDeployment.createdAt)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/projects/${selectedDeployment.sourceId}`}
                    className="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium hover:bg-zinc-50"
                  >
                    Open project
                  </Link>
                  <Link
                    href={
                      projectParam
                        ? `/operate/deployments?project=${projectParam}`
                        : "/operate/deployments"
                    }
                    className="inline-flex h-8 items-center rounded-md border border-zinc-300 bg-white px-3 text-xs font-medium hover:bg-zinc-50"
                  >
                    Clear selection
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {recordsState.status === "loading" || recordsState.status === "idle" ? (
            <LoadingPanel label="Loading deployments…" />
          ) : recordsState.status === "error" ? (
            <ErrorPanel message={recordsState.error} />
          ) : filtered.length === 0 ? (
            <EmptyPanel>
              {deployments.length === 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <p>
                    No deployments yet. Deploy an app from a connected project
                    to see history here.
                  </p>
                  <Link
                    href="/operate/deployments/new"
                    className="inline-flex h-8 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    New app
                  </Link>
                </div>
              ) : (
                <p>
                  No deployments match the current filters. Clear filters or
                  pick another project.
                </p>
              )}
            </EmptyPanel>
          ) : (
            <div className="divide-y divide-zinc-100">
              {filtered.map((deployment) => (
                <Link
                  key={`${deployment.sourceId}-${deployment.deploymentId}`}
                  href={`/operate/deployments?project=${deployment.sourceId}&deployment=${encodeURIComponent(deployment.deploymentId)}`}
                  className="grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 hover:bg-zinc-50"
                >
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="truncate text-sm font-medium">
                        {deployment.deploymentId}
                      </div>
                      {deployment.current && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      <span>{deployment.repositoryLink ?? "Unknown project"}</span>
                      <span>{deployment.apps.join(", ") || "no apps"}</span>
                      <span className="font-mono">
                        {deployment.commit ?? "unknown commit"}
                      </span>
                      <span>{formatDate(deployment.createdAt)}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-zinc-500">
                    View deployment
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

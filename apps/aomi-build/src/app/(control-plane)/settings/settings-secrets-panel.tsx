"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { useProjects } from "@build/features/launch/hooks/use-projects";
import {
  ErrorPanel,
  GitHubSignInPanel,
  LoadingPanel,
} from "@build/features/launch/components/deployments/ui/state-panels";

function environmentHref(sourceId: number) {
  return `/projects/${sourceId}?tab=environment`;
}

function projectLabel(source: {
  id: number;
  repositoryLink?: string | null;
}) {
  return source.repositoryLink?.trim() || `Project ${source.id}`;
}

export function SettingsSecretsPanel() {
  const { state } = useProjects();

  if (state.status === "loading") {
    return <LoadingPanel label="Loading projects…" />;
  }

  if (state.status === "signed_out") {
    return <GitHubSignInPanel error={null} />;
  }

  if (state.status === "error") {
    return <ErrorPanel message={state.error} />;
  }

  if (state.sources.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="text-sm font-medium text-foreground">
          No projects yet
        </div>
        <p className="mt-2 text-[13px] text-dim">
          Create an app first, then set secrets on its Environment tab.
        </p>
        <Link
          href="/operate/deployments/new"
          className="mt-4 inline-flex h-8 items-center rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground transition hover:bg-brand-hover"
        >
          New app
        </Link>
      </div>
    );
  }

  if (state.sources.length === 1) {
    const only = state.sources[0]!;
    const label = projectLabel(only);

    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <div className="text-sm font-medium text-foreground">
            Per-project secrets
          </div>
          <p className="mt-2 text-[13px] text-dim">
            Edit environment values for{" "}
            <span className="text-foreground font-medium">{label}</span> on
            the project Environment tab.
          </p>
          <Link
            href={environmentHref(only.id)}
            className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground transition hover:bg-brand-hover"
          >
            Open Environment
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <div className="text-sm font-medium text-foreground">
          Per-project secrets
        </div>
        <p className="mt-2 text-[13px] text-dim">
          Choose a project to open its Environment tab.
        </p>
      </div>

      <ul className="divide-border overflow-hidden rounded-lg border border-border bg-surface-1 divide-y">
        {state.sources.map((source) => (
          <li key={source.id}>
            <Link
              href={environmentHref(source.id)}
              className="hover:bg-accent-hover flex items-center justify-between gap-3 px-4 py-3 transition"
            >
              <div className="min-w-0">
                <div className="text-foreground truncate text-sm font-medium">
                  {projectLabel(source)}
                </div>
                <div className="text-dim mt-0.5 text-xs">Environment</div>
              </div>
              <ArrowRight className="text-dim size-4 shrink-0" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
